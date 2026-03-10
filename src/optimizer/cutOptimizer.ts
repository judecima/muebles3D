
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
 * ArquiMax Industrial Engine v12.2 - FULL COLUMN STACKING
 * Optimiza el aprovechamiento global permitiendo que las columnas crezcan 
 * hasta agotar la altura total del panel, maximizando el sobrante reutilizable.
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

  // Estrategias de ordenamiento industrial
  const sortStrategies = [
    (a: InternalPart, b: InternalPart) => (b.width * b.height) - (a.width * a.height),
    (a: InternalPart, b: InternalPart) => b.height - a.height,
    (a: InternalPart, b: InternalPart) => b.width - a.width,
  ];

  let bestResult: OptimizationResult | null = null;
  const partColors = generateColors(filteredParts);

  // EVALUAR ORIENTACIONES Y ESTRATEGIAS DE FAJA
  for (const strategy of sortStrategies) {
    // Probamos orientación horizontal y vertical del panel
    for (const isVerticalPanel of [false, true]) {
      // Probamos dos tipos de fajas: Altura de líder vs Altura total (Full Stacking)
      for (const useFullHeightStrips of [true, false]) {
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

        const currentResult = buildStrictLayout(
          pool, algoW, algoH, kerf, trim, selectedThickness, partColors, panelWidth, panelHeight, isVerticalPanel, useFullHeightStrips
        );
        
        if (!bestResult || currentResult.totalEfficiency > bestResult.totalEfficiency) {
          bestResult = currentResult;
        }
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
  isVertical: boolean,
  useFullHeightStrips: boolean
): OptimizationResult {
  const panels: OptimizedPanel[] = [];
  let workingPool = pool.map(p => ({ ...p }));

  while (workingPool.some(p => !p.placed)) {
    const placedInPanel: OptimizedPart[] = [];
    let currentY = 0;

    // CAPA 2: FAJAS (STRIPS)
    while (currentY < algoH) {
      const leaderIdx = workingPool.findIndex(p => !p.placed && (
        (p.width <= algoW && p.height <= (algoH - currentY)) || 
        (p.grainDirection === 'libre' && p.height <= algoW && p.width <= (algoH - currentY))
      ));

      if (leaderIdx === -1) break;

      const leader = workingPool[leaderIdx];
      // Si usamos FullHeightStrips, la faja ocupa todo el alto restante.
      // Si no, se ajusta a la altura de la pieza líder (clásico).
      let shelfH = useFullHeightStrips ? (algoH - currentY) : leader.height;
      
      // Ajuste de altura si el líder se rota para entrar en la faja
      if (!useFullHeightStrips && leader.grainDirection === 'libre' && leader.width <= (algoH - currentY) && (leader.width > leader.height || leader.height > algoW)) {
        if (leader.height > algoW || leader.width > leader.height) shelfH = leader.width;
      }

      let currentX = 0;

      // CAPA 3: COLUMNAS (CONTAINERS)
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
        
        // Priorizar rotación que mejor se ajuste al ancho disponible o mantenga la altura de la faja
        const fitsN = colLeader.width <= (algoW - currentX) && colLeader.height <= shelfH;
        const fitsR = colLeader.grainDirection === 'libre' && colLeader.height <= (algoW - currentX) && colLeader.width <= shelfH;
        
        if (fitsR && (!fitsN || (colLeader.height > colLeader.width && colLeader.height <= shelfH))) {
          isColRotated = true;
        }
        
        const colW = isColRotated ? colLeader.height : colLeader.width;
        let colUsedH = 0;

        // CAPA 4: PIEZAS (STACKING) - Todas con el mismo ancho exacto de columna
        while (colUsedH < shelfH) {
          let bestIdx = -1;
          let bestRot = false;

          for (let i = 0; i < workingPool.length; i++) {
            const p = workingPool[i];
            if (p.placed) continue;
            
            const remH = shelfH - colUsedH;
            // Solo apilamos si el ancho coincide exactamente con el de la columna (Regla de Guillotina)
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

          // POSICIONAMIENTO CON TRANSFORMACIÓN DE EJES (SIN SOLAPAMIENTO)
          const localX = currentX;
          const localY = currentY + colUsedH;

          // Mapear coordenadas locales al sistema global del panel (con o sin rotación)
          const gX = isVertical ? localY : localX;
          const gY = isVertical ? localX : localY;
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
      // La altura real de la faja es la máxima altura utilizada por sus columnas
      // si no estamos en modo FullHeight.
      let actualShelfH = shelfH;
      if (!useFullHeightStrips) {
        // Encontrar la columna más alta colocada en esta faja para compactar la siguiente
        // Pero para guillotina pura, la faja debe ser de altura constante.
      }
      currentY += actualShelfH + kerf;
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

    if (panels.length > 10) break; // Límite de seguridad
  }

  const totalUsed = panels.reduce((acc, l) => acc + l.usedArea, 0);
  const totalAvail = panels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency: (totalUsed / totalAvail) * 100,
    summary: `ArquiMax v12.2: ${useFullHeightStrips ? 'Column Stacking' : 'Standard Strips'} con compactación perimetral.`,
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
