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
 * Motor de optimización industrial "ArquiMax Industrial Engine v2.6"
 * Implementa Guillotine Bin Packing con búsqueda estocástica profunda y estrategias de split duales.
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
  const splitStrategies = ['horizontal', 'vertical', 'shorter', 'longer'];

  for (let i = 0; i < ITERATIONS; i++) {
    const currentParts = [...flatParts];
    
    // Mutaciones: Barajado aleatorio y variaciones de orden industrial
    if (i > 0) {
      shuffle(currentParts);
    } else {
      // Primera iteración: Orden industrial por área descendente
      currentParts.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    }

    const heuristic = heuristics[i % heuristics.length];
    const splitStrategy = splitStrategies[i % splitStrategies.length];

    const currentLayouts = executeLayout(currentParts, usableW, usableH, kerf, heuristic, splitStrategy, partColors);
    const currentScore = calculateScore(currentLayouts);

    // Persistencia Crítica: Guardar el mejor resultado absoluto basado en eficiencia y número de tableros
    if (currentScore > bestScore) {
      bestScore = currentScore;
      bestLayouts = JSON.parse(JSON.stringify(currentLayouts));
    }

    // Early exit si alcanzamos la perfección teórica en un solo tablero
    if (currentLayouts.length === 1 && calculateTotalEfficiency(currentLayouts) > 95) break;
  }

  return {
    optimizedLayout: bestLayouts,
    totalPanels: bestLayouts.length,
    totalEfficiency: calculateTotalEfficiency(bestLayouts),
    summary: `Optimización industrial completa. Evaluadas ${ITERATIONS} combinaciones de guillotina con split dual.`,
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
  splitStrategy: string,
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

        // Intento 1: Orientación Original
        if (part.width <= rect.w && part.height <= rect.h) {
          const val = getHeuristicValue(rect, part.width, part.height, heuristic);
          if (val < bestFitVal) {
            bestFitVal = val;
            bestRectIdx = j;
            rotated = false;
          }
        }

        // Intento 2: Rotación 90° (solo si la veta es 'libre')
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

        const dw = rect.w - pw;
        const dh = rect.h - ph;

        // Decisión de Split de Guillotina (Corte de lado a lado)
        let splitHorizontal = false;
        if (splitStrategy === 'horizontal') splitHorizontal = true;
        else if (splitStrategy === 'vertical') splitHorizontal = false;
        else if (splitStrategy === 'shorter') splitHorizontal = dw <= dh;
        else if (splitStrategy === 'longer') splitHorizontal = dw > dh;

        if (splitHorizontal) {
          // Primero cortamos a lo ancho del tablero restante
          if (dh > 0) freeRects.push({ x: rect.x, y: rect.y + ph + kerf, w: rect.w, h: Math.max(0, dh - kerf) });
          if (dw > 0) freeRects.push({ x: rect.x + pw + kerf, y: rect.y, w: Math.max(0, dw - kerf), h: ph });
        } else {
          // Primero cortamos a lo alto del tablero restante
          if (dw > 0) freeRects.push({ x: rect.x + pw + kerf, y: rect.y, w: Math.max(0, dw - kerf), h: rect.h });
          if (dh > 0) freeRects.push({ x: rect.x, y: rect.y + ph + kerf, w: pw, h: Math.max(0, dh - kerf) });
        }

        placedIndices.add(i);
        // Ordenar rectángulos libres para favorecer el relleno de huecos pequeños (Best Area Fit)
        freeRects.sort((a, b) => (a.w * a.h) - (b.w * b.h));
      }
    }

    if (placedIndices.size === 0) break;

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
  const usedArea = layouts.reduce((acc, l) => acc + l.usedArea, 0);
  const totalArea = layouts.reduce((acc, l) => acc + l.totalArea, 0);
  const efficiency = (usedArea / totalArea) * 100;
  
  // Penalización masiva por cada tablero adicional. 
  // Esto asegura que 1 tablero al 90% sea mejor que 2 tableros al 45%.
  const panelPenalty = layouts.length * 1000000;
  
  // Bonificación por eficiencia de área
  return (efficiency * 1000) - panelPenalty;
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
    colors[name] = `hsla(${i * hueStep}, 65%, 45%, 0.25)`;
  });
  return colors;
}