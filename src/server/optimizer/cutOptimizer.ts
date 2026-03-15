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
 * JADSI Industrial Engine v17.0 - Waste Reutilization v2
 * 
 * OBJETIVO 1: Minimizar cantidad de paneles.
 * OBJETIVO 2: Maximizar bloques de desperdicio reutilizables (>150mm).
 * ESTRATEGIA: Búsqueda estocástica multi-heurística con scoring de entropía de desperdicio.
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

  // AUMENTO DE INTENSIDAD JADSI v17.0
  const iterationsPerStrategy = 120; // Duplicado para asegurar encontrar el layout óptimo
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
      
      // EVALUACIÓN JERÁRQUICA JADSI v17.0
      const wasteScore = calculateWasteQuality(currentResult, algoW, algoH);
      
      /**
       * SCORE = Prioridad Paneles (Factor 1e15) 
       *         + Eficiencia (Factor 1e10)
       *         + Calidad Desperdicio (Factor 1)
       * 
       * Esto asegura que 1 panel siempre le gane a 2, sin importar el desperdicio.
       * Pero ante 1 panel vs 1 panel, ganará el que tenga mejor wasteScore.
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

  return bestGlobalResult || { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Error en el motor v17.0", kerf, trim, selectedThickness };
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

    // Crear tiras de guillotina
    while (currentY < algoH) {
      let leaderIdx = -1;
      let leaderRotated = false;

      // Buscar líder de tira (la pieza más alta que quepa)
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

      // Rellenar la tira con columnas
      while (currentX < algoW) {
        let bestPartIdx = -1;
        let bestPartRotated = false;

        // Buscar pieza que determine el ancho de la columna
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

        // Apilamiento vertical dentro de la columna (Sub-stacking)
        let subY = 0;
        while (subY < stripH) {
          let stackPartIdx = -1;
          let stackRotated = false;

          for (let j = 0; j < workingPool.length; j++) {
            const sp = workingPool[j];
            if (sp.placed) continue;

            // Piezas que encajen exactamente en el ancho de columna pW
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

          // Traducción según orientación maestra
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

    // Seguridad para evitar bucles infinitos
    if (panels.length > 50) break;
  }

  const totalUsed = panels.reduce((acc, p) => acc + p.usedArea, 0);
  const totalAvail = panels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency: (totalUsed / totalAvail) * 100,
    summary: `JADSI v17.0: Nesting industrial iterativo con scoring de reutilización v2.`,
    kerf,
    trim,
    selectedThickness
  };
}

/**
 * Puntuador de Calidad de Desperdicio JADSI v17.0
 * Penaliza tiras < 150mm.
 * Premia bloques grandes y cuadrados.
 */
function calculateWasteQuality(result: OptimizationResult, algoW: number, algoH: number): number {
  let score = 0;
  result.optimizedLayout.forEach(panel => {
    // Calculamos el rectángulo de uso máximo
    const maxX = panel.parts.reduce((max, p) => Math.max(max, p.x + p.width), 0);
    const maxY = panel.parts.reduce((max, p) => Math.max(max, p.y + p.height), 0);
    
    // Dimensiones del espacio vacío principal
    const remainingW = Math.max(0, algoW - maxX);
    const remainingH = Math.max(0, algoH - maxY);

    // Estrategia Lepton: El desperdicio es mejor si es un solo bloque grande
    const areaRestanteLongitudinal = remainingW * algoH;
    const areaRestanteTransversal = remainingH * algoW;

    const mejorAreaSobrante = Math.max(areaRestanteLongitudinal, areaRestanteTransversal);
    const dimensionMinima = mejorAreaSobrante === areaRestanteLongitudinal ? remainingW : remainingH;

    // SCORING v2:
    if (dimensionMinima < 150) {
      // PENALIZACIÓN: El sobrante es una tira inútil
      score -= 5000000;
    } else {
      // PREMIO: El sobrante es una pieza reutilizable
      // Cuanto más grande sea la dimensión mínima, mejor es el bloque
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
