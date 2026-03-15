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
 * JADSI Industrial Engine v15.0 - HIGH DENSITY DGP
 * Implementa empaquetado de alta densidad con minimización de entropía de desperdicio.
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

  // SIMULACIÓN MULTI-ESTRATEGIA (DGP Analysis)
  const masterOrientations = [false, true]; // Horizontal vs Vertical
  const sortingHeuristics = [
    (a: InternalPart, b: InternalPart) => b.height - a.height || b.width - a.width,
    (a: InternalPart, b: InternalPart) => (b.width * b.height) - (a.width * a.height),
    (a: InternalPart, b: InternalPart) => b.width - a.width || b.height - a.height
  ];

  for (const isVerticalMaster of masterOrientations) {
    for (const sortFn of sortingHeuristics) {
      const pool: InternalPart[] = filteredParts.flatMap((p, idx) => 
        Array.from({ length: p.quantity }, () => ({
          ...p,
          originalIndex: idx,
          placed: false
        }))
      );

      pool.sort(sortFn);

      // En el algoritmo interno, siempre trabajamos con W como dirección de la tira y H como profundidad
      const algoW = isVerticalMaster ? usableH : usableW;
      const algoH = isVerticalMaster ? usableW : usableH;

      const currentResult = executeNesting(pool, algoW, algoH, kerf, trim, selectedThickness, partColors, panelWidth, panelHeight, isVerticalMaster);
      
      // EVALUACIÓN DE CALIDAD JADSI v15
      // 1. Menos paneles (Factor 10^9)
      // 2. Eficiencia global (Factor 10^6)
      // 3. Área del bloque de desperdicio más grande (Factor 1)
      const wasteScore = calculateWasteQuality(currentResult, algoW, algoH);
      const score = (1000 / currentResult.totalPanels) * 1000000000 + 
                    (currentResult.totalEfficiency * 1000000) + 
                    wasteScore;

      if (!bestGlobalResult || score > bestGlobalScore) {
        bestGlobalResult = currentResult;
        bestGlobalScore = score;
      }
    }
  }

  return bestGlobalResult || { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Error en el motor v15", kerf, trim, selectedThickness };
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

    // Llenar un panel
    while (currentY < algoH) {
      // 1. Encontrar el "Líder de Tira" (la pieza más alta disponible)
      let leaderIdx = -1;
      let leaderRotated = false;

      for (let i = 0; i < workingPool.length; i++) {
        const p = workingPool[i];
        if (p.placed) continue;
        
        // Intentar normal
        if (p.height <= (algoH - currentY) && p.width <= algoW) {
          leaderIdx = i; leaderRotated = false; break;
        }
        // Intentar rotado (si es libre)
        if (p.grainDirection === 'libre' && p.width <= (algoH - currentY) && p.height <= algoW) {
          leaderIdx = i; leaderRotated = true; break;
        }
      }

      if (leaderIdx === -1) break; // No caben más tiras

      const leader = workingPool[leaderIdx];
      const stripH = leaderRotated ? leader.width : leader.height;
      let currentX = 0;

      // 2. Llenar la tira horizontalmente
      while (currentX < algoW) {
        let bestPartIdx = -1;
        let bestPartRotated = false;

        // Estrategia "Best Fit" para la tira: buscar la pieza que mejor llene el alto de la tira
        for (let i = 0; i < workingPool.length; i++) {
          const p = workingPool[i];
          if (p.placed) continue;

          // Caso A: Pieza cabe en la tira
          if (p.width <= (algoW - currentX) && p.height <= stripH) {
            bestPartIdx = i; bestPartRotated = false; break;
          }
          // Caso B: Pieza rotada cabe en la tira
          if (p.grainDirection === 'libre' && p.height <= (algoW - currentX) && p.width <= stripH) {
            bestPartIdx = i; bestPartRotated = true; break;
          }
        }

        if (bestPartIdx === -1) break; // No caben más piezas en esta tira

        const p = workingPool[bestPartIdx];
        const pW = bestPartRotated ? p.height : p.width;
        const pH = bestPartRotated ? p.width : p.height;

        // Antes de colocar, verificar si podemos apilar piezas verticalmente dentro de este ancho X (Sub-columnas)
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

          // Mapear coordenadas finales según orientación maestra
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

    if (placedParts.length === 0) break; // Evitar bucle infinito

    const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
    const totalArea = panelWidth * panelHeight;
    
    panels.push({
      panelNumber: panels.length + 1,
      parts: placedParts,
      efficiency: (usedArea / totalArea) * 100,
      usedArea,
      totalArea
    });

    if (panels.length > 50) break; // Límite de seguridad
  }

  const totalUsed = panels.reduce((acc, p) => acc + p.usedArea, 0);
  const totalAvail = panels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency: (totalUsed / totalAvail) * 100,
    summary: `JADSI v15.0 HighDensity: ${isVertical ? 'Corte Vertical' : 'Corte Horizontal'} optimizado.`,
    kerf,
    trim,
    selectedThickness
  };
}

/**
 * Calcula la calidad del sobrante basándose en el rectángulo libre más grande.
 */
function calculateWasteQuality(result: OptimizationResult, algoW: number, algoH: number): number {
  let score = 0;
  result.optimizedLayout.forEach(panel => {
    // Encontramos el límite del empaquetado en X e Y
    const maxX = panel.parts.reduce((max, p) => Math.max(max, p.x + p.width), 0);
    const maxY = panel.parts.reduce((max, p) => Math.max(max, p.y + p.height), 0);
    
    const remainingW = algoW - maxX;
    const remainingH = algoH - maxY;

    // Área del sobrante lateral y superior
    const areaSide = remainingW * algoH;
    const areaTop = remainingH * algoW;

    // Premiamos el área más grande y penalizamos si la dimensión es muy pequeña
    const bestArea = Math.max(areaSide, areaTop);
    const minDim = bestArea === areaSide ? remainingW : remainingH;

    if (minDim > 150) { // Bloque realmente útil
      score += (bestArea * minDim);
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
