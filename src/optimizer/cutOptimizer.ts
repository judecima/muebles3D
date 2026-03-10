import { GrainDirection, OptimizationResult, OptimizedPanel, OptimizedPart } from '@/lib/types';

interface PartToCut {
  name: string;
  width: number;
  height: number;
  grainDirection: GrainDirection;
  thickness: number;
}

/**
 * ArquiMax Deep Engine v6.0 Ultra Pro
 * Algoritmo de Guillotina de 3 Etapas (Shelf-Packing con Apilamiento Vertical y Minimización de Ancho).
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

  // Ejecutamos una búsqueda intensiva con 5000 iteraciones
  const ITERATIONS = 5000; 
  let bestEfficiency = -1;
  let bestLayouts: OptimizedPanel[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const currentParts = JSON.parse(JSON.stringify(flatParts)) as PartToCut[];
    
    // Variamos criterios de ordenamiento para encontrar el layout líder
    if (i === 0) {
      currentParts.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    } else if (i === 1) {
      currentParts.sort((a, b) => b.height - a.height);
    } else {
      shuffle(currentParts);
    }

    const currentLayouts = executeGuillotineShelf(currentParts, usableW, usableH, kerf, partColors);
    const efficiency = calculateTotalEfficiency(currentLayouts);

    if (efficiency > bestEfficiency) {
      bestEfficiency = efficiency;
      bestLayouts = JSON.parse(JSON.stringify(currentLayouts));
    }
    
    // Si consolidamos en un solo tablero con alta eficiencia (>95%), detenemos la búsqueda
    if (bestLayouts.length === 1 && bestEfficiency > 95) break;
  }

  return {
    optimizedLayout: bestLayouts,
    totalPanels: bestLayouts.length,
    totalEfficiency: bestEfficiency,
    summary: `ArquiMax v6.0 Ultra Pro: Eficiencia Industrial del ${bestEfficiency.toFixed(2)}% alcanzada.`,
    kerf,
    trim,
    selectedThickness
  };
}

function executeGuillotineShelf(parts: PartToCut[], w: number, h: number, kerf: number, partColors: Record<string, string>): OptimizedPanel[] {
  const panels: OptimizedPanel[] = [];
  let remainingParts = JSON.parse(JSON.stringify(parts)) as PartToCut[];

  while (remainingParts.length > 0) {
    const placedParts: OptimizedPart[] = [];
    const usedInPanelIndices = new Set<number>();
    
    let currentY = 0;
    
    while (currentY < h && usedInPanelIndices.size < remainingParts.length) {
      // 1. Determinar el líder de la franja (Shelf)
      let leaderIdx = -1;
      let shelfH = 0;

      for (let i = 0; i < remainingParts.length; i++) {
        if (usedInPanelIndices.has(i)) continue;
        const p = remainingParts[i];
        
        // El líder define la altura de la tira de corte
        if (p.height <= (h - currentY) && p.width <= w) {
          leaderIdx = i;
          shelfH = p.height;
          break;
        }
        
        if (p.grainDirection === 'libre' && p.width <= (h - currentY) && p.height <= w) {
          leaderIdx = i;
          shelfH = p.width;
          [remainingParts[i].width, remainingParts[i].height] = [remainingParts[i].height, remainingParts[i].width];
          break;
        }
      }

      if (leaderIdx === -1) break;

      let currentX = 0;
      while (currentX < w) {
        let bestColumnIndices: number[] = [];
        let colW = 0;

        // 2. Buscar piezas para llenar la columna verticalmente (V-Stack)
        // Buscamos una pieza líder de columna que minimice el ancho consumido en la franja
        let columnLeaderIdx = -1;
        let colLeaderRotated = false;

        for (let i = 0; i < remainingParts.length; i++) {
          if (usedInPanelIndices.has(i)) continue;
          const p = remainingParts[i];
          
          let canFitNormal = p.width <= (w - currentX) && p.height <= shelfH;
          let canFitRotated = p.grainDirection === 'libre' && p.height <= (w - currentX) && p.width <= shelfH;

          if (canFitNormal && canFitRotated) {
            // Si caben de ambas formas, elegimos la que use menos ancho (currentX)
            if (p.width <= p.height) {
              columnLeaderIdx = i;
              colLeaderRotated = false;
            } else {
              columnLeaderIdx = i;
              colLeaderRotated = true;
            }
          } else if (canFitNormal) {
            columnLeaderIdx = i;
            colLeaderRotated = false;
          } else if (canFitRotated) {
            columnLeaderIdx = i;
            colLeaderRotated = true;
          }

          if (columnLeaderIdx !== -1) {
            if (colLeaderRotated) {
              [remainingParts[i].width, remainingParts[i].height] = [remainingParts[i].height, remainingParts[i].width];
            }
            bestColumnIndices = [columnLeaderIdx];
            colW = remainingParts[i].width;
            usedInPanelIndices.add(columnLeaderIdx);
            
            // INTENTO DE APILAMIENTO VERTICAL: Llenar el resto del alto de la franja (shelfH)
            let remH = shelfH - remainingParts[i].height - kerf;
            while (remH > 0) {
              let subPieceIdx = -1;
              for (let j = 0; j < remainingParts.length; j++) {
                if (usedInPanelIndices.has(j)) continue;
                const p2 = remainingParts[j];
                
                if (p2.width <= colW && p2.height <= remH) {
                  subPieceIdx = j;
                  break;
                }
                if (p2.grainDirection === 'libre' && p2.height <= colW && p2.width <= remH) {
                  [remainingParts[j].width, remainingParts[j].height] = [remainingParts[j].height, remainingParts[j].width];
                  subPieceIdx = j;
                  break;
                }
              }
              
              if (subPieceIdx !== -1) {
                bestColumnIndices.push(subPieceIdx);
                usedInPanelIndices.add(subPieceIdx);
                remH -= (remainingParts[subPieceIdx].height + kerf);
              } else {
                break; 
              }
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
    
    remainingParts = remainingParts.filter((_, idx) => !usedInPanelIndices.has(idx));
    
    if (usedInPanelIndices.size === 0 && remainingParts.length > 0) break;
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
    colors[name] = `hsla(${(i * 137.5) % 360}, 75%, 50%, 0.45)`;
  });
  return colors;
}