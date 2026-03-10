import { GrainDirection, OptimizationResult, OptimizedPanel, OptimizedPart } from '@/lib/types';

interface PartToCut {
  name: string;
  width: number;
  height: number;
  grainDirection: GrainDirection;
  thickness: number;
}

/**
 * ArquiMax Deep Engine v6.0
 * Enfocado en eficiencia máxima mediante Guillotine Strip Packing con apilamiento vertical.
 * Sin sesgos de medio panel ni restricciones comerciales.
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

  const ITERATIONS = 1000;
  let bestEfficiency = -1;
  let bestLayouts: OptimizedPanel[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const currentParts = [...flatParts];
    if (i > 0) shuffle(currentParts);
    else currentParts.sort((a, b) => (b.width * b.height) - (a.width * a.height));

    const currentLayouts = executeGuillotineShelf(currentParts, usableW, usableH, kerf, partColors);
    const efficiency = calculateTotalEfficiency(currentLayouts);

    if (efficiency > bestEfficiency) {
      bestEfficiency = efficiency;
      bestLayouts = JSON.parse(JSON.stringify(currentLayouts));
    }
  }

  return {
    optimizedLayout: bestLayouts,
    totalPanels: bestLayouts.length,
    totalEfficiency: bestEfficiency,
    summary: `ArquiMax v6.0: Eficiencia ${bestEfficiency.toFixed(2)}% lograda mediante empaquetado por franjas horizontales.`,
    kerf,
    trim,
    selectedThickness
  };
}

/**
 * Algoritmo de Franjas con Apilamiento Vertical (H-V-H)
 */
function executeGuillotineShelf(parts: PartToCut[], w: number, h: number, kerf: number, partColors: Record<string, string>): OptimizedPanel[] {
  const panels: OptimizedPanel[] = [];
  let remainingParts = [...parts];

  while (remainingParts.length > 0) {
    const placedParts: OptimizedPart[] = [];
    const placedInThisPanel = new Set<number>();
    
    let currentY = 0;
    while (currentY < h && remainingParts.length > 0) {
      // Líder de la franja (la pieza más alta disponible)
      let leaderIdx = -1;
      for (let i = 0; i < remainingParts.length; i++) {
        if (placedInThisPanel.has(i)) continue;
        if (remainingParts[i].height <= (h - currentY) && remainingParts[i].width <= w) {
          leaderIdx = i; break;
        }
      }
      if (leaderIdx === -1) break;

      const shelfH = remainingParts[leaderIdx].height;
      let currentX = 0;

      while (currentX < w && remainingParts.length > 0) {
        let bestStack: number[] = [];
        let stackW = 0;
        
        // Buscar una pieza o columna de piezas para la franja
        for (let i = 0; i < remainingParts.length; i++) {
          if (placedInThisPanel.has(i)) continue;
          const p = remainingParts[i];
          if (p.width <= (w - currentX) && p.height <= shelfH) {
             bestStack = [i];
             stackW = p.width;
             
             // Intentar apilar verticalmente piezas más pequeñas en la misma columna
             let remainingH = shelfH - p.height - kerf;
             for(let j = i + 1; j < remainingParts.length; j++) {
               if (placedInThisPanel.has(j) || j === i) continue;
               const p2 = remainingParts[j];
               if (p2.width <= stackW && p2.height <= remainingH) {
                 bestStack.push(j);
                 remainingH -= (p2.height + kerf);
               }
             }
             break;
          }
        }

        if (bestStack.length === 0) break;

        let stackY = 0;
        bestStack.forEach(idx => {
          const p = remainingParts[idx];
          placedParts.push({
            name: p.name,
            x: currentX,
            y: currentY + stackY,
            width: p.width,
            height: p.height,
            rotated: false,
            color: partColors[p.name]
          });
          stackY += p.height + kerf;
          placedInThisPanel.add(idx);
        });
        currentX += stackW + kerf;
      }
      currentY += shelfH + kerf;
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
