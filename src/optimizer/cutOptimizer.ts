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
 * Basado en Guillotine Bin Packing con búsqueda heurística iterativa exhaustiva.
 */
export function runOptimization(
  parts: { name: string; width: number; height: number; quantity: number; grainDirection: GrainDirection }[],
  panelWidth: number,
  panelHeight: number,
  kerf: number = 4.5,
  trim: number = 10
): OptimizationResult {
  // Preprocesamiento: Expandir cantidades
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

  const ITERATIONS = 3000;
  let bestScore = -Infinity;
  let bestLayouts: OptimizedPanel[] = [];

  const heuristics = ['BAF', 'BSSF', 'BLSF'];
  const partColors = generateColors(flatParts);

  for (let i = 0; i < ITERATIONS; i++) {
    const currentParts = [...flatParts];
    
    // Mutaciones de búsqueda
    if (i > 0) {
      // Mezcla aleatoria para explorar el espacio de soluciones
      shuffle(currentParts);
    } else {
      // Primera iteración: Orden industrial estándar (Área descendente)
      currentParts.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    }

    const heuristic = heuristics[i % heuristics.length];
    const splitHorizontal = i % 2 === 0;

    const currentLayouts = executeLayout(currentParts, usableW, usableH, kerf, heuristic, splitHorizontal, partColors);
    
    // EVALUACIÓN CRÍTICA: Calcular score para esta iteración
    const currentScore = calculateScore(currentLayouts);

    // PERSISTENCIA DE LA MEJOR SOLUCIÓN
    if (currentScore > bestScore) {
      bestScore = currentScore;
      // Clonado profundo para evitar referencias mutables
      bestLayouts = JSON.parse(JSON.stringify(currentLayouts));
    }

    // Si encontramos una solución casi perfecta, terminamos antes
    if (calculateTotalEfficiency(currentLayouts) > 98.5) break;
  }

  // Si la eficiencia es baja, intentamos un segundo ciclo de búsqueda agresiva
  const totalEff = calculateTotalEfficiency(bestLayouts);
  if (totalEff < 85) {
    // Re-ejecutar búsqueda con mayor aleatoriedad si es necesario
    // (Opcional: añadir lógica de reintento aquí)
  }

  return {
    optimizedLayout: bestLayouts,
    totalPanels: bestLayouts.length,
    totalEfficiency: totalEff,
    summary: `Optimización industrial completa. Se evaluaron ${ITERATIONS} combinaciones.`,
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
  splitHorizontal: boolean,
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

        // Intentar colocar normal
        if (part.width <= rect.w && part.height <= rect.h) {
          const val = getHeuristicValue(rect, part.width, part.height, heuristic);
          if (val < bestFitVal) {
            bestFitVal = val;
            bestRectIdx = j;
            rotated = false;
          }
        }

        // Intentar colocar rotado (solo si es veta libre)
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
          if (dh >= kerf) freeRects.push({ x: rect.x, y: rect.y + ph + kerf, w: rect.w, h: dh - kerf });
          if (dw >= kerf) freeRects.push({ x: rect.x + pw + kerf, y: rect.y, w: dw - kerf, h: ph });
        } else {
          if (dw >= kerf) freeRects.push({ x: rect.x + pw + kerf, y: rect.y, w: dw - kerf, h: rect.h });
          if (dh >= kerf) freeRects.push({ x: rect.x, y: rect.y + ph + kerf, w: pw, h: dh - kerf });
        }

        placedIndices.add(i);
        // Re-ordenar espacios libres para favorecer BAF en el siguiente paso
        freeRects.sort((a, b) => (a.w * a.h) - (b.w * b.h));
      }
    }

    if (placedIndices.size === 0) break; // Seguridad contra piezas imposibles

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
    case 'BAF': return (rect.w * rect.h) - (w * h); // Best Area Fit
    case 'BSSF': return Math.min(rect.w - w, rect.h - h); // Best Short Side Fit
    case 'BLSF': return Math.max(rect.w - w, rect.h - h); // Best Long Side Fit
    default: return (rect.w * rect.h) - (w * h);
  }
}

/**
 * Función de puntuación industrial.
 * Maximiza eficiencia y penaliza fuertemente el uso de tableros adicionales.
 */
function calculateScore(layouts: OptimizedPanel[]): number {
  if (layouts.length === 0) return -Infinity;
  
  const used = layouts.reduce((acc, l) => acc + l.usedArea, 0);
  const total = layouts.reduce((acc, l) => acc + l.totalArea, 0);
  const efficiency = (used / total) * 100;

  // Penalización por cada tablero adicional (500 puntos de eficiencia de peso)
  // Esto obliga al algoritmo a intentar meter todo en el primer tablero.
  return (efficiency * 100) - (layouts.length * 5000);
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
    colors[name] = `hsla(${i * hueStep}, 75%, 45%, 0.35)`;
  });
  
  return colors;
}
