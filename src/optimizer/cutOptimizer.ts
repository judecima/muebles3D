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

/**
 * ArquiMax Industrial Engine v12.1.1 - CORRECCIÓN DE SOLAPAMIENTO
 * Implementa una jerarquía de 4 capas (Panel > Faja > Columna > Stacking)
 * garantizando cortes de guillotina puros y compactación perimetral.
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

  // Heurísticas de ordenamiento industrial determinísticas
  const strategies = [
    (a: InternalPart, b: InternalPart) => (b.width * b.height) - (a.width * a.height),
    (a: InternalPart, b: InternalPart) => b.height - a.height,
    (a: InternalPart, b: InternalPart) => b.width - a.width,
  ];

  let bestResult: OptimizationResult | null = null;
  const partColors = generateColors(filteredParts);

  // EVALUAR ORIENTACIONES (Horizontal y Vertical)
  for (const strategy of strategies) {
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

      // Dimensiones del sistema algorítmico (swapped si es vertical)
      const algoW = isVerticalPanel ? usableH : usableW;
      const algoH = isVerticalPanel ? usableW : usableH;

      const currentResult = buildStrictLayout(
        pool, algoW, algoH, kerf, trim, selectedThickness, partColors, panelWidth, panelHeight, isVerticalPanel
      );
      
      if (!bestResult || currentResult.totalEfficiency > bestResult.totalEfficiency) {
        bestResult = currentResult;
      }
    }
  }

  return bestResult!;
}

function buildStrictLayout(
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
    const placedInPanel: OptimizedPart[] = [];
    let currentY = 0;

    // CAPA 2: FAJAS (STRIPS) - Divisiones transversales
    while (currentY < algoH) {
      const leaderIdx = workingPool.findIndex(p => !p.placed && (
        (p.width <= algoW && p.height <= (algoH - currentY)) || 
        (p.grainDirection === 'libre' && p.height <= algoW && p.width <= (algoH - currentY))
      ));

      if (leaderIdx === -1) break;

      const leader = workingPool[leaderIdx];
      let shelfH = leader.height;
      
      // La orientación del líder define la altura de la faja
      if (leader.grainDirection === 'libre' && leader.width <= (algoH - currentY) && leader.height <= algoW) {
        if (leader.width > leader.height) shelfH = leader.width;
      }

      let currentX = 0;

      // CAPA 3: COLUMNAS (CONTAINERS) - Ancho fijo para guillotina
      while (currentX < algoW) {
        let colLeaderIdx = -1;
        for (let i = 0; i < workingPool.length; i++) {
          const p = workingPool[i];
          if (p.placed) continue;
          if ((p.width <= (algoW - currentX) && p.height <= shelfH) || 
              (p.grainDirection === 'libre' && p.height <= (algoW - currentX) && p.width <= shelfH)) {
            colLeaderIdx = i;
            break;
          }
        }

        if (colLeaderIdx === -1) break;

        const colLeader = workingPool[colLeaderIdx];
        let isColRotated = false;
        const fitsN = colLeader.width <= (algoW - currentX) && colLeader.height <= shelfH;
        const fitsR = colLeader.grainDirection === 'libre' && colLeader.height <= (algoW - currentX) && colLeader.width <= shelfH;
        
        if (fitsR && (!fitsN || colLeader.height > colLeader.width)) isColRotated = true;
        
        const colW = isColRotated ? colLeader.height : colLeader.width;
        let colUsedH = 0;

        // CAPA 4: PIEZAS (STACKING) - Todas con el mismo ancho exacto
        while (colUsedH < shelfH) {
          let bestIdx = -1;
          let bestRot = false;

          for (let i = 0; i < workingPool.length; i++) {
            const p = workingPool[i];
            if (p.placed) continue;
            
            const remH = shelfH - colUsedH;
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
          const finalW = bestRot ? p.height : p.width;
          const finalH = bestRot ? p.width : p.height;

          // TRANSFORMACIÓN DE COORDENADAS (CORREGIDO PARA EVITAR SOLAPAMIENTO)
          const algoX = currentX;
          const algoY = currentY + colUsedH;

          const gX = isVertical ? algoY : algoX;
          const gY = isVertical ? algoX : algoY;
          const gW = isVertical ? finalH : finalW;
          const gH = isVertical ? finalW : finalH;

          placedInPanel.push({
            name: p.name,
            x: gX,
            y: gY,
            width: gW,
            height: gH,
            rotated: isVertical ? !bestRot : bestRot,
            color: colors[p.name]
          });

          p.placed = true;
          colUsedH += finalH + kerf;
        }

        currentX += colW + kerf;
      }
      currentY += shelfH + kerf;
    }

    if (placedInPanel.length === 0) break;

    const usedArea = placedInPanel.reduce((acc, p) => acc + (p.width * p.height), 0);
    panels.push({
      panelNumber: panels.length + 1,
      parts: placedInPanel,
      efficiency: (usedArea / (panelWidth * panelHeight)) * 100,
      usedArea,
      totalArea: panelWidth * panelHeight
    });

    if (panels.length > 20) break;
  }

  const totalUsed = panels.reduce((acc, l) => acc + l.usedArea, 0);
  const totalAvail = panels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency: (totalUsed / totalAvail) * 100,
    summary: "ArquiMax v12.1.1: Guillotina estricta y compactación perimetral.",
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
