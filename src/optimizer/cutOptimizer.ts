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
 * Motor de optimización tipo Guillotina (Best Area Fit)
 * Permite rotación si la veta es 'libre' para mejorar la eficiencia.
 */
export function runOptimization(
  parts: { name: string; width: number; height: number; quantity: number; grainDirection: GrainDirection }[],
  panelWidth: number,
  panelHeight: number,
  kerf: number
): OptimizationResult {
  // Desglosar cantidades
  let flatParts = parts.flatMap(p => 
    Array.from({ length: p.quantity }, () => ({ ...p }))
  );

  // Ordenar por área descendente
  flatParts.sort((a, b) => (b.width * b.height) - (a.width * a.height));

  const panels: OptimizedPanel[] = [];
  let remainingParts = [...flatParts];

  while (remainingParts.length > 0) {
    const currentPanelParts: OptimizedPart[] = [];
    const freeRects: Rect[] = [{ x: 0, y: 0, w: panelWidth, h: panelHeight }];
    const placedIndices: number[] = [];

    for (let i = 0; i < remainingParts.length; i++) {
      const part = remainingParts[i];
      let bestRectIndex = -1;
      let rotated = false;
      let minAreaFit = Infinity;

      for (let j = 0; j < freeRects.length; j++) {
        const rect = freeRects[j];
        
        // 1. Intentar sin rotar
        if (part.width <= rect.w && part.height <= rect.h) {
          const areaFit = rect.w * rect.h;
          if (areaFit < minAreaFit) {
            minAreaFit = areaFit;
            bestRectIndex = j;
            rotated = false;
          }
        }
        
        // 2. Intentar rotado (solo si grainDirection es 'libre' o similar)
        if (part.grainDirection === 'libre' && part.height <= rect.w && part.width <= rect.h) {
          const areaFit = rect.w * rect.h;
          if (areaFit < minAreaFit) {
            minAreaFit = areaFit;
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

        // Split de Guillotina
        const dw = rect.w - w;
        const dh = rect.h - h;

        if (dw > dh) {
          if (dw > kerf) freeRects.push({ x: rect.x + w + kerf, y: rect.y, w: dw - kerf, h: rect.h });
          if (dh > kerf) freeRects.push({ x: rect.x, y: rect.y + h + kerf, w: w, h: dh - kerf });
        } else {
          if (dh > kerf) freeRects.push({ x: rect.x, y: rect.y + h + kerf, w: rect.w, h: dh - kerf });
          if (dw > kerf) freeRects.push({ x: rect.x + w + kerf, y: rect.y, w: dw - kerf, h: h });
        }
        placedIndices.push(i);
      }
    }

    const usedArea = currentPanelParts.reduce((sum, p) => sum + (p.width * p.height), 0);
    const totalArea = panelWidth * panelHeight;
    const efficiency = (usedArea / totalArea) * 100;

    panels.push({
      panelNumber: panels.length + 1,
      parts: currentPanelParts,
      efficiency
    });

    remainingParts = remainingParts.filter((_, idx) => !placedIndices.includes(idx));
    
    // Si no se pudo colocar ninguna pieza en un tablero vacío, la pieza es demasiado grande
    if (placedIndices.length === 0 && remainingParts.length > 0) {
      break;
    }
  }

  const totalUsedArea = panels.reduce((sum, p) => sum + p.parts.reduce((s, part) => s + (part.width * part.height), 0), 0);
  const totalAvailableArea = panels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency: (totalUsedArea / totalAvailableArea) * 100,
    summary: `Optimización industrial completa. Eficiencia: ${(totalUsedArea / (totalAvailableArea || 1) * 100).toFixed(1)}%.`
  };
}
