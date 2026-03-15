import { GrainDirection, OptimizationResult, OptimizedPanel, OptimizedPart } from '../../lib/types';

interface InternalPart {
  name: string;
  width: number;
  height: number;
  grainDirection: GrainDirection;
  thickness: number;
  originalIndex: number;
  placed: boolean;
}

/**
 * JADSI Industrial Engine v17.5 - Waste Reutilization v3
 * 
 * OBJETIVO 1: Minimizar cantidad de paneles.
 * OBJETIVO 2: Maximizar bloques de desperdicio reutilizables (>60mm).
 * ESTRATEGIA: Búsqueda estocástica multi-heurística con scoring de entropía de desperdicio ajustado a piezas mínimas de 60mm.
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
  
  if (filteredParts.length === 0) {
    return { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Sin piezas del espesor seleccionado", kerf, trim, selectedThickness };
  }

  const usableW = Math.max(0, panelWidth - (trim * 2));
  const usableH = Math.max(0, panelHeight - (trim * 2));
  const partColors = generateColors(filteredParts);

  let bestGlobalResult: OptimizationResult | null = null;
  let bestGlobalScore = -Infinity;

  // INTENSIDAD JADSI v17.5
  const iterationsPerStrategy = 120; 
  const masterOrientations = [false, true]; // Horizontal vs Vertical

  for (const isVerticalMaster of masterOrientations) {
    const algoW = isVerticalMaster ? usableH : usableW;
    const algoH = isVerticalMaster ? usableW : usableH;

    for (let iter = 0; iter < iterationsPerStrategy; iter++) {
      const pool: InternalPart[] = filteredParts.flatMap((p, idx) => 
        Array.from({ length: p.quantity }, () => ({
          ...p,
          originalIndex: idx,
          placed: false
        }))
      );

      // MIX DE ESTRATEGIAS DE ORDENAMIENTO
      if (iter === 0) {
        pool.sort((a, b) => b.height - a.height || b.width - a.width);
      } else if (iter === 1) {
        pool.sort((a, b) => (b.width * b.height) - (a.width * a.height));
      } else if (iter === 2) {
        pool.sort((a, b) => b.width - a.width || b.height - a.height);
      } else {
        // Monte Carlo Shuffling
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
      }

      const currentResult = executeNesting(pool, algoW, algoH, kerf, trim, selectedThickness, partColors, panelWidth, panelHeight, isVerticalMaster);
      
      // EVALUACIÓN JERÁRQUICA JADSI v17.5
      const wasteScore = calculateWasteQuality(currentResult, algoW, algoH);
      
      /**
       * SCORE = Prioridad Paneles (Factor 1e15) 
       *         + Eficiencia (Factor 1e10)
       *         + Calidad Desperdicio (Factor 1)
       */
      const score = (1000 / currentResult.totalPanels) * 1e15 + 
                    (currentResult.totalEfficiency * 1e10) + 
                    wasteScore;

      if (!bestGlobalResult || score > bestGlobalScore) {
        bestGlobalResult = currentResult;
        bestGlobalScore = score;
      }
    }
  }

  return bestGlobalResult || { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Error en el motor v17.5", kerf, trim, selectedThickness };
}

