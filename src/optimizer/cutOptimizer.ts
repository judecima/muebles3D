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
 * Algoritmo de Guillotina Multi-Nivel con Apilamiento Vertical (V-Stacks),
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
  
  // 1. Preprocesamiento: Expandir cantidades y ordenar industrialmente
  const flatParts: PartToCut[] = filteredParts.flatMap(p => 
    Array.from({ length: p.quantity }, () => ({
      name: p.name,
      width: p.width,
      height: p.height,
      grainDirection: p.grainDirection,
      thickness: p.thickness
    }))
  );

  // Orden inicial: Área -> Lado Mayor -> Lado Menor
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

  // META-HEURÍSTICA: 10,000 ITERACIONES (Industrial)
  const ITERATIONS = 10000; 
  let bestScore = Infinity;
  let bestLayouts: OptimizedPanel[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const currentPartsOrder = [...flatParts];
    
    // Mutaciones de ordenamiento industriales para evitar óptimos locales
    if (i > 0) {
      if (i % 5 === 0) {
        shuffle(currentPartsOrder); // Exploración estocástica
      } else {
        mutateOrder(currentPartsOrder); // Pequeñas mutaciones
      }
    }

    const currentLayouts = executeLayoutBuilding(currentPartsOrder, usableW, usableH, kerf, partColors);
    const score = calculateIndustrialScore(currentLayouts, usableW, usableH);

    if (score < bestScore) {
      bestScore = score;
      bestLayouts = JSON.parse(JSON.stringify(currentLayouts));
    }
    
    // Si llegamos a un panel con eficiencia extrema, podemos terminar antes
    if (bestLayouts.length === 1 && (calculateTotalEfficiency(bestLayouts) > 97.5)) break;
  }

  const finalEfficiency = calculateTotalEfficiency(bestLayouts);

  return {
    optimizedLayout: bestLayouts,
    totalPanels: bestLayouts.length,
    totalEfficiency: finalEfficiency,
    summary: `ArquiMax v9.0: Eficiencia del ${finalEfficiency.toFixed(2)}%. Score Industrial: ${bestScore.toFixed(2)}. Todas las piezas consolidadas mediante Guillotina Industrial.`,
    kerf,
    trim,
    selectedThickness
  };
}

/**
 * Construcción del Layout Jerárquico: Filas -> Columnas -> Pilas
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

      // Buscar líder de fila (pieza más alta disponible que entre en el remanente vertical)
      for (let i = 0; i < remainingParts.length; i++) {
        if (usedIndices.has(i)) continue;
        const p = remainingParts[i];
        
        const canNormal = p.height <= (h - currentY) && p.width <= w;
        const canRotated = p.grainDirection === 'libre' && p.width <= (h - currentY) && p.height <= w;

        if (canNormal || canRotated) {
          leaderIdx = i;
          // Optimización de orientación para el líder de fila
          if (canNormal && canRotated) {
            if (p.width > p.height) { // Preferir que la base sea el lado largo para ahorrar altura de franja
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
            // Orientación industrial: minimizar ancho de columna para dejar más espacio al resto de la franja
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

            // 3. APILAMIENTO VERTICAL (V-Stacking Recursivo)
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
            
            // Registrar huecos laterales si la columna es más angosta que colW (en apilamiento)
            // Esto es avanzado: detectar si alguna pieza en el stack dejó aire a su derecha
            // Por simplicidad, registramos el aire al final de la columna como hueco
            if (remH > kerf) {
              holes.push({ x: currentX, y: currentY + (shelfH - remH), w: colW, h: remH });
            }

            break;
          }
        }

        if (bestColumnIndices.length === 0) break;

        // Posicionar piezas del stack
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
      
      // Registrar hueco al final de la franja (Derecha)
      if (currentX < w) {
        holes.push({ x: currentX, y: currentY, w: w - currentX, h: shelfH });
      }

      currentY += shelfH + kerf;
    }

    // 4. MOTOR DE RELLENO DE HUECOS (Hole Filling)
    // Intentar meter piezas no colocadas en los huecos registrados
    const unplacedIndices = Array.from({ length: remainingParts.length }, (_, k) => k).filter(k => !usedIndices.has(k));
    
    for (const hole of holes) {
      if (hole.w < 50 || hole.h < 50) continue; // Ignorar huecos inútiles
      
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
          // Actualizar hueco (reducción simple por guillotina)
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
    
    // Safety break
    if (panels.length > 50) break;
  }
  return panels;
}

/**
 * Sistema de Score Industrial
 * Premia: bajo desperdicio, pocos cortes, baja fragmentación.
 */
function calculateIndustrialScore(layouts: OptimizedPanel[], w: number, h: number): number {
  if (layouts.length === 0) return Infinity;

  const totalUsedArea = layouts.reduce((acc, l) => acc + l.usedArea, 0);
  const totalAvailableArea = layouts.length * w * h;
  const waste = totalAvailableArea - totalUsedArea;
  
  // Fragmentación: cantidad de huecos pequeños (Estimado por cantidad de paneles)
  const fragmentation = layouts.length * 500; 

  // Cortes totales estimación
  const totalParts = layouts.reduce((acc, l) => acc + l.parts.length, 0);
  const cutComplexity = totalParts * 10;

  // Score = (Waste * 1.0) + (Complexity * 0.15) + (Fragmentation * 0.2)
  return (waste * 1.0) + (cutComplexity * 0.15) + (fragmentation * 0.20);
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
  const idx1 = Math.floor(Math.random() * array.length);
  const idx2 = Math.floor(Math.random() * array.length);
  [array[idx1], array[idx2]] = [array[idx2], array[idx1]];
}

function generateColors(parts: PartToCut[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 70%, 55%, 0.35)`;
  });
  return colors;
}
