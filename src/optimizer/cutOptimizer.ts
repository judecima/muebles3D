import { GrainDirection, OptimizationResult, OptimizedPanel, OptimizedPart } from '@/lib/types';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PartToCut {
  name: string;
  width: number;
  height: number;
  grainDirection: GrainDirection;
}

/**
 * Motor de optimización industrial "ArquiMax Industrial Engine"
 * Basado en Guillotine Bin Packing con búsqueda heurística iterativa (3000+ ciclos).
 */
export function runOptimization(
  parts: { name: string; width: number; height: number; quantity: number; grainDirection: GrainDirection }[],
  panelWidth: number,
  panelHeight: number,
  kerf: number = 4.5,
  trim: number = 10
): OptimizationResult {
  // Preprocesamiento: Expandir cantidades y agrupar
  const flatParts: PartToCut[] = parts.flatMap(p => 
    Array.from({ length: p.quantity }, () => ({
      name: p.name,
      width: p.width,
      height: p.height,
      grainDirection: p.grainDirection
    }))
  );

  if (flatParts.length === 0) {
    return { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "No hay piezas", kerf, trim };
  }

  // Dimensiones útiles tras aplicar trim
  const usableW = panelWidth - (trim * 2);
  const usableH = panelHeight - (trim * 2);

  let bestResult: OptimizationResult | null = null;
  const INITIAL_ITERATIONS = 3000;
  
  // Ejecutar búsqueda iterativa
  bestResult = performSearch(flatParts, usableW, usableH, kerf, trim, INITIAL_ITERATIONS);

  // Si no llegamos al target del 85%, ejecutamos otras 3000 iteraciones
  if (bestResult.totalEfficiency < 85) {
    const secondResult = performSearch(flatParts, usableW, usableH, kerf, trim, 3000);
    if (secondResult.totalEfficiency > bestResult.totalEfficiency) {
      bestResult = secondResult;
    }
  }

  return bestResult;
}

function performSearch(
  parts: PartToCut[], 
  usableW: number, 
  usableH: number, 
  kerf: number, 
  trim: number,
  iterations: number
): OptimizationResult {
  let bestScore = -1;
  let bestLayouts: OptimizedPanel[] = [];

  const heuristics = ['BAF', 'BSSF', 'BLSF'];

  for (let i = 0; i < iterations; i++) {
    const currentParts = [...parts];
    
    // Mutaciones: Shuffle y Heurística
    if (i > 0) {
      shuffle(currentParts);
    } else {
      // Primera iteración: Greedy (Área descendente)
      currentParts.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    }

    const heuristic = heuristics[i % heuristics.length];
    const splitHorizontal = i % 2 === 0;

    const currentLayouts = executeLayout(currentParts, usableW, usableH, kerf, heuristic, splitHorizontal);
    const currentScore = calculateScore(currentLayouts, kerf);

    if (currentScore > bestScore) {
      bestScore = currentScore;
      bestLayouts = currentLayouts;
    }

    // Early exit si es excepcional
    if (calculateTotalEfficiency(currentLayouts) > 98) break;
  }

  const totalEff = calculateTotalEfficiency(bestLayouts);

  return {
    optimizedLayout: bestLayouts,
    totalPanels: bestLayouts.length,
    totalEfficiency: totalEff,
    summary: `Optimización industrial completa. Eficiencia: ${totalEff.toFixed(1)}%.`,
    kerf,
    trim
  };
}

