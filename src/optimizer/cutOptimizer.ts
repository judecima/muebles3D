import { GrainDirection, OptimizationResult, OptimizedPanel, OptimizedPart } from '@/lib/types';

interface PartToCut {
  name: string;
  width: number;
  height: number;
  grainDirection: GrainDirection;
  thickness: number;
}

interface Hole {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * ArquiMax Ultra-Industrial v9.0
 * Algoritmo de Guillotina Multi-Nivel con Apilamiento Vertical (V-Stacking),
 * Relleno de Huecos Estocástico y Sistema de Score Industrial.
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

  // Orden inicial Industrial
  flatParts.sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    if (areaA !== areaB) return areaB - areaA;
    return Math.max(b.width, b.height) - Math.max(a.width, a.height);
  });

  if (flatParts.length === 0) {
    return { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Sin piezas", kerf, trim, selectedThickness };
  }

  const usableW = Math.max(0, panelWidth - (trim * 2));
  const usableH = Math.max(0, panelHeight - (trim * 2));
  const partColors = generateColors(flatParts);

  const ITERATIONS = 15000; 
  let bestScore = Infinity;
  let bestLayouts: OptimizedPanel[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const currentPartsOrder = [...flatParts];
    
    if (i > 0) {
      if (i % 20 === 0) {
        shuffle(currentPartsOrder);
      } else {
        mutateOrder(currentPartsOrder);
      }
    }

    const currentLayouts = executeLayoutBuilding(currentPartsOrder, usableW, usableH, kerf, partColors);
    const score = calculateIndustrialScore(currentLayouts, usableW, usableH);

    if (score < bestScore) {
      bestScore = score;
      bestLayouts = JSON.parse(JSON.stringify(currentLayouts));
    }
    
    if (bestLayouts.length === 1 && (calculateTotalEfficiency(bestLayouts) > 96.5)) break;
  }

  const finalEfficiency = calculateTotalEfficiency(bestLayouts);

  return {
    optimizedLayout: bestLayouts,
    totalPanels: bestLayouts.length,
    totalEfficiency: finalEfficiency,
    summary: `ArquiMax v9.0: Eficiencia Industrial ${finalEfficiency.toFixed(2)}%. Consolidación en ${bestLayouts.length} panel(es).`,
    kerf,
    trim,
    selectedThickness
  };
}

function executeLayoutBuilding(parts: PartToCut[], w: number, h: number, kerf: number, partColors: Record<string, string>): OptimizedPanel[] {
  const panels: OptimizedPanel[] = [];
  let remainingParts = [...parts];

  while (remainingParts.length > 0) {
    const placedParts: OptimizedPart[] = [];
    const usedIndices = new Set<number>();
    const holes: Hole[] = [];
    
    let currentY = 0;
    
    while (currentY < h && usedIndices.size < remainingParts.length) {
      let leaderIdx = -1;
      let shelfH = 0;

      for (let i = 0; i < remainingParts.length; i++) {
        if (usedIndices.has(i)) continue;
        const p = remainingParts[i];
        
        const canNormal = p.height <= (h - currentY) && p.width <= w;
        const canRotated = p.grainDirection === 'libre' && p.width <= (h - currentY) && p.height <= w;

        if (canNormal || canRotated) {
          leaderIdx = i;
          if (canNormal && canRotated) {
            if (p.width > p.height) {
               [remainingParts[i].width, remainingParts[i].height] = [remainingParts[i].height, remainingParts[i].width];
            }
          } else if (canRotated) {
            [remainingParts[i].width, remainingParts[i].height] = [remainingParts[i].height, remainingParts[i].width];
          }
          shelfH = remainingParts[i].height;
          break;
        }
      }

      if (leaderIdx === -1) break;

      let currentX = 0;
      while (currentX < w) {
        let bestColumnIndices: number[] = [];
        let colW = 0;

        for (let i = 0; i < remainingParts.length; i++) {
          if (usedIndices.has(i)) continue;
          const p = remainingParts[i];
          
          const fitsNormal = p.width <= (w - currentX) && p.height <= shelfH;
          const fitsRotated = p.grainDirection === 'libre' && p.height <= (w - currentX) && p.width <= shelfH;

          if (fitsNormal || fitsRotated) {
            if (fitsNormal && fitsRotated) {
              if (p.width > p.height) {
                [remainingParts[i].width, remainingParts[i].height] = [remainingParts[i].height, remainingParts[i].width];
              }
            } else if (fitsRotated) {
              [remainingParts[i].width, remainingParts[i].height] = [remainingParts[i].height, remainingParts[i].width];
            }

            bestColumnIndices = [i];
            colW = remainingParts[i].width;
            usedIndices.add(i);

            let remH = shelfH - remainingParts[i].height - kerf;
            while (remH > 0) {
              let subIdx = -1;
              for (let j = 0; j < remainingParts.length; j++) {
                if (usedIndices.has(j)) continue;
                const p2 = remainingParts[j];
                
                const sFitsNormal = p2.width <= colW && p2.height <= remH;
                const sFitsRotated = p2.grainDirection === 'libre' && p2.height <= colW && p2.width <= remH;

                if (sFitsNormal || sFitsRotated) {
                  if (sFitsRotated && !sFitsNormal) {
                    [remainingParts[j].width, remainingParts[j].height] = [remainingParts[j].height, remainingParts[j].width];
                  }
                  subIdx = j;
                  break;
                }
              }

              if (subIdx !== -1) {
                bestColumnIndices.push(subIdx);
                usedIndices.add(subIdx);
                remH -= (remainingParts[subIdx].height + kerf);
              } else break;
            }
            break;
          }
        }

        if (bestColumnIndices.length === 0) break;

        let yOffset = 0;
        bestColumnIndices.forEach(idx => {
          const p = remainingParts[idx];
          placedParts.push({
            name: p.name,
            x: currentX,
            y: currentY + yOffset,
            width: p.width,
            height: p.height,
            rotated: false,
            color: partColors[p.name]
          });
          yOffset += p.height + kerf;
        });

        currentX += colW + kerf;
      }
      currentY += shelfH + kerf;
    }

    if (placedParts.length === 0) break;
    
    const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
    panels.push({
      panelNumber: panels.length + 1,
      parts: placedParts,
      efficiency: (usedArea / (w * h)) * 100,
      usedArea,
      totalArea: w * h
    });
    
    remainingParts = remainingParts.filter((_, idx) => !usedIndices.has(idx));
    if (panels.length > 15) break;
  }
  return panels;
}

function calculateIndustrialScore(layouts: OptimizedPanel[], w: number, h: number): number {
  if (layouts.length === 0) return Infinity;
  const totalUsedArea = layouts.reduce((acc, l) => acc + l.usedArea, 0);
  const totalAvailableArea = layouts.length * w * h;
  const waste = totalAvailableArea - totalUsedArea;
  const panelPenalty = (layouts.length - 1) * 5000000;
  const fragmentation = layouts.length * 1000; 
  return waste + panelPenalty + fragmentation;
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

function mutateOrder(array: any[]) {
  if (array.length < 2) return;
  const idx1 = Math.floor(Math.random() * array.length);
  const idx2 = Math.floor(Math.random() * array.length);
  [array[idx1], array[idx2]] = [array[idx2], array[idx1]];
}

function generateColors(parts: PartToCut[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 70%, 50%, 0.3)`;
  });
  return colors;
}
