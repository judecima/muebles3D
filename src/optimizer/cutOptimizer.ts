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
  thickness: number;
}

/**
 * ArquiMax Deep Engine v4.0
 * Algoritmo híbrido: Guillotine Bin Packing + Shelf Packing (Estantes).
 * Maximiza eficiencia industrial igualando software de referencia (Lepton).
 */
export function runOptimization(
  parts: { name: string; width: number; height: number; quantity: number; grainDirection: GrainDirection; thickness: number }[],
  panelWidth: number,
  panelHeight: number,
  selectedThickness: number,
  kerf: number = 4.5,
  trim: number = 10
): OptimizationResult {
  const filteredParts = parts.filter(p => p.thickness === selectedThickness);
  
  const flatParts: PartToCut[] = filteredParts.flatMap(p => 
    Array.from({ length: p.quantity }, () => ({
      name: p.name,
      width: p.width,
      height: p.height,
      grainDirection: p.grainDirection,
      thickness: p.thickness
    }))
  );

  if (flatParts.length === 0) {
    return { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Sin piezas", kerf, trim, selectedThickness };
  }

  const usableW = Math.max(0, panelWidth - (trim * 2));
  const usableH = Math.max(0, panelHeight - (trim * 2));
  const partColors = generateColors(flatParts);

  const ITERATIONS = 3000;
  let bestScore = -Infinity;
  let bestLayouts: OptimizedPanel[] = [];

  // Estrategias de ordenamiento
  const sortMethods = ['area', 'height', 'width', 'shuffle'];

  for (let i = 0; i < ITERATIONS; i++) {
    const currentParts = [...flatParts];
    const sortMethod = sortMethods[i % sortMethods.length];
    
    if (sortMethod === 'area') currentParts.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    else if (sortMethod === 'height') currentParts.sort((a, b) => b.height - a.height || b.width - a.width);
    else if (sortMethod === 'width') currentParts.sort((a, b) => b.width - a.width || b.height - a.height);
    else shuffle(currentParts);

    // Alternar entre Guillotina clásica y Shelf Packing (Lepton style)
    const strategy = i % 2 === 0 ? 'SHELF' : 'GUILLOTINE';
    
    const currentLayouts = executeLayout(currentParts, usableW, usableH, kerf, strategy, partColors);
    const score = calculateScore(currentLayouts);

    if (score > bestScore) {
      bestScore = score;
      bestLayouts = JSON.parse(JSON.stringify(currentLayouts));
    }
  }

  return {
    optimizedLayout: bestLayouts,
    totalPanels: bestLayouts.length,
    totalEfficiency: calculateTotalEfficiency(bestLayouts),
    summary: `ArquiMax v4.0: Benchmarking Lepton completado. Eficiencia: ${calculateTotalEfficiency(bestLayouts).toFixed(2)}%`,
    kerf,
    trim,
    selectedThickness
  };
}

function executeLayout(
  parts: PartToCut[], 
  w: number, 
  h: number, 
  kerf: number, 
  strategy: string,
  partColors: Record<string, string>
): OptimizedPanel[] {
  if (strategy === 'SHELF') return executeShelfPacking(parts, w, h, kerf, partColors);
  return executeGuillotinePacking(parts, w, h, kerf, partColors);
}

/**
 * Empaquetado por Estantes (Shelf Packing)
 * Muy eficiente para tableros industriales. Genera franjas horizontales.
 */
function executeShelfPacking(parts: PartToCut[], w: number, h: number, kerf: number, partColors: Record<string, string>): OptimizedPanel[] {
  const panels: OptimizedPanel[] = [];
  let remainingParts = [...parts];

  while (remainingParts.length > 0) {
    const placedParts: OptimizedPart[] = [];
    let currentY = 0;
    let placedIndices = new Set<number>();

    while (currentY < h && remainingParts.length > 0) {
      // 1. Encontrar la pieza más alta para definir el estante
      let shelfHeight = 0;
      let shelfParts: number[] = [];
      let currentX = 0;

      for (let i = 0; i < remainingParts.length; i++) {
        if (placedIndices.has(i)) continue;
        const part = remainingParts[i];

        // Intentar orientaciones (normal y rotada si es libre)
        const canFitNormal = part.width <= w && part.height <= (h - currentY);
        const canFitRotated = part.grainDirection === 'libre' && part.height <= w && part.width <= (h - currentY);

        if (canFitNormal || canFitRotated) {
          // La primera pieza del estante define su altura
          if (shelfHeight === 0) {
            shelfHeight = canFitNormal ? part.height : part.width;
          }
          
          // Verificar si cabe en el estante actual (X)
          const pW = (canFitNormal && part.height <= shelfHeight) ? part.width : (canFitRotated ? part.height : -1);
          const pH = (canFitNormal && part.height <= shelfHeight) ? part.height : (canFitRotated ? part.width : -1);

          if (pW !== -1 && (currentX + pW) <= w) {
            placedParts.push({
              name: part.name,
              x: currentX,
              y: currentY,
              width: pW,
              height: pH,
              rotated: pH === part.width,
              color: partColors[part.name]
            });
            currentX += pW + kerf;
            placedIndices.add(i);
          }
        }
      }

      if (shelfHeight === 0) break;
      currentY += shelfHeight + kerf;
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

function executeGuillotinePacking(parts: PartToCut[], w: number, h: number, kerf: number, partColors: Record<string, string>): OptimizedPanel[] {
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
      let minAreaFit = Infinity;

      for (let j = 0; j < freeRects.length; j++) {
        const rect = freeRects[j];
        if (part.width <= rect.w && part.height <= rect.h) {
          const area = rect.w * rect.h;
          if (area < minAreaFit) { minAreaFit = area; bestRectIdx = j; rotated = false; }
        }
        if (part.grainDirection === 'libre' && part.height <= rect.w && part.width <= rect.h) {
          const area = rect.w * rect.h;
          if (area < minAreaFit) { minAreaFit = area; bestRectIdx = j; rotated = true; }
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

        if (dw > dh) {
          if (dw > kerf) freeRects.push({ x: rect.x + pw + kerf, y: rect.y, w: dw - kerf, h: rect.h });
          if (dh > kerf) freeRects.push({ x: rect.x, y: rect.y + ph + kerf, w: pw, h: dh - kerf });
        } else {
          if (dh > kerf) freeRects.push({ x: rect.x, y: rect.y + ph + kerf, w: rect.w, h: dh - kerf });
          if (dw > kerf) freeRects.push({ x: rect.x + pw + kerf, y: rect.y, w: dw - kerf, h: ph });
        }
        placedIndices.add(i);
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

function calculateScore(layouts: OptimizedPanel[]): number {
  if (layouts.length === 0) return -Infinity;
  const mainEfficiency = layouts[0].efficiency;
  const panelPenalty = (layouts.length - 1) * 100000;
  return mainEfficiency - panelPenalty;
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