function executeNesting(
  pool: InternalPart[], 
  algoW: number, 
  algoH: number, 
  kerf: number, 
  trim: number, 
  selectedThickness: number,
  colors: Record<string, string>,
  panelWidth: number,
  panelHeight: number,
  isVertical: boolean
): OptimizationResult {
  const panels: OptimizedPanel[] = [];
  let workingPool = pool.map(p => ({ ...p }));

  while (workingPool.some(p => !p.placed)) {
    const placedParts: OptimizedPart[] = [];
    let currentY = 0;

    while (currentY < algoH) {
      let leaderIdx = -1;
      let leaderRotated = false;

      for (let i = 0; i < workingPool.length; i++) {
        const p = workingPool[i];
        if (p.placed) continue;
        
        if (p.height <= (algoH - currentY) && p.width <= algoW) {
          leaderIdx = i; leaderRotated = false; break;
        }
        if (p.grainDirection === 'libre' && p.width <= (algoH - currentY) && p.height <= algoW) {
          leaderIdx = i; leaderRotated = true; break;
        }
      }

      if (leaderIdx === -1) break;

      const leader = workingPool[leaderIdx];
      const stripH = leaderRotated ? leader.width : leader.height;
      let currentX = 0;

      while (currentX < algoW) {
        let bestPartIdx = -1;
        let bestPartRotated = false;

        for (let i = 0; i < workingPool.length; i++) {
          const p = workingPool[i];
          if (p.placed) continue;

          if (p.width <= (algoW - currentX) && p.height <= stripH) {
            bestPartIdx = i; bestPartRotated = false; break;
          }
          if (p.grainDirection === 'libre' && p.height <= (algoW - currentX) && p.width <= stripH) {
            bestPartIdx = i; bestPartRotated = true; break;
          }
        }

        if (bestPartIdx === -1) break;

        const p = workingPool[bestPartIdx];
        const pW = bestPartRotated ? p.height : p.width;
        const pH = bestPartRotated ? p.width : p.height;

        let subY = 0;
        while (subY < stripH) {
          let stackPartIdx = -1;
          let stackRotated = false;

          for (let j = 0; j < workingPool.length; j++) {
            const sp = workingPool[j];
            if (sp.placed) continue;

            if (sp.width === pW && sp.height <= (stripH - subY)) {
              stackPartIdx = j; stackRotated = false; break;
            }
            if (sp.grainDirection === 'libre' && sp.height === pW && sp.width <= (stripH - subY)) {
              stackPartIdx = j; stackRotated = true; break;
            }
          }

          if (stackPartIdx === -1) break;

          const sp = workingPool[stackPartIdx];
          const spH = stackRotated ? sp.width : sp.height;

          const absX = currentX;
          const absY = currentY + subY;

          const finalX = isVertical ? absY : absX;
          const finalY = isVertical ? absX : absY;
          const finalW = isVertical ? spH : pW;
          const finalH = isVertical ? pW : spH;

          placedParts.push({
            name: sp.name,
            x: finalX,
            y: finalY,
            width: finalW,
            height: finalH,
            rotated: isVertical ? !stackRotated : stackRotated,
            color: colors[sp.name]
          });

          sp.placed = true;
          subY += spH + kerf;
        }

        currentX += pW + kerf;
      }

      currentY += stripH + kerf;
    }

    if (placedParts.length === 0) break;

    const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
    const totalArea = panelWidth * panelHeight;
    
    panels.push({
      panelNumber: panels.length + 1,
      parts: placedParts,
      efficiency: (usedArea / totalArea) * 100,
      usedArea,
      totalArea
    });

    if (panels.length > 50) break;
  }

  const totalUsed = panels.reduce((acc, p) => acc + p.usedArea, 0);
  const totalAvail = panels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency: (totalUsed / totalAvail) * 100,
    summary: `JADSI v17.5: Nesting industrial iterativo optimizado para piezas mínimas de 60mm.`,
    kerf,
    trim,
    selectedThickness
  };
}

/**
 * Puntuador de Calidad de Desperdicio JADSI v17.5
 * Penaliza tiras < 60mm (basado en el tamaño mínimo de pieza de amarre).
 * Premia bloques grandes y cuadrados.
 */
function calculateWasteQuality(result: OptimizationResult, algoW: number, algoH: number): number {
  let score = 0;
  result.optimizedLayout.forEach(panel => {
    const maxX = panel.parts.reduce((max, p) => Math.max(max, p.x + p.width), 0);
    const maxY = panel.parts.reduce((max, p) => Math.max(max, p.y + p.height), 0);
    
    const remainingW = Math.max(0, algoW - maxX);
    const remainingH = Math.max(0, algoH - maxY);

    const areaRestanteLongitudinal = remainingW * algoH;
    const areaRestanteTransversal = remainingH * algoW;

    const mejorAreaSobrante = Math.max(areaRestanteLongitudinal, areaRestanteTransversal);
    const dimensionMinima = mejorAreaSobrante === areaRestanteLongitudinal ? remainingW : remainingH;

    // SCORING v3:
    if (dimensionMinima < 60) {
      // PENALIZACIÓN: El sobrante es una tira inútil (menor que el amarre de 60mm)
      score -= 5000000;
    } else {
      // PREMIO: El sobrante es una pieza reutilizable
      score += (mejorAreaSobrante * dimensionMinima);
    }
  });
  return score;
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 65%, 60%, 0.3)`;
  });
  return colors;
}
