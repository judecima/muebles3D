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
 * Motor de optimización industrial "ArquiMax Industrial Engine v2.0"
 * Implementa Guillotine Bin Packing con búsqueda estocástica de 3000 iteraciones.
 */
export function runOptimization(
  parts: { name: string; width: number; height: number; quantity: number; grainDirection: GrainDirection }[],
  panelWidth: number,
  panelHeight: number,
  kerf: number = 4.5,
  trim: number = 10
): OptimizationResult {
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

  const usableW = panelWidth - (trim * 2);
  const usableH = panelHeight - (trim * 2);
  const partColors = generateColors(flatParts);

  const ITERATIONS = 3000;
  let bestScore = -Infinity;
  let bestLayouts: OptimizedPanel[] = [];

  const heuristics = ['BAF', 'BSSF', 'BLSF'];

  for (let i = 0; i < ITERATIONS; i++) {
    const currentParts = [...flatParts];
    
    // Mutaciones: Barajado aleatorio excepto en la primera iteración (orden industrial)
    if (i > 0) {
      shuffle(currentParts);
    } else {
      currentParts.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    }

    const heuristic = heuristics[i % heuristics.length];
    const splitStrategy = i % 2 === 0 ? 'horizontal' : 'vertical';

    const currentLayouts = executeLayout(currentParts, usableW, usableH, kerf, heuristic, splitStrategy, partColors);
    const currentScore = calculateScore(currentLayouts);

    // CRITICAL: Persistencia de la mejor solución encontrada
    if (currentScore > bestScore) {
      bestScore = currentScore;
      // Clonado profundo para asegurar que el resultado sea inmutable
      bestLayouts = JSON.parse(JSON.stringify(currentLayouts));
    }

    // Early exit si alcanzamos la eficiencia teórica máxima
    if (calculateTotalEfficiency(currentLayouts) > 98.5 && currentLayouts.length === 1) break;
  }

  return {
    optimizedLayout: bestLayouts,
    totalPanels: bestLayouts.length,
    totalEfficiency: calculateTotalEfficiency(bestLayouts),
    summary: `Optimización industrial completa. Evaluadas ${ITERATIONS} combinaciones.`,
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
  splitStrategy: 'horizontal' | 'vertical',
  partColors: Record<string, string>
): OptimizedPanel[] {
  const panels: OptimizedPanel[] = [];
  let remainingParts = [...parts];

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

        // Intento 1: Normal
        if (part.width <= rect.w && part.height <= rect.h) {
          const val = getHeuristicValue(rect, part.width, part.height, heuristic);
          if (val < bestFitVal) {
            bestFitVal = val;
            bestRectIdx = j;
            rotated = false;
          }
        }

        // Intento 2: Rotado (si es libre)
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

        // Guillotine Split: División dinámica
        const dw = rect.w - pw;
        const dh = rect.h - ph;

        // Decisión local de split basada en el remanente (evita piezas atrapadas)
        if (dw > dh) {
          if (dw >= kerf) freeRects.push({ x: rect.x + pw + kerf, y: rect.y, w: dw - kerf, h: rect.h });
          if (dh >= kerf) freeRects.push({ x: rect.x, y: rect.y + ph + kerf, w: pw, h: dh - kerf });
        } else {
          if (dh >= kerf) freeRects.push({ x: rect.x, y: rect.y + ph + kerf, w: rect.w, h: dh - kerf });
          if (dw >= kerf) freeRects.push({ x: rect.x + pw + kerf, y: rect.y, w: dw - kerf, h: ph });
        }

        placedIndices.add(i);
        // Ordenar espacios libres para favorecer el rellenado de huecos pequeños
        freeRects.sort((a, b) => (a.w * a.h) - (b.w * b.h));
      }
    }

    if (placedIndices.size === 0) break; // Seguridad

    const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
    panels.push({
      panelNumber: panels.length + 1,
      parts: placedParts,
      efficiency: (usedArea / (w * h)) * 100,
      usedArea,
      totalArea: w * h
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

function calculateScore(layouts: OptimizedPanel[]): number {
  if (layouts.length === 0) return -Infinity;
  const used = layouts.reduce((acc, l) => acc + l.usedArea, 0);
  const total = layouts.reduce((acc, l) => acc + l.totalArea, 0);
  const efficiency = (used / total) * 100;
  
  // Penalización severa por cada tablero adicional para forzar compactación
  return (efficiency * 100) - (layouts.length * 10000);
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
  const hueStep = 360 / Math.max(1, uniqueNames.length);
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${i * hueStep}, 70%, 45%, 0.3)`;
  });
  return colors;
}
