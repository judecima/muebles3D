import { GrainDirection, OptimizationResult, OptimizedPanel, OptimizedPart } from '../../lib/types';

interface InternalPart {
  name: string;
  width: number;
  height: number;
  grainDirection: GrainDirection;
  thickness: number;
  originalIndex: number;
  placed: boolean;
}

interface FreeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * JADSI Industrial Engine v24.0 - Sequential Panel Architect
 * 
 * Este motor optimiza cada panel de forma independiente y secuencial.
 * Prioriza llenar el primer panel con la máxima eficiencia (>94%) usando las mejores piezas disponibles.
 * Cada panel puede elegir su propio eje de guillotina (Vertical vs Horizontal).
 */
export function runOptimization(
  parts: { name: string; width: number; height: number; quantity: number; grainDirection: GrainDirection; thickness: number }[],
  panelWidth: number,
  panelHeight: number,
  selectedThickness: number,
  hasGrain: boolean,
  kerf: number = 4.5,
  trim: number = 10
): OptimizationResult {
  const filteredParts = parts.filter(p => p.thickness === selectedThickness);
  
  if (filteredParts.length === 0) {
    return { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Sin piezas", kerf, trim, selectedThickness };
  }

  const usableW = Math.max(0, panelWidth - (trim * 2));
  const usableH = Math.max(0, panelHeight - (trim * 2));
  const partColors = generateColors(filteredParts);

  // Pool global de piezas a colocar
  let pool: InternalPart[] = filteredParts.flatMap((p, idx) => 
    Array.from({ length: p.quantity }, () => ({
      ...p,
      originalIndex: idx,
      placed: false
    }))
  );

  const finalPanels: OptimizedPanel[] = [];
  let panelCounter = 1;

  // Optimización secuencial: Panel por Panel
  while (pool.some(p => !p.placed)) {
    let bestPanelForThisStep: OptimizedPanel | null = null;
    let bestPanelScore = -Infinity;
    let bestStrategyUsed: 'vertical' | 'horizontal' = 'horizontal';

    // Para cada panel, realizamos una búsqueda exhaustiva (Monte Carlo localizado)
    const iterationsPerPanel = 1000; 
    
    for (let iter = 0; iter < iterationsPerPanel; iter++) {
      // Clonamos solo las piezas no colocadas para este intento de panel
      const currentTryPool = pool.filter(p => !p.placed).map(p => ({ ...p }));
      
      // Aplicamos diferentes heurísticas de ordenamiento por iteración
      if (iter > 0) {
        if (iter % 5 === 0) clusterShuffle(currentTryPool);
        else shuffle(currentTryPool);
      } else {
        // Primera iteración: Ordenamiento técnico ideal (Área Descendente)
        currentTryPool.sort((a, b) => (b.width * b.height) - (a.width * a.height));
      }

      // Probamos ambas estrategias de guillotina para este panel
      const strategies: ('vertical' | 'horizontal')[] = ['vertical', 'horizontal'];
      
      for (const strategy of strategies) {
        const attempt = fillSinglePanel(
          currentTryPool, 
          usableW, 
          usableH, 
          kerf, 
          trim, 
          panelWidth, 
          panelHeight, 
          partColors, 
          strategy, 
          hasGrain,
          panelCounter
        );

        const score = evaluatePanelQuality(attempt);
        
        if (score > bestPanelScore) {
          bestPanelScore = score;
          bestPanelForThisStep = attempt;
          bestStrategyUsed = strategy;
        }
      }
    }

    if (bestPanelForThisStep && bestPanelForThisStep.parts.length > 0) {
      // Marcamos como colocadas las piezas que ganaron en el mejor layout de este panel
      const placedNames = bestPanelForThisStep.parts.filter(p => !p.isLeftover).map(p => p.name);
      
      // IMPORTANTE: Debemos marcar piezas específicas del pool, no solo por nombre
      // Para simplificar, recorremos las piezas colocadas del layout y buscamos su equivalente en el pool
      bestPanelForThisStep.parts.forEach(placedPart => {
        if (placedPart.isLeftover) return;
        const indexInPool = pool.findIndex(p => 
          !p.placed && 
          p.name === placedPart.name && 
          ((placedPart.rotated ? p.height : p.width) === placedPart.width) &&
          ((placedPart.rotated ? p.width : p.height) === placedPart.height)
        );
        if (indexInPool !== -1) {
          pool[indexInPool].placed = true;
        }
      });

      finalPanels.push(bestPanelForThisStep);
      panelCounter++;
    } else {
      // Evitar bucle infinito si ninguna pieza cabe
      break;
    }
  }

  const totalUsedArea = finalPanels.reduce((acc, p) => acc + p.usedArea, 0);
  const totalAvailArea = finalPanels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: finalPanels,
    totalPanels: finalPanels.length,
    totalEfficiency: (totalUsedArea / totalAvailArea) * 100,
    summary: `Optimización JADSI v24.0: ${finalPanels.length} paneles procesados independientemente.`,
    kerf,
    trim,
    selectedThickness
  };
}

