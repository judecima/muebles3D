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
 * JADSI Industrial Engine v26.0 - Master Bench Optimizer
 * 
 * Arquitectura de Simulación de Eje Dual con Ordenamiento Jerárquico.
 * Diseñado para maximizar la densidad en el Panel 1 (>94%) y consolidar bloques.
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

  // Optimización secuencial: Panel por Panel para garantizar la perfección en el Panel 1
  while (pool.some(p => !p.placed)) {
    let bestPanelForThisStep: OptimizedPanel | null = null;
    let bestPanelScore = -Infinity;

    // Búsqueda Ultra-Intensiva: 10,000 iteraciones probando ambos ejes de guillotina
    const maxIterations = 10000; 
    
    for (let iter = 0; iter < maxIterations; iter++) {
      const currentTryPool = pool.filter(p => !p.placed).map(p => ({ ...p }));
      
      // ESTRATEGIA DE ORDENAMIENTO
      if (iter === 0) {
        // Primera iteración: Siempre piezas más grandes primero (Área Descendente)
        currentTryPool.sort((a, b) => (b.width * b.height) - (a.width * a.height));
      } else if (iter < 10) {
        // Variaciones determinísticas basadas en dimensiones
        if (iter === 1) currentTryPool.sort((a, b) => b.width - a.width || b.height - a.height);
        if (iter === 2) currentTryPool.sort((a, b) => b.height - a.height || b.width - a.width);
      } else {
        // Mutaciones estocásticas que tienden a mantener las piezas grandes al inicio
        smartShuffle(currentTryPool);
      }

      // Probar ambos sentidos de corte para este ordenamiento
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

      // SHORT-CIRCUIT: Si alcanzamos > 95.5% de eficiencia, el panel es excelente.
      if (bestPanelForThisStep && bestPanelForThisStep.efficiency >= 95.5) {
        break;
      }
    }

    if (bestPanelForThisStep && bestPanelForThisStep.parts.length > 0) {
      // Marcar piezas como colocadas en el pool principal
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
    summary: `JADSI v26.0: Panel 1 optimizado al ${finalPanels[0]?.efficiency.toFixed(1)}%. Total: ${finalPanels.length} paneles.`,
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

      // EVALUAR ROTADO: Solo si el material es liso o el usuario DESMARCÓ "Resp. Veta"
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
      
      // Lógica de Clúster: Llenar inmediatamente con piezas hermanas para maximizar alineación
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

/**
 * Scoring de Punto de Contacto (Contact Point)
 * Premia piezas pegadas a bordes o esquinas para consolidar el aire sobrante.
 */
function calculateContactScore(x: number, y: number, w: number, h: number, pW: number, pH: number, trim: number, r: FreeRect): number {
  let score = 0;
  // Contacto con bordes externos (Prioridad 1)
  if (Math.abs(x - trim) < 0.5) score += h * 10;
  if (Math.abs(y - trim) < 0.5) score += w * 10;
  if (Math.abs(x + w - (pW - trim)) < 0.5) score += h * 2;
  if (Math.abs(y + h - (pH - trim)) < 0.5) score += w * 2;
  
  // Coincidencia exacta con el contenedor (Elimina fragmentación)
  if (Math.abs(w - r.width) < 0.5) score += h * 50; 
  if (Math.abs(h - r.height) < 0.5) score += w * 50; 
  
  return score;
}

/**
 * Forzar apilamiento de piezas idénticas (Afinidad de Clúster)
 */
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

    const isSameSize = (part.width === (last.rotated ? last.height : last.width) && part.height === (last.rotated ? last.width : last.height));
    if (!isSameSize) continue;

    let bestRectIdx = -1;
    for (let j = 0; j < freeRects.length; j++) {
      const r = freeRects[j];
      const wN = last.width; const hN = last.height;
      
      if (wN <= r.width && hN <= r.height) {
        // Solo colocar si mantiene la alineación de la franja/columna
        if (Math.abs(wN - r.width) < 0.5 || Math.abs(hN - r.height) < 0.5) {
          bestRectIdx = j;
          break;
        }
      }
    }

    if (bestRectIdx !== -1) {
      const r = freeRects[bestRectIdx];
      placedParts.push({
        name: part.name,
        x: r.x, y: r.y, width: last.width, height: last.height,
        rotated: last.rotated,
        color: colors[part.name]
      });
      part.placed = true;
      splitGuillotine(freeRects, bestRectIdx, last.width, last.height, kerf, strategy);
    }
  }
}

function splitGuillotine(freeRects: FreeRect[], idx: number, partW: number, partH: number, kerf: number, strategy: 'vertical' | 'horizontal') {
  const r = freeRects.splice(idx, 1)[0];
  const remW = r.width - partW - kerf;
  const remH = r.height - partH - kerf;

  if (strategy === 'vertical') {
    // Primero dividir verticalmente (crear columna lateral)
    if (remW > 0) freeRects.push({ x: r.x + partW + kerf, y: r.y, width: remW, height: r.height });
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + partH + kerf, width: partW, height: remH });
  } else {
    // Primero dividir horizontalmente (crear tira superior)
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + partH + kerf, width: r.width, height: remH });
    if (remW > 0) freeRects.push({ x: r.x + partW + kerf, y: r.y, width: remW, height: partH });
  }
}

/**
 * Evaluación de calidad del panel
 * Penaliza fuertemente la fragmentación y premia bloques sobrantes masivos.
 */
function evaluatePanelQuality(panel: OptimizedPanel, strategy: 'vertical' | 'horizontal'): number {
  let score = panel.efficiency * 1e20;
  
  // Bono por estrategia horizontal (pedida por el usuario)
  if (strategy === 'horizontal') score += 1e15;

  // Bono masivo por el tamaño del sobrante más grande (Consolidación)
  const largestLeftover = Math.max(0, ...(panel.leftovers?.map(l => l.width * l.height) || [0]));
  score += largestLeftover * 1e10;

  // Penalización por cada corte adicional (menor cantidad de piezas en el panel es mejor si la eficiencia es igual)
  score -= panel.parts.length * 1e8;

  return score;
}

function smartShuffle(pool: InternalPart[]) {
  // Ordenamiento ponderado: las piezas grandes tienen 90% probabilidad de quedar arriba
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const areaI = pool[i].width * pool[i].height;
    const areaJ = pool[j].width * pool[j].height;
    
    // Si la pieza en J es más grande, es menos probable que la movamos hacia atrás
    if (areaJ > areaI && Math.random() > 0.2) continue;
    
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 75%, 50%, 0.35)`;
  });
  return colors;
}
