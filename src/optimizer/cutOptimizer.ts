import { GrainDirection } from '@/lib/types';

export interface OptimizedPart {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
}

export interface OptimizedPanel {
  panelNumber: number;
  parts: OptimizedPart[];
  efficiency: number;
}

export interface OptimizationResult {
  optimizedLayout: OptimizedPanel[];
  totalPanels: number;
  totalEfficiency: number;
  summary: string;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Motor de optimización industrial "ArquiMax-Core" V2.0
 * Implementa Algoritmo de Guillotina con 2000 iteraciones y 
 * múltiples estrategias de ordenamiento (Best Fit / Long Side First).
 */
export function runOptimization(
  parts: { name: string; width: number; height: number; quantity: number; grainDirection: GrainDirection }[],
  panelWidth: number,
  panelHeight: number,
  kerf: number
): OptimizationResult {
  const flatParts = parts.flatMap(p => 
    Array.from({ length: p.quantity }, () => ({ ...p }))
  );

  if (flatParts.length === 0) {
    return { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "No hay piezas." };
  }

  let bestResult: OptimizationResult | null = null;
  const ITERATIONS = 2000;

  // Diferentes estrategias de ordenamiento para probar en las iteraciones
  const sortStrategies = [
    (a: any, b: any) => (b.width * b.height) - (a.width * a.height), // Área Descendente
    (a: any, b: any) => Math.max(b.width, b.height) - Math.max(a.width, a.height), // Lado Largo Descendente
    (a: any, b: any) => (b.width + b.height) - (a.width + a.height), // Perímetro Descendente
    (a: any, b: any) => Math.min(b.width, b.height) - Math.min(a.width, a.height), // Lado Corto Descendente
  ];

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const currentParts = [...flatParts];
    
    // Ciclar entre estrategias y añadir aleatoriedad parcial
    const strategyIndex = iter % sortStrategies.length;
    currentParts.sort(sortStrategies[strategyIndex]);

    if (iter > 0) {
      // Mezcla aleatoria parcial para diversificar la búsqueda
      for (let i = currentParts.length - 1; i > 0; i--) {
        if (Math.random() > 0.8) {
          const j = Math.floor(Math.random() * (i + 1));
          [currentParts[i], currentParts[j]] = [currentParts[j], currentParts[i]];
        }
      }
    }

    const result = executeGuillotine(currentParts, panelWidth, panelHeight, kerf);
    
    if (!bestResult || 
        result.totalPanels < bestResult.totalPanels || 
        (result.totalPanels === bestResult.totalPanels && result.totalEfficiency > bestResult.totalEfficiency)) {
      bestResult = result;
    }

    // Si encontramos una eficiencia extremadamente alta, optimizamos tiempo saliendo antes
    if (bestResult.totalEfficiency > 98.5) break;
  }

  return bestResult!;
}

function executeGuillotine(
  parts: { name: string; width: number; height: number; grainDirection: GrainDirection }[],
  panelWidth: number,
  panelHeight: number,
  kerf: number
): OptimizationResult {
  const panels: OptimizedPanel[] = [];
  let remainingParts = [...parts];

  while (remainingParts.length > 0) {
    const currentPanelParts: OptimizedPart[] = [];
    // Espacio utilizable real tras el trim
    const freeRects: Rect[] = [{ x: 0, y: 0, w: panelWidth, h: panelHeight }];
    const placedIndices: number[] = [];

    for (let i = 0; i < remainingParts.length; i++) {
      const part = remainingParts[i];
      let bestRectIndex = -1;
      let rotated = false;
      let minWaste = Infinity;

      for (let j = 0; j < freeRects.length; j++) {
        const rect = freeRects[j];
        
        // 1. Probar orientación original
        if (part.width <= rect.w && part.height <= rect.h) {
          const waste = (rect.w * rect.h) - (part.width * part.height);
          if (waste < minWaste) {
            minWaste = waste;
            bestRectIndex = j;
            rotated = false;
          }
        }
        
        // 2. Probar orientación rotada (si es permitido)
        if (part.grainDirection === 'libre' && part.height <= rect.w && part.width <= rect.h) {
          const waste = (rect.w * rect.h) - (part.width * part.height);
          // Priorizamos la rotación si deja un remanente más útil
          if (waste < minWaste) {
            minWaste = waste;
            bestRectIndex = j;
            rotated = true;
          }
        }
      }

      if (bestRectIndex !== -1) {
        const rect = freeRects.splice(bestRectIndex, 1)[0];
        const w = rotated ? part.height : part.width;
        const h = rotated ? part.width : part.height;

        currentPanelParts.push({
          name: part.name,
          x: rect.x,
          y: rect.y,
          width: w,
          height: h,
          rotated
        });

        // Heurística de Corte de Guillotina Mejorada:
        // Decidir la dirección del corte basándose en el remanente más largo (Maximized Area Split)
        const dw = rect.w - w;
        const dh = rect.h - h;

        if (dw > dh) {
          // Dividir verticalmente primero (Corte largo queda a la derecha)
          if (dw > kerf) {
            freeRects.push({ x: rect.x + w + kerf, y: rect.y, w: dw - kerf, h: rect.h });
          }
          if (dh > kerf) {
            freeRects.push({ x: rect.x, y: rect.y + h + kerf, w: w, h: dh - kerf });
          }
        } else {
          // Dividir horizontalmente primero (Corte largo queda abajo)
          if (dh > kerf) {
            freeRects.push({ x: rect.x, y: rect.y + h + kerf, w: rect.w, h: dh - kerf });
          }
          if (dw > kerf) {
            freeRects.push({ x: rect.x + w + kerf, y: rect.y, w: dw - kerf, h: h });
          }
        }
        placedIndices.push(i);
        
        // Ordenamos los rectángulos libres por área pequeña para rellenar huecos primero
        freeRects.sort((a, b) => (a.w * a.h) - (b.w * b.h));
      }
    }

    if (placedIndices.length === 0) break;

    const usedArea = currentPanelParts.reduce((sum, p) => sum + (p.width * p.height), 0);
    const totalArea = panelWidth * panelHeight;
    const efficiency = (usedArea / totalArea) * 100;

    panels.push({
      panelNumber: panels.length + 1,
      parts: currentPanelParts,
      efficiency
    });

    remainingParts = remainingParts.filter((_, idx) => !placedIndices.includes(idx));
  }

  const totalUsedArea = panels.reduce((sum, p) => sum + p.parts.reduce((s, part) => s + (part.width * part.height), 0), 0);
  const totalAvailableArea = panels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency: (totalUsedArea / (totalAvailableArea || 1)) * 100,
    summary: `Optimización industrial completa. Eficiencia global: ${(totalUsedArea / (totalAvailableArea || 1) * 100).toFixed(1)}%.`
  };
}
