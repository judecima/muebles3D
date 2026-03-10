
'use client';

import { GrainDirection, OptimizationResult, OptimizedPanel, OptimizedPart } from '@/lib/types';

interface InternalPart {
  name: string;
  width: number;
  height: number;
  grainDirection: GrainDirection;
  thickness: number;
  originalIndex: number;
  placed: boolean;
}

interface Strip {
  height: number;
  width: number;
  parts: OptimizedPart[];
  efficiency: number;
}

/**
 * ArquiMax Industrial Engine v12.5 - MAX-FILL STRATEGY
 * Optimiza el panel mediante fajas horizontales de altura dinámica.
 * Maximiza el llenado de cada panel antes de abrir uno nuevo.
 * Reordena fajas por densidad para dejar el sobrante como un único bloque rectangular.
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
    return { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Sin piezas", kerf, trim, selectedThickness };
  }

  const usableW = Math.max(0, panelWidth - (trim * 2));
  const usableH = Math.max(0, panelHeight - (trim * 2));

  // Estrategias de ordenamiento inicial de piezas para probar diferentes escenarios
  const sortStrategies = [
    (a: InternalPart, b: InternalPart) => b.height - a.height, // Altura descendente (Estándar Industrial)
    (a: InternalPart, b: InternalPart) => (b.width * b.height) - (a.width * a.height), // Área descendente
    (a: InternalPart, b: InternalPart) => b.width - a.width, // Ancho descendente
  ];

  let bestResult: OptimizationResult | null = null;
  const partColors = generateColors(filteredParts);

  for (const strategy of sortStrategies) {
    // Probar tanto el panel en horizontal como en vertical para maximizar eficiencia
    for (const isVerticalPanel of [false, true]) {
      const pool: InternalPart[] = filteredParts.flatMap((p, idx) => 
        Array.from({ length: p.quantity }, () => ({
          name: p.name,
          width: p.width,
          height: p.height,
          grainDirection: p.grainDirection,
          thickness: p.thickness,
          originalIndex: idx,
          placed: false
        }))
      );

      pool.sort(strategy);

      const algoW = isVerticalPanel ? usableH : usableW;
      const algoH = isVerticalPanel ? usableW : usableH;

      const currentResult = buildStripLayout(
        pool, algoW, algoH, kerf, trim, selectedThickness, partColors, panelWidth, panelHeight, isVerticalPanel
      );
      
      // La mejor estrategia es la que usa MENOS paneles, y a igualdad de paneles, la de mayor eficiencia
      if (!bestResult || currentResult.totalPanels < bestResult.totalPanels || 
         (currentResult.totalPanels === bestResult.totalPanels && currentResult.totalEfficiency > bestResult.totalEfficiency)) {
        bestResult = currentResult;
      }
    }
  }

  return bestResult!;
}

function buildStripLayout(
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
    const panelStrips: Strip[] = [];
    let currentPanelHeight = 0;

    // CAPA 2: FAJAS (STRIPS) - Intentamos llenar el panel lo máximo posible
    while (currentPanelHeight < algoH) {
      // 1. Elegir líder de faja: la pieza más alta que quepa en el alto restante
      const leaderIdx = workingPool.findIndex(p => !p.placed && (
        (p.width <= algoW && p.height <= (algoH - currentPanelHeight)) || 
        (p.grainDirection === 'libre' && p.height <= algoW && p.width <= (algoH - currentPanelHeight))
      ));

      if (leaderIdx === -1) break;

      const leader = workingPool[leaderIdx];
      let stripH = leader.height;
      
      // Si la pieza líder es 'libre', probamos si rotándola aprovechamos mejor la faja
      if (leader.grainDirection === 'libre' && leader.width > leader.height && leader.width <= (algoH - currentPanelHeight) && leader.height <= algoW) {
        stripH = leader.width;
      }

      const stripParts: OptimizedPart[] = [];
      let currentX = 0;

      // CAPA 3: COLUMNAS (CONTAINERS) - Llenado horizontal de la faja
      while (currentX < algoW) {
        let bestColLeaderIdx = -1;
        let bestIsRotated = false;

        // Buscamos la mejor pieza para iniciar una columna dentro de esta faja
        for (let i = 0; i < workingPool.length; i++) {
          const p = workingPool[i];
          if (p.placed) continue;

          // Probar orientación Normal
          if (p.width <= (algoW - currentX) && p.height <= stripH) {
            bestColLeaderIdx = i;
            bestIsRotated = false;
            break; 
          }
          // Probar orientación Rotada
          if (p.grainDirection === 'libre' && p.height <= (algoW - currentX) && p.width <= stripH) {
            bestColLeaderIdx = i;
            bestIsRotated = true;
            break;
          }
        }

        if (bestColLeaderIdx === -1) break;

        const colLeader = workingPool[bestColLeaderIdx];
        const colW = bestIsRotated ? colLeader.height : colLeader.width;
        let colUsedH = 0;

        // CAPA 4: PIEZAS (STACKING) - Apilado vertical dentro de la columna (Guillotina)
        while (colUsedH < stripH) {
          let bestIdx = -1;
          let bestRot = false;

          for (let i = 0; i < workingPool.length; i++) {
            const p = workingPool[i];
            if (p.placed) continue;
            
            const remH = stripH - colUsedH;
            const matchN = p.width === colW && p.height <= remH;
            const matchR = p.grainDirection === 'libre' && p.height === colW && p.width <= remH;

            if (matchN) {
              bestIdx = i;
              bestRot = false;
              break;
            } else if (matchR) {
              bestIdx = i;
              bestRot = true;
              break;
            }
          }

          if (bestIdx === -1) break;

          const p = workingPool[bestIdx];
          const finalH = bestRot ? p.width : p.height;

          stripParts.push({
            name: p.name,
            x: currentX, 
            y: colUsedH, 
            width: colW,
            height: finalH,
            rotated: bestRot,
            color: colors[p.name]
          });

          p.placed = true;
          colUsedH += finalH + kerf;
        }
        currentX += colW + kerf;
      }

      if (stripParts.length > 0) {
        const stripWidthUsed = currentX - kerf;
        panelStrips.push({
          height: stripH,
          width: stripWidthUsed,
          parts: stripParts,
          efficiency: stripWidthUsed / algoW
        });
        currentPanelHeight += stripH + kerf;
      } else {
        // Evitar bucle infinito si por alguna razón no se colocó nada
        break;
      }
    }

    if (panelStrips.length === 0) break;

    // --- REORDENAMIENTO PARA MAXIMIZAR SOBRANTE (Fajas más densas arriba) ---
    panelStrips.sort((a, b) => b.efficiency - a.efficiency);

    const placedInPanel: OptimizedPart[] = [];
    let yOffset = 0;

    for (const strip of panelStrips) {
      for (const p of strip.parts) {
        const finalY = yOffset + p.y;
        const finalX = p.x;

        // Mapeo final considerando si el panel está rotado para el cálculo
        const gX = isVertical ? finalY : finalX;
        const gY = isVertical ? finalX : finalY;
        const gW = isVertical ? p.height : p.width;
        const gH = isVertical ? p.width : p.height;

        placedInPanel.push({
          ...p,
          x: gX,
          y: gY,
          width: gW,
          height: gH,
          rotated: isVertical ? !p.rotated : p.rotated
        });
      }
      yOffset += strip.height + kerf;
    }

    const usedArea = placedInPanel.reduce((acc, p) => acc + (p.width * p.height), 0);
    panels.push({
      panelNumber: panels.length + 1,
      parts: placedInPanel,
      efficiency: (usedArea / (panelWidth * panelHeight)) * 100,
      usedArea,
      totalArea: panelWidth * panelHeight
    });

    if (panels.length > 50) break; // Seguridad
  }

  const totalUsed = panels.reduce((acc, l) => acc + l.usedArea, 0);
  const totalAvail = panels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency: (totalUsed / totalAvail) * 100,
    summary: `ArquiMax v12.5: Maximización de llenado perimetral y consolidación de sobrante rectangular.`,
    kerf, trim, selectedThickness
  };
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 70%, 55%, 0.35)`;
  });
  return colors;
}

