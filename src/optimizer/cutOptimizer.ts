import { GrainDirection, OptimizationResult, OptimizedPanel, OptimizedPart } from '@/lib/types';

interface PartToCut {
  name: string;
  width: number;
  height: number;
  grainDirection: GrainDirection;
  thickness: number;
}

/**
 * ArquiMax Deep Engine v6.0 Pro
 * Algoritmo de Guillotina de 3 Etapas (Shelf-Packing con Apilamiento Vertical Agresivo).
 * Optimizado para maximizar la densidad en paneles industriales (2750x1830).
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

  // Aumentamos a 3000 iteraciones para búsqueda exhaustiva de combinaciones de apilamiento
  const ITERATIONS = 3000; 
  let bestEfficiency = -1;
  let bestLayouts: OptimizedPanel[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const currentParts = [...flatParts];
    
    // Variamos el ordenamiento en cada iteración para explorar el espacio de soluciones
    if (i === 0) {
      currentParts.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    } else if (i === 1) {
      currentParts.sort((a, b) => b.height - a.height);
    } else if (i === 2) {
      currentParts.sort((a, b) => b.width - a.width);
    } else {
      shuffle(currentParts);
    }

    const currentLayouts = executeGuillotineShelf(currentParts, usableW, usableH, kerf, partColors);
    const efficiency = calculateTotalEfficiency(currentLayouts);

    if (efficiency > bestEfficiency) {
      bestEfficiency = efficiency;
      bestLayouts = JSON.parse(JSON.stringify(currentLayouts));
    }
    
    // Meta de excelencia industrial alcanzada
    if (bestEfficiency > 96.5) break;
  }

  return {
    optimizedLayout: bestLayouts,
    totalPanels: bestLayouts.length,
    totalEfficiency: bestEfficiency,
    summary: `ArquiMax v6.0 Pro: Eficiencia del ${bestEfficiency.toFixed(2)}% alcanzada mediante apilamiento vertical dinámico.`,
    kerf,
    trim,
    selectedThickness
  };
}

/**
 * Algoritmo de Empaquetado por Estantes (Shelf-Packing) con búsqueda de Mejor Ajuste Vertical Exhaustivo.
 * Implementa una tercera etapa de guillotina que permite apilar piezas pequeñas una sobre otra.
 */
function executeGuillotineShelf(parts: PartToCut[], w: number, h: number, kerf: number, partColors: Record<string, string>): OptimizedPanel[] {
  const panels: OptimizedPanel[] = [];
  let remainingParts = JSON.parse(JSON.stringify(parts)) as PartToCut[];

  while (remainingParts.length > 0) {
    const placedParts: OptimizedPart[] = [];
    const usedInPanel = new Set<number>();
    
    let currentY = 0;
    
    while (currentY < h && usedInPanel.size < remainingParts.length) {
      // 1. Determinar el líder de la franja (la pieza más alta que quepa en el ancho útil)
      let leaderIdx = -1;
      let shelfH = 0;

      for (let i = 0; i < remainingParts.length; i++) {
        if (usedInPanel.has(i)) continue;
        const p = remainingParts[i];
        
        // Intentar orientaciones para definir la altura de la franja (líder)
        if (p.height <= (h - currentY) && p.width <= w) {
          leaderIdx = i;
          shelfH = p.height;
          break;
        }
        
        if (p.grainDirection === 'libre' && p.width <= (h - currentY) && p.height <= w) {
          leaderIdx = i;
          shelfH = p.width;
          // Rotación temporal del líder
          [remainingParts[i].width, remainingParts[i].height] = [remainingParts[i].height, remainingParts[i].width];
          break;
        }
      }

      if (leaderIdx === -1) break;

      let currentX = 0;
      while (currentX < w) {
        let bestColumn: number[] = [];
        let colW = 0;

        // 2. Buscar piezas para llenar la columna verticalmente (Etapa 3 de Guillotina)
        // Buscamos la primera pieza que define el ancho de la columna (Stack Leader)
        for (let i = 0; i < remainingParts.length; i++) {
          if (usedInPanel.has(i)) continue;
          const p = remainingParts[i];
          
          if (p.width <= (w - currentX) && p.height <= shelfH) {
            bestColumn = [i];
            colW = p.width;
            usedInPanel.add(i);
            
            // INTENTO DE APILAMIENTO AGRESIVO: Llenar el resto del alto de la franja (shelfH)
            let remH = shelfH - p.height - kerf;
            while (remH > 0) {
              let subPieceIdx = -1;
              for (let j = 0; j < remainingParts.length; j++) {
                if (usedInPanel.has(j)) continue;
                const p2 = remainingParts[j];
                
                // Debe caber en el ancho definido por la columna y en el alto restante de la franja
                if (p2.width <= colW && p2.height <= remH) {
                  subPieceIdx = j;
                  break;
                }
                // Si es libre, intentar rotarla para que quepa en el ancho de columna
                if (p2.grainDirection === 'libre' && p2.height <= colW && p2.width <= remH) {
                  [remainingParts[j].width, remainingParts[j].height] = [remainingParts[j].height, remainingParts[j].width];
                  subPieceIdx = j;
                  break;
                }
              }
              
              if (subPieceIdx !== -1) {
                bestColumn.push(subPieceIdx);
                usedInPanel.add(subPieceIdx);
                remH -= (remainingParts[subPieceIdx].height + kerf);
              } else {
                break; 
              }
            }
            break;
          }
        }

        if (bestColumn.length === 0) break;

        // Registrar las piezas apiladas en la columna
        let yOffset = 0;
        bestColumn.forEach(idx => {
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
    
    remainingParts = remainingParts.filter((_, idx) => !usedInPanel.has(idx));
    
    // Failsafe para evitar bucles si hay piezas imposibles
    if (usedInPanel.size === 0 && remainingParts.length > 0) break;
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
    colors[name] = `hsla(${(i * 137.5) % 360}, 75%, 55%, 0.35)`;
  });
  return colors;
}
