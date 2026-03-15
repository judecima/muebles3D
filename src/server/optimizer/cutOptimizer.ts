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
 * JADSI Industrial Engine v25.0 - High Performance Architect
 * 
 * Este motor implementa búsqueda intensiva de 10,000 iteraciones por panel
 * con salida anticipada al alcanzar el 95% de eficiencia.
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

    // Búsqueda de alta intensidad: 10,000 iteraciones por panel
    const maxIterations = 10000; 
    
    for (let iter = 0; iter < maxIterations; iter++) {
      const currentTryPool = pool.filter(p => !p.placed).map(p => ({ ...p }));
      
      if (iter > 0) {
        if (iter % 5 === 0) clusterShuffle(currentTryPool);
        else shuffle(currentTryPool);
      } else {
        currentTryPool.sort((a, b) => (b.width * b.height) - (a.width * a.height));
      }

      // Evaluamos ambas estrategias, pero el scoring favorecerá la que pidas (Horizontal por defecto en tie-break)
      const strategies: ('horizontal' | 'vertical')[] = ['horizontal', 'vertical'];
      
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

        const score = evaluatePanelQuality(attempt, strategy);
        
        if (score > bestPanelScore) {
          bestPanelScore = score;
          bestPanelForThisStep = attempt;
        }
      }

      // SHORT-CIRCUIT: Si alcanzamos > 95% de eficiencia, consideramos el panel óptimo y saltamos el resto de iteraciones
      if (bestPanelForThisStep && bestPanelForThisStep.efficiency >= 95) {
        break;
      }
    }

    if (bestPanelForThisStep && bestPanelForThisStep.parts.length > 0) {
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
      break;
    }
  }

  const totalUsedArea = finalPanels.reduce((acc, p) => acc + p.usedArea, 0);
  const totalAvailArea = finalPanels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: finalPanels,
    totalPanels: finalPanels.length,
    totalEfficiency: (totalUsedArea / totalAvailArea) * 100,
    summary: `JADSI v25.0: Optimización completada con ${finalPanels.length} paneles.`,
    kerf,
    trim,
    selectedThickness
  };
}

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
      
      // EVALUAR NORMAL: Respeta veta estrictamente
      if (part.width <= r.width && part.height <= r.height) {
        const cp = calculateContactScore(r.x, r.y, part.width, part.height, panelWidth, panelHeight, trim, r);
        const residue = (r.width * r.height) - (part.width * part.height);
        if (cp > maxCP || (cp === maxCP && residue < minResidue)) {
          maxCP = cp; minResidue = residue; bestRectIdx = j; rotated = false;
        }
      }

      // EVALUAR ROTADO: Solo si el material es liso o el usuario activó "Rotar"
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
  if (Math.abs(x - trim) < 0.5) score += h * 2;
  if (Math.abs(y - trim) < 0.5) score += w * 2;
  if (Math.abs(x + w - (pW - trim)) < 0.5) score += h;
  if (Math.abs(y + h - (pH - trim)) < 0.5) score += w;
  
  if (Math.abs(w - r.width) < 0.5) score += h * 5; // Premio masivo por alineación perfecta de ancho
  if (Math.abs(h - r.height) < 0.5) score += w * 5; // Premio masivo por alineación perfecta de alto
  
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

    for (let j = 0; j < freeRects.length; j++) {
      const r = freeRects[j];
      const wN = part.width; const hN = part.height;
      const isSameSize = (wN === (last.rotated ? last.height : last.width) && hN === (last.rotated ? last.width : last.height));
      
      if (isSameSize && wN <= r.width && hN <= r.height) {
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
    if (remW > 0) freeRects.push({ x: r.x + partW + kerf, y: r.y, width: remW, height: r.height });
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + partH + kerf, width: partW, height: remH });
  } else {
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + partH + kerf, width: r.width, height: remH });
    if (remW > 0) freeRects.push({ x: r.x + partW + kerf, y: r.y, width: remW, height: partH });
  }
}

function evaluatePanelQuality(panel: OptimizedPanel, strategy: 'vertical' | 'horizontal'): number {
  let score = panel.efficiency * 1e18;
  
  // Bono por estrategia horizontal (transversal) si empatan en eficiencia
  if (strategy === 'horizontal') score += 1e12;

  // Bono por consolidación de sobrante masivo
  const largestLeftover = Math.max(0, ...(panel.leftovers?.map(l => l.width * l.height) || [0]));
  score += largestLeftover * 1e8;

  // Penalización por fragmentación excesiva
  const uselessLeftovers = panel.leftovers?.filter(l => Math.min(l.width, l.height) < 100).length || 0;
  score -= uselessLeftovers * 1e14;

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
