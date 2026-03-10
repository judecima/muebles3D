import { GrainDirection, OptimizationResult, OptimizedPanel, OptimizedPart } from '@/lib/types';

interface PartToCut {
  name: string;
  width: number;
  height: number;
  grainDirection: GrainDirection;
  thickness: number;
}

/**
 * ArquiMax Ultra-Industrial v9.2
 * Algoritmo de Guillotina Jerárquica con estrategia "Best-Height-Fit" para columnas.
 * Maximiza el aprovechamiento vertical de cada franja (shelf) para igualar a Lepton.
 * Implementa una búsqueda estocástica masiva de 20,000 iteraciones para consolidar el pedido.
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

  const ITERATIONS = 20000; 
  let bestScore = Infinity;
  let bestLayouts: OptimizedPanel[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const currentPartsOrder = [...flatParts];
    
    // Mutaciones estocásticas de orden y rotación
    if (i > 0) {
      if (i % 100 === 0) {
        shuffle(currentPartsOrder);
      } else {
        mutateOrder(currentPartsOrder);
      }
      
      currentPartsOrder.forEach(p => {
        if (p.grainDirection === 'libre' && Math.random() > 0.5) {
          [p.width, p.height] = [p.height, p.width];
        }
      });
    } else {
      // Primera iteración: Orden industrial clásico (Área Descendente)
      currentPartsOrder.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    }

    const currentLayouts = executeLayoutBuilding(currentPartsOrder, usableW, usableH, kerf, partColors);
    const score = calculateIndustrialScore(currentLayouts, usableW, usableH);

    if (score < bestScore) {
      bestScore = score;
      bestLayouts = JSON.parse(JSON.stringify(currentLayouts));
    }
    
    // Meta industrial: Consolidación en 1 panel con eficiencia extrema
    if (bestLayouts.length === 1 && calculateTotalEfficiency(bestLayouts) > 96.4) break;
  }

  const finalEfficiency = calculateTotalEfficiency(bestLayouts);

  return {
    optimizedLayout: bestLayouts,
    totalPanels: bestLayouts.length,
    totalEfficiency: finalEfficiency,
    summary: `ArquiMax v9.2: Eficiencia Industrial ${finalEfficiency.toFixed(2)}%. Consolidación exitosa.`,
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
    
    let currentY = 0;
    
    // Construcción de franjas (Shelves)
    while (currentY < h && usedIndices.size < remainingParts.length) {
      let leaderIdx = -1;
      let shelfH = 0;

      // Líder de franja: La pieza más grande restante que defina la altura
      for (let i = 0; i < remainingParts.length; i++) {
        if (usedIndices.has(i)) continue;
        const p = remainingParts[i];
        if (p.height <= (h - currentY) && p.width <= w) {
          leaderIdx = i;
          shelfH = p.height;
          break;
        }
      }

      if (leaderIdx === -1) break;

      let currentX = 0;
      // Rellenar la franja con columnas dinámicas
      while (currentX < w) {
        let bestColIndices: number[] = [];
        let colW = 0;
        let bestFitScore = -1;
        let chosenLeaderIdx = -1;

        // ESTRATEGIA "BEST-HEIGHT-FIT": Buscar la pieza que mejor aproveche la altura de la franja (shelfH)
        // Esto evita colocar piezas pequeñas (tacos) si hay piezas más altas (amarres) que entran.
        for (let i = 0; i < remainingParts.length; i++) {
          if (usedIndices.has(i)) continue;
          const p = remainingParts[i];
          
          if (p.width <= (w - currentX) && p.height <= shelfH) {
            const fitScore = p.height / shelfH; 
            // Penalizamos ligeramente las piezas que dejan mucho espacio horizontal si hay otras similares
            const horizontalWasteFactor = p.width / (w - currentX);
            const totalScore = fitScore * 0.8 + horizontalWasteFactor * 0.2;

            if (totalScore > bestFitScore) {
              bestFitScore = totalScore;
              chosenLeaderIdx = i;
              colW = p.width;
            }
          }
        }

        if (chosenLeaderIdx === -1) break;

        // Seleccionar líder de columna y marcar como usado
        bestColIndices.push(chosenLeaderIdx);
        usedIndices.add(chosenLeaderIdx);

        // V-STACKING: Rellenar el espacio vertical sobrante en esta columna
        let remH = shelfH - remainingParts[chosenLeaderIdx].height - kerf;
        while (remH > 0) {
          let bestSubIdx = -1;
          let bestSubFit = -1;

          for (let j = 0; j < remainingParts.length; j++) {
            if (usedIndices.has(j)) continue;
            const p2 = remainingParts[j];
            if (p2.width <= colW && p2.height <= remH) {
              const subFit = p2.height / remH;
              if (subFit > bestSubFit) {
                bestSubFit = subFit;
                bestSubIdx = j;
              }
            }
          }

          if (bestSubIdx !== -1) {
            bestColIndices.push(bestSubIdx);
            usedIndices.add(bestSubIdx);
            remH -= (remainingParts[bestSubIdx].height + kerf);
          } else break;
        }

        // Registrar las piezas en el layout
        let yOffset = 0;
        bestColIndices.forEach(idx => {
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
    
    panels.push({
      panelNumber: panels.length + 1,
      parts: placedParts,
      efficiency: (placedParts.reduce((acc, p) => acc + (p.width * p.height), 0) / (w * h)) * 100,
      usedArea: placedParts.reduce((acc, p) => acc + (p.width * p.height), 0),
      totalArea: w * h
    });
    
    remainingParts = remainingParts.filter((_, idx) => !usedIndices.has(idx));
    if (panels.length > 20) break;
  }
  return panels;
}

function calculateIndustrialScore(layouts: OptimizedPanel[], w: number, h: number): number {
  if (layouts.length === 0) return Infinity;
  const totalUsedArea = layouts.reduce((acc, l) => acc + l.usedArea, 0);
  const totalAvailableArea = layouts.length * w * h;
  const waste = totalAvailableArea - totalUsedArea;
  
  // Penalización masiva por panel extra para forzar consolidación
  const panelPenalty = (layouts.length - 1) * 1000000000;
  // Penalización por fragmentación
  const fragmentation = layouts.length * 100000; 
  
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
    colors[name] = `hsla(${(i * 137.5) % 360}, 70%, 55%, 0.3)`;
  });
  return colors;
}