/**
 * Intenta llenar UN solo panel con la mejor combinación posible de piezas restantes.
 */
function fillSinglePanel(
  pool: InternalPart[], 
  algoW: number, 
  algoH: number, 
  kerf: number, 
  trim: number, 
  panelWidth: number,
  panelHeight: number,
  colors: Record<string, string>,
  strategy: 'vertical' | 'horizontal',
  hasGrain: boolean,
  panelNumber: number
): OptimizedPanel {
  const placedParts: OptimizedPart[] = [];
  const freeRects: FreeRect[] = [{ x: trim, y: trim, width: algoW, height: algoH }];

  for (let i = 0; i < pool.length; i++) {
    const part = pool[i];
    if (part.placed) continue;

    let bestRectIdx = -1;
    let maxCP = -1;
    let minResidue = Infinity;
    let rotated = false;

    for (let j = 0; j < freeRects.length; j++) {
      const r = freeRects[j];
      
      // Evaluar Normal
      if (part.width <= r.width && part.height <= r.height) {
        const cp = calculateContactScore(r.x, r.y, part.width, part.height, panelWidth, panelHeight, trim, r);
        const residue = (r.width * r.height) - (part.width * part.height);
        if (cp > maxCP || (cp === maxCP && residue < minResidue)) {
          maxCP = cp; minResidue = residue; bestRectIdx = j; rotated = false;
        }
      }

      // Evaluar Rotado
      const canRotate = !hasGrain || part.grainDirection === 'libre';
      if (canRotate && part.height <= r.width && part.width <= r.height) {
        const cp = calculateContactScore(r.x, r.y, part.height, part.width, panelWidth, panelHeight, trim, r);
        const residue = (r.width * r.height) - (part.height * part.width);
        if (cp > maxCP || (cp === maxCP && residue < minResidue)) {
          maxCP = cp; minResidue = residue; bestRectIdx = j; rotated = true;
        }
      }
    }

    if (bestRectIdx !== -1) {
      const r = freeRects[bestRectIdx];
      const w = rotated ? part.height : part.width;
      const h = rotated ? part.width : part.height;

      placedParts.push({
        name: part.name,
        x: r.x, y: r.y, width: w, height: h,
        rotated,
        color: colors[part.name]
      });

      part.placed = true;
      splitGuillotine(freeRects, bestRectIdx, w, h, kerf, strategy);
      
      // Afinidad de clúster: Intentar meter hermanos inmediatamente en los nuevos huecos
      fillRemainingWithBrothers(pool, freeRects, kerf, strategy, hasGrain, colors, placedParts, panelWidth, panelHeight, trim);
    }
  }

  const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
  const leftovers = freeRects
    .filter(r => r.width >= 60 && r.height >= 60)
    .map((r, idx) => ({
      name: `S${idx + 1}`,
      x: r.x, y: r.y, width: r.width, height: r.height,
      rotated: false,
      isLeftover: true
    }));

  return {
    panelNumber,
    parts: placedParts,
    efficiency: (usedArea / (panelWidth * panelHeight)) * 100,
    usedArea,
    totalArea: panelWidth * panelHeight,
    leftovers
  };
}