function executeLayout(
  parts: PartToCut[], 
  w: number, 
  h: number, 
  kerf: number, 
  heuristic: string,
  splitHorizontal: boolean
): OptimizedPanel[] {
  const panels: OptimizedPanel[] = [];
  let remainingParts = [...parts];
  const partColors = generateColors(parts);

  while (remainingParts.length > 0) {
    const placedParts: OptimizedPart[] = [];
    const freeRects: Rect[] = [{ x: 0, y: 0, w: w, h: h }];
    const placedIndices = new Set<number>();

    for (let i = 0; i < remainingParts.length; i++) {
      const part = remainingParts[i];
      let bestRectIdx = -1;
      let rotated = false;
      let bestFitVal = Infinity;

      for (let j = 0; j < freeRects.length; j++) {
        const rect = freeRects[j];

        // Probar normal
        if (part.width <= rect.w && part.height <= rect.h) {
          const val = getHeuristicValue(rect, part.width, part.height, heuristic);
          if (val < bestFitVal) {
            bestFitVal = val;
            bestRectIdx = j;
            rotated = false;
          }
        }

        // Probar rotado
        if (part.grainDirection === 'libre' && part.height <= rect.w && part.width <= rect.h) {
          const val = getHeuristicValue(rect, part.height, part.width, heuristic);
          if (val < bestFitVal) {
            bestFitVal = val;
            bestRectIdx = j;
            rotated = true;
          }
        }
      }

      if (bestRectIdx !== -1) {
        const rect = freeRects.splice(bestRectIdx, 1)[0];
        const pw = rotated ? part.height : part.width;
        const ph = rotated ? part.width : part.height;

        placedParts.push({
          name: part.name,
          x: rect.x,
          y: rect.y,
          width: pw,
          height: ph,
          rotated,
          color: partColors[part.name]
        });

        // Split Guillotine
        const dw = rect.w - pw;
        const dh = rect.h - ph;

        if (splitHorizontal) {
          if (dh > kerf) freeRects.push({ x: rect.x, y: rect.y + ph + kerf, w: rect.w, h: dh - kerf });
          if (dw > kerf) freeRects.push({ x: rect.x + pw + kerf, y: rect.y, w: dw - kerf, h: ph });
        } else {
          if (dw > kerf) freeRects.push({ x: rect.x + pw + kerf, y: rect.y, w: dw - kerf, h: rect.h });
          if (dh > kerf) freeRects.push({ x: rect.x, y: rect.y + ph + kerf, w: pw, h: dh - kerf });
        }

        placedIndices.add(i);
        // Pequeño re-sort de huecos para BAF
        freeRects.sort((a, b) => (a.w * a.h) - (b.w * b.h));
      }
    }

    if (placedIndices.size === 0) break; // Evitar loop infinito

    const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
    const totalArea = w * h;

    panels.push({
      panelNumber: panels.length + 1,
      parts: placedParts,
      efficiency: (usedArea / totalArea) * 100,
      usedArea,
      totalArea
    });

    remainingParts = remainingParts.filter((_, idx) => !placedIndices.has(idx));
  }

  return panels;
}

function getHeuristicValue(rect: Rect, w: number, h: number, heuristic: string): number {
  switch (heuristic) {
    case 'BAF': return (rect.w * rect.h) - (w * h);
    case 'BSSF': return Math.min(rect.w - w, rect.h - h);
    case 'BLSF': return Math.max(rect.w - w, rect.h - h);
    default: return (rect.w * rect.h) - (w * h);
  }
}

function calculateScore(layouts: OptimizedPanel[], kerf: number): number {
  if (layouts.length === 0) return 0;
  
  const totalUsed = layouts.reduce((acc, l) => acc + l.usedArea, 0);
  const totalArea = layouts.reduce((acc, l) => acc + l.totalArea, 0);
  const panelsCount = layouts.length;

  // Penalización por fragmentación (huecos < 80mm)
  // En este motor simplificado, el score base es la eficiencia inversa a la cantidad de tableros
  return (totalUsed / totalArea) * 1000 - (panelsCount * 50);
}

function calculateTotalEfficiency(layouts: OptimizedPanel[]): number {
  if (layouts.length === 0) return 0;
  const used = layouts.reduce((acc, l) => acc + l.usedArea, 0);
  const total = layouts.reduce((acc, l) => acc + l.totalArea, 0);
  return (used / total) * 100;
}

function shuffle(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function generateColors(parts: PartToCut[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  const hueStep = 360 / uniqueNames.length;
  
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${i * hueStep}, 70%, 50%, 0.3)`;
  });
  
  return colors;
}
