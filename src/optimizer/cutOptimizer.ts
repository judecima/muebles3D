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
 * ArquiMax Deep Engine v5.0 (Strict Guillotine)
 * Algoritmo de particionamiento recursivo por franjas.
 * Diseñado para igualar la eficiencia de Lepton en seccionadoras industriales.
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

  const ITERATIONS = 2000;
  let bestScore = -Infinity;
  let bestLayouts: OptimizedPanel[] = [];

  // Probamos diferentes criterios de ordenamiento para encontrar la mejor combinación de franjas
  const sortMethods = ['height', 'area', 'width', 'shuffle'];

  for (let i = 0; i < ITERATIONS; i++) {
    const currentParts = [...flatParts];
    const sortMethod = sortMethods[i % sortMethods.length];
    
    if (sortMethod === 'height') {
      currentParts.sort((a, b) => b.height - a.height || b.width - a.width);
    } else if (sortMethod === 'area') {
      currentParts.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    } else if (sortMethod === 'shuffle') {
      shuffle(currentParts);
    }

    const currentLayouts = executeStrictGuillotine(currentParts, usableW, usableH, kerf, partColors);
    const score = calculateScore(currentLayouts);

    if (score > bestScore) {
      bestScore = score;
      bestLayouts = JSON.parse(JSON.stringify(currentLayouts));
    }
  }

  const efficiency = calculateTotalEfficiency(bestLayouts);

  return {
    optimizedLayout: bestLayouts,
    totalPanels: bestLayouts.length,
    totalEfficiency: efficiency,
    summary: `ArquiMax v5.0: Guillotina Estricta. Eficiencia: ${efficiency.toFixed(2)}%`,
    kerf,
    trim,
    selectedThickness
  };
}

/**
 * Implementa una estrategia de "Strip Packing" con cortes de guillotina.
 * Crea franjas horizontales que ocupan todo el ancho y luego las divide verticalmente.
 */
function executeStrictGuillotine(
  parts: PartToCut[], 
  w: number, 
  h: number, 
  kerf: number,
  partColors: Record<string, string>
): OptimizedPanel[] {
  const panels: OptimizedPanel[] = [];
  let remainingParts = [...parts];

  while (remainingParts.length > 0) {
    const placedParts: OptimizedPart[] = [];
    let currentY = 0;
    let placedInThisPanel = new Set<number>();

    // Mientras quepa otra franja en el tablero
    while (currentY < h && remainingParts.length > 0) {
      let bestPartForStripIdx = -1;
      let rotated = false;

      // Buscamos la primera pieza que defina la altura de la franja
      for (let i = 0; i < remainingParts.length; i++) {
        if (placedInThisPanel.has(i)) continue;
        const p = remainingParts[i];
        
        if (p.width <= w && p.height <= (h - currentY)) {
          bestPartForStripIdx = i;
          rotated = false;
          break;
        }
        if (p.grainDirection === 'libre' && p.height <= w && p.width <= (h - currentY)) {
          bestPartForStripIdx = i;
          rotated = true;
          break;
        }
      }

      if (bestPartForStripIdx === -1) break;

      const firstPart = remainingParts[bestPartForStripIdx];
      const stripH = rotated ? firstPart.width : firstPart.height;
      let currentX = 0;

      // Llenamos la franja horizontalmente
      for (let i = 0; i < remainingParts.length; i++) {
        if (placedInThisPanel.has(i)) continue;
        const p = remainingParts[i];

        // Intentar meter en la franja actual (misma altura o menor)
        const canFitNormal = p.width <= (w - currentX) && p.height <= stripH;
        const canFitRotated = p.grainDirection === 'libre' && p.height <= (w - currentX) && p.width <= stripH;

        if (canFitNormal || canFitRotated) {
          // Priorizamos la orientación que mejor se ajuste a la altura de la franja
          const useRotated = canFitRotated && (!canFitNormal || Math.abs(p.width - stripH) < Math.abs(p.height - stripH));
          
          const finalW = useRotated ? p.height : p.width;
          const finalH = useRotated ? p.width : p.height;

          placedParts.push({
            name: p.name,
            x: currentX,
            y: currentY,
            width: finalW,
            height: finalH,
            rotated: useRotated,
            color: partColors[p.name]
          });

          currentX += finalW + kerf;
          placedInThisPanel.add(i);
        }
      }

      currentY += stripH + kerf;
    }

    if (placedInThisPanel.size === 0) break;

    const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
    panels.push({
      panelNumber: panels.length + 1,
      parts: placedParts,
      efficiency: (usedArea / (w * h)) * 100,
      usedArea,
      totalArea: w * h
    });

    remainingParts = remainingParts.filter((_, idx) => !placedInThisPanel.has(idx));
  }

  return panels;
}

function calculateScore(layouts: OptimizedPanel[]): number {
  if (layouts.length === 0) return -Infinity;
  // Penalizamos usar más tableros y premiamos la eficiencia del primero
  const mainEfficiency = layouts[0].efficiency;
  const panelPenalty = (layouts.length - 1) * 200;
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