function calculateContactScore(x: number, y: number, w: number, h: number, pW: number, pH: number, trim: number, r: FreeRect): number {
  let score = 0;
  if (Math.abs(x - trim) < 0.5) score += h;
  if (Math.abs(y - trim) < 0.5) score += w;
  if (Math.abs(x + w - (pW - trim)) < 0.5) score += h;
  if (Math.abs(y + h - (pH - trim)) < 0.5) score += w;
  
  // Bonus por alineación perfecta con el rectángulo libre (mantiene guillotina limpia)
  if (Math.abs(w - r.width) < 0.5) score += h * 3;
  if (Math.abs(h - r.height) < 0.5) score += w * 3;
  
  return score;
}

function fillRemainingWithBrothers(
  pool: InternalPart[], 
  freeRects: FreeRect[], 
  kerf: number, 
  strategy: 'vertical' | 'horizontal',
  hasGrain: boolean,
  colors: Record<string, string>,
  placedParts: OptimizedPart[],
  pW: number, pH: number, trim: number
) {
  if (placedParts.length === 0) return;
  const last = placedParts[placedParts.length - 1];

  for (let i = 0; i < pool.length; i++) {
    const part = pool[i];
    if (part.placed) continue;

    let bestRectIdx = -1;
    let currentRotated = false;

    // Prioridad absoluta: Hermano idéntico en el mismo eje
    for (let j = 0; j < freeRects.length; j++) {
      const r = freeRects[j];
      const wN = part.width; const hN = part.height;
      const isSameSize = (wN === (last.rotated ? last.height : last.width) && hN === (last.rotated ? last.width : last.height));
      
      if (isSameSize && wN <= r.width && hN <= r.height) {
        // Si encaja perfectamente en una de las dimensiones del remanente, lo metemos
        if (Math.abs(wN - r.width) < 0.5 || Math.abs(hN - r.height) < 0.5) {
          bestRectIdx = j;
          currentRotated = last.rotated;
          break;
        }
      }
    }

    if (bestRectIdx !== -1) {
      const r = freeRects[bestRectIdx];
      const w = currentRotated ? part.height : part.width;
      const h = currentRotated ? part.width : part.height;

      placedParts.push({
        name: part.name,
        x: r.x, y: r.y, width: w, height: h,
        rotated: currentRotated,
        color: colors[part.name]
      });

      part.placed = true;
      splitGuillotine(freeRects, bestRectIdx, w, h, kerf, strategy);
    }
  }
}

function splitGuillotine(freeRects: FreeRect[], idx: number, partW: number, partH: number, kerf: number, strategy: 'vertical' | 'horizontal') {
  const r = freeRects.splice(idx, 1)[0];
  const remW = r.width - partW - kerf;
  const remH = r.height - partH - kerf;

  if (strategy === 'vertical') {
    // Corte vertical primero (X-Rip): genera una columna
    if (remW > 0) freeRects.push({ x: r.x + partW + kerf, y: r.y, width: remW, height: r.height });
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + partH + kerf, width: partW, height: remH });
  } else {
    // Corte horizontal primero (Y-Rip): genera una tira
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + partH + kerf, width: r.width, height: remH });
    if (remW > 0) freeRects.push({ x: r.x + partW + kerf, y: r.y, width: remW, height: partH });
  }
}

function evaluatePanelQuality(panel: OptimizedPanel): number {
  // Puntuación masiva para eficiencia de área
  let score = panel.efficiency * 1e15;
  
  // Bono por consolidación de sobrante (área del sobrante más grande)
  const largestLeftover = Math.max(0, ...(panel.leftovers?.map(l => l.width * l.height) || [0]));
  score += largestLeftover * 1e5;

  // Penalización por fragmentación (muchos sobrantes pequeños)
  const uselessLeftovers = panel.leftovers?.filter(l => Math.min(l.width, l.height) < 100).length || 0;
  score -= uselessLeftovers * 1e12;

  return score;
}

function shuffle(pool: InternalPart[]) {
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
}

function clusterShuffle(pool: InternalPart[]) {
  const groups = new Map<string, InternalPart[]>();
  pool.forEach(p => {
    const key = `${p.width}x${p.height}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  });
  const groupList = Array.from(groups.values());
  for (let i = groupList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [groupList[i], groupList[j]] = [groupList[j], groupList[i]];
  }
  let idx = 0;
  groupList.forEach(g => g.forEach(p => { pool[idx++] = p; }));
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 75%, 50%, 0.35)`;
  });
  return colors;
}
