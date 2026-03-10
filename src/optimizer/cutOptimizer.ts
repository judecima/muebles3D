
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
 * ArquiMax Industrial Engine v12.3 - COMMON WIDTH STACKING
 * Optimiza la formación de columnas buscando anchos comunes entre piezas,
 * permitiendo que piezas como frentes de anafe roten para alinearse con laterales finos.
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

  for (const strategy of sortStrategies) {
    for (const isVerticalPanel of [false, true]) {
      // Intentamos siempre maximizar la altura de las columnas (Full Height)
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

    // CAPA 2: FAJAS (STRIPS) - Intentamos que la faja sea lo más alta posible
    while (currentY < algoH) {
      const leaderIdx = workingPool.findIndex(p => !p.placed && (
        (p.width <= algoW && p.height <= (algoH - currentY)) || 
        (p.grainDirection === 'libre' && p.height <= algoW && p.width <= (algoH - currentY))
      ));

      if (leaderIdx === -1) break;

      // La faja industrial idealmente ocupa todo el alto sobrante para permitir apilado vertical
      let shelfH = algoH - currentY;
      let currentX = 0;

      // CAPA 3: COLUMNAS (CONTAINERS)
      while (currentX < algoW) {
        let bestColLeaderIdx = -1;
        let bestIsRotated = false;
        let maxStackCount = -1;

        // Buscamos el líder de columna que permita apilar MÁS piezas (mismo ancho)
        for (let i = 0; i < workingPool.length; i++) {
          const p = workingPool[i];
          if (p.placed) continue;

          // Probar orientación Normal
          if (p.width <= (algoW - currentX) && p.height <= shelfH) {
            const count = countPotentialStack(workingPool, p.width, shelfH);
            if (count > maxStackCount) {
              maxStackCount = count;
              bestColLeaderIdx = i;
              bestIsRotated = false;
            }
          }

          // Probar orientación Rotada
          if (p.grainDirection === 'libre' && p.height <= (algoW - currentX) && p.width <= shelfH) {
            const count = countPotentialStack(workingPool, p.height, shelfH);
            if (count > maxStackCount) {
              maxStackCount = count;
              bestColLeaderIdx = i;
              bestIsRotated = true;
            }
          }
        }

        if (bestColLeaderIdx === -1) break;

        const colLeader = workingPool[bestColLeaderIdx];
        const colW = bestIsRotated ? colLeader.height : colLeader.width;
        let colUsedH = 0;

        // CAPA 4: PIEZAS (STACKING) - Forzamos el mismo ancho para guillotina
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

          const localX = currentX;
          const localY = currentY + colUsedH;

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
      currentY += shelfH + kerf; // Avanzamos a la siguiente faja (usualmente solo hay una por panel en FullHeight)
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
    summary: `ArquiMax v12.3: Optimización por Columnas de Ancho Común y Compactación Perimetral.`,
    kerf, trim, selectedThickness
  };
}

/**
 * Cuenta cuántas piezas en el pool podrían compartir el mismo ancho para una columna.
 */
function countPotentialStack(pool: InternalPart[], targetWidth: number, shelfH: number): number {
  let count = 0;
  let currentH = 0;
  for (const p of pool) {
    if (p.placed) continue;
    const canFitN = p.width === targetWidth && (currentH + p.height <= shelfH);
    const canFitR = p.grainDirection === 'libre' && p.height === targetWidth && (currentH + p.width <= shelfH);
    
    if (canFitN) {
      count++;
      currentH += p.height;
    } else if (canFitR) {
      count++;
      currentH += p.width;
    }
  }
  return count;
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 70%, 55%, 0.35)`;
  });
  return colors;
}
