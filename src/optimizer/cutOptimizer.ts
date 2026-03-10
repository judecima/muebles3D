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
  
  // 1. Preprocesamiento: Expandir cantidades
  const flatParts: PartToCut[] = filteredParts.flatMap(p => 
    Array.from({ length: p.quantity }, () => ({
      name: p.name,
      width: p.width,
      height: p.height,
      grainDirection: p.grainDirection,
      thickness: p.thickness
    }))
  );

  // Orden inicial Industrial: Área -> Lado Mayor -> Lado Menor
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

  // META-HEURÍSTICA: Búsqueda Industrial
  const ITERATIONS = 10000; 
  let bestScore = Infinity;
  let bestLayouts: OptimizedPanel[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const currentPartsOrder = [...flatParts];
    
    // Mutaciones industriales para exploración del espacio de soluciones
    if (i > 0) {
      if (i % 10 === 0) {
        shuffle(currentPartsOrder); // Reordenamiento total
      } else {
        mutateOrder(currentPartsOrder); // Pequeño ajuste
      }
    }

    const currentLayouts = executeLayoutBuilding(currentPartsOrder, usableW, usableH, kerf, partColors);
    const score = calculateIndustrialScore(currentLayouts, usableW, usableH);

    if (score < bestScore) {
      bestScore = score;
      bestLayouts = JSON.parse(JSON.stringify(currentLayouts));
    }
    
    // Si logramos consolidar todo en un solo panel con eficiencia extrema, terminamos
    if (bestLayouts.length === 1 && (calculateTotalEfficiency(bestLayouts) > 96.0)) break;
  }

  const finalEfficiency = calculateTotalEfficiency(bestLayouts);

  return {
    optimizedLayout: bestLayouts,
    totalPanels: bestLayouts.length,
    totalEfficiency: finalEfficiency,
    summary: `ArquiMax v9.0: Consolidación Industrial completada. Eficiencia: ${finalEfficiency.toFixed(2)}%. Todas las piezas agrupadas según lógica de Guillotina en ${bestLayouts.length} panel(es).`,
    kerf,
    trim,
    selectedThickness
  };
}

/**
 * Construcción de Layout Jerárquico: Filas (Shelves) -> Columnas (Stacks) -> Pilas (V-Stacks)
 */
function executeLayoutBuilding(parts: PartToCut[], w: number, h: number, kerf: number, partColors: Record<string, string>): OptimizedPanel[] {
  const panels: OptimizedPanel[] = [];
  let remainingParts = [...parts];

  while (remainingParts.length > 0) {
    const placedParts: OptimizedPart[] = [];
    const usedIndices = new Set<number>();
    const holes: Hole[] = [];
    
    let currentY = 0;
    
    // 1. Crear Filas (Shelves)
    while (currentY < h && usedIndices.size < remainingParts.length) {
      let leaderIdx = -1;
      let shelfH = 0;

      // Buscar pieza más alta para liderar la fila (estilo Lepton)
      for (let i = 0; i < remainingParts.length; i++) {
        if (usedIndices.has(i)) continue;
        const p = remainingParts[i];
        
        // Intentar orientaciones para el líder
        const canNormal = p.height <= (h - currentY) && p.width <= w;
        const canRotated = p.grainDirection === 'libre' && p.width <= (h - currentY) && p.height <= w;

        if (canNormal || canRotated) {
          leaderIdx = i;
          // Decidir orientación del líder para maximizar espacio
          if (canNormal && canRotated) {
            // Preferir que el lado más corto sea la altura de la franja para ahorrar vertical
            if (p.width < p.height) {
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
      // 2. Rellenar Fila con Columnas (Stacks)
      while (currentX < w) {
        let bestColumnIndices: number[] = [];
        let colW = 0;

        for (let i = 0; i < remainingParts.length; i++) {
          if (usedIndices.has(i)) continue;
          const p = remainingParts[i];
          
          const fitsNormal = p.width <= (w - currentX) && p.height <= shelfH;
          const fitsRotated = p.grainDirection === 'libre' && p.height <= (w - currentX) && p.width <= shelfH;

          if (fitsNormal || fitsRotated) {
            // Orientación: minimizar ancho de columna
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

            // 3. APILAMIENTO VERTICAL (V-Stacking)
            let remH = shelfH - remainingParts[i].height - kerf;
            let currentStackY = remainingParts[i].height + kerf;

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
            
            // Registrar hueco al final del stack si sobra altura
            if (remH > kerf) {
              holes.push({ x: currentX, y: currentY + (shelfH - remH), w: colW, h: remH });
            }

            break;
          }
        }

        if (bestColumnIndices.length === 0) break;

        // Posicionar piezas
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
      
      // Hueco al final de la fila (Derecha)
      if (currentX < w) {
        holes.push({ x: currentX, y: currentY, w: w - currentX, h: shelfH });
      }

      currentY += shelfH + kerf;
    }

    // 4. RELLENO DE HUECOS (Hole Filling)
    const unplacedIndices = Array.from({ length: remainingParts.length }, (_, k) => k).filter(k => !usedIndices.has(k));
    
    for (const hole of holes) {
      if (hole.w < 50 || hole.h < 50) continue; 
      
      for (let i = 0; i < unplacedIndices.length; i++) {
        const idx = unplacedIndices[i];
        if (usedIndices.has(idx)) continue;
        const p = remainingParts[idx];

        const canHoleNormal = p.width <= hole.w && p.height <= hole.h;
        const canHoleRotated = p.grainDirection === 'libre' && p.height <= hole.w && p.width <= hole.h;

        if (canHoleNormal || canHoleRotated) {
          let finalW = p.width;
          let finalH = p.height;
          if (canHoleRotated && !canHoleNormal) {
            finalW = p.height;
            finalH = p.width;
          }

          placedParts.push({
            name: p.name,
            x: hole.x,
            y: hole.y,
            width: finalW,
            height: finalH,
            rotated: canHoleRotated && !canHoleNormal,
            color: partColors[p.name]
          });
          
          usedIndices.add(idx);
          hole.y += finalH + kerf;
          hole.h -= (finalH + kerf);
          if (hole.h < 0) break;
        }
      }
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
    
    if (panels.length > 20) break; // Límite de seguridad
  }
  return panels;
}

/**
 * Score Industrial: penaliza desperdicio, fragmentación y número de paneles.
 */
function calculateIndustrialScore(layouts: OptimizedPanel[], w: number, h: number): number {
  if (layouts.length === 0) return Infinity;

  const totalUsedArea = layouts.reduce((acc, l) => acc + l.usedArea, 0);
  const totalAvailableArea = layouts.length * w * h;
  const waste = totalAvailableArea - totalUsedArea;
  
  // Penalizar fuertemente tener más de un panel si el área total de piezas cabe en uno
  const panelPenalty = (layouts.length - 1) * 1000000;

  // Fragmentación: penalizar layouts que dejan piezas muy esparcidas
  const fragmentation = layouts.length * 500; 

  const totalParts = layouts.reduce((acc, l) => acc + l.parts.length, 0);
  const cutComplexity = totalParts * 10;

  return waste + panelPenalty + fragmentation + cutComplexity;
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
    colors[name] = `hsla(${(i * 137.5) % 360}, 75%, 55%, 0.35)`;
  });
  return colors;
}
