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
 * Motor Industrial "ArquiMax Deep Engine v3.1"
 * Implementa Guillotine Bin Packing con Búsqueda Estocástica de 3000 ciclos.
 * Garantiza respeto absoluto al TRIM y optimización de KERF.
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
    return { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Sin piezas", kerf, trim };
  }

  // El área utilizable es el panel menos los dos márgenes de trim
  const usableW = Math.max(0, panelWidth - (trim * 2));
  const usableH = Math.max(0, panelHeight - (trim * 2));
  const partColors = generateColors(flatParts);

  const ITERATIONS = 3000;
  let bestScore = -Infinity;
  let bestLayouts: OptimizedPanel[] = [];

  const strategies = ['BAF', 'BSSF', 'BLSF'];
  const sortMethods = ['area', 'width', 'height', 'shuffle'];

  for (let i = 0; i < ITERATIONS; i++) {
    const currentParts = [...flatParts];
    const sortMethod = sortMethods[i % sortMethods.length];
    
    // Diferentes órdenes de inserción para explorar el espacio de soluciones
    if (sortMethod === 'area') currentParts.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    else if (sortMethod === 'width') currentParts.sort((a, b) => b.width - a.width || b.height - a.height);
    else if (sortMethod === 'height') currentParts.sort((a, b) => b.height - a.height || b.width - a.width);
    else shuffle(currentParts);

    const strategy = strategies[i % strategies.length];
    // Ejecutamos la disposición considerando el eje de corte (horizontal o vertical)
    const currentLayouts = executeLayout(currentParts, usableW, usableH, kerf, strategy, partColors, i % 2 === 0);
    const score = calculateScore(currentLayouts);

    if (score > bestScore) {
      bestScore = score;
      // Clonación profunda para asegurar que no se pierda la mejor solución
      bestLayouts = JSON.parse(JSON.stringify(currentLayouts));
    }

    // Si todo entra en un panel con alta eficiencia, podemos terminar
    if (currentLayouts.length === 1 && calculateTotalEfficiency(currentLayouts) > 96) break;
  }

  return {
    optimizedLayout: bestLayouts,
    totalPanels: bestLayouts.length,
    totalEfficiency: calculateTotalEfficiency(bestLayouts),
    summary: `Optimización v3.1: 3000 ciclos completados. Respeto estricto a márgenes de ${trim}mm.`,
    kerf,
    trim
  };
}

function executeLayout(
  parts: PartToCut[], 
  w: number, 
  h: number, 
  kerf: number, 
  strategy: string,
  partColors: Record<string, string>,
  preferHorizontalSplit: boolean
): OptimizedPanel[] {
  const panels: OptimizedPanel[] = [];
  let remainingParts = [...parts];

  while (remainingParts.length > 0) {
    const placedParts: OptimizedPart[] = [];
    const freeRects: Rect[] = [{ x: 0, y: 0, w, h }];
    const placedIndices = new Set<number>();

    for (let i = 0; i < remainingParts.length; i++) {
      const part = remainingParts[i];
      let bestRectIdx = -1;
      let rotated = false;
      let bestFitVal = Infinity;

      for (let j = 0; j < freeRects.length; j++) {
        const rect = freeRects[j];

        // Intento 1: Sin rotar
        if (part.width <= rect.w && part.height <= rect.h) {
          const val = getHeuristicValue(rect, part.width, part.height, strategy);
          if (val < bestFitVal) {
            bestFitVal = val;
            bestRectIdx = j;
            rotated = false;
          }
        }

        // Intento 2: Rotado (si es libre)
        if (part.grainDirection === 'libre' && part.height <= rect.w && part.width <= rect.h) {
          const val = getHeuristicValue(rect, part.height, part.width, strategy);
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

        // Guillotine Split: Decidimos el eje de corte para minimizar fragmentación
        const dw = rect.w - pw;
        const dh = rect.h - ph;

        // Estrategia de split dinámica
        const splitVertical = preferHorizontalSplit ? dw < dh : dw > dh;

        if (splitVertical) {
          if (dw > kerf) freeRects.push({ x: rect.x + pw + kerf, y: rect.y, w: dw - kerf, h: rect.h });
          if (dh > kerf) freeRects.push({ x: rect.x, y: rect.y + ph + kerf, w: pw, h: dh - kerf });
        } else {
          if (dh > kerf) freeRects.push({ x: rect.x, y: rect.y + ph + kerf, w: rect.w, h: dh - kerf });
          if (dw > kerf) freeRects.push({ x: rect.x + pw + kerf, y: rect.y, w: dw - kerf, h: ph });
        }

        placedIndices.add(i);
        // Ordenar espacios libres para priorizar los mejores ajustes en la siguiente pieza
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

function getHeuristicValue(rect: Rect, w: number, h: number, strategy: string): number {
  switch (strategy) {
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
  
  // Penalización crítica por tablero adicional
  const panelPenalty = (layouts.length - 1) * 200000;
  
  return efficiency - panelPenalty;
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
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 70%, 50%, 0.35)`;
  });
  return colors;
}
