
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
 * ArquiMax Industrial Engine v12.6 - GLOBAL DENSITY STRATEGY
 * - Evalúa obligatoriamente Panel Horizontal vs Panel Vertical.
 * - Maximiza el llenado del primer panel mediante un selector de impacto.
 * - Garantiza guillotina estricta de 3 etapas.
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

  const sortStrategies = [
    (a: InternalPart, b: InternalPart) => b.height - a.height, 
    (a: InternalPart, b: InternalPart) => (b.width * b.height) - (a.width * a.height),
    (a: InternalPart, b: InternalPart) => b.width - a.width,
  ];

  let bestResult: OptimizationResult | null = null;
  let bestScore = Infinity; 
  const partColors = generateColors(filteredParts);

  for (const strategy of sortStrategies) {
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
      
      if (currentResult.optimizedLayout.length > 0) {
        const firstPanelEfficiency = currentResult.optimizedLayout[0]?.efficiency || 0;
        const score = (currentResult.totalPanels * 1000000) - firstPanelEfficiency;

        if (!bestResult || score < bestScore) {
          bestResult = currentResult;
          bestScore = score;
        }
      }
    }
  }

  return bestResult || { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Error de cálculo", kerf, trim, selectedThickness };
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

    while (currentPanelHeight < algoH) {
      let leaderIdx = -1;
      let leaderIsRotated = false;

      for (let i = 0; i < workingPool.length; i++) {
        const p = workingPool[i];
        if (p.placed) continue;

        if (p.width <= algoW && p.height <= (algoH - currentPanelHeight)) {
          leaderIdx = i;
          leaderIsRotated = false;
          break;
        }
        if (p.grainDirection === 'libre' && p.height <= algoW && p.width <= (algoH - currentPanelHeight)) {
          leaderIdx = i;
          leaderIsRotated = true;
          break;
        }
      }

      if (leaderIdx === -1) break;

      const leader = workingPool[leaderIdx];
      const stripH = leaderIsRotated ? leader.width : leader.height;
      const stripParts: OptimizedPart[] = [];
      let currentX = 0;

      while (currentX < algoW) {
        let bestColIdx = -1;
        let colRotated = false;

        for (let i = 0; i < workingPool.length; i++) {
          const p = workingPool[i];
          if (p.placed) continue;

          if (p.width <= (algoW - currentX) && p.height <= stripH) {
            bestColIdx = i;
            colRotated = false;
            break;
          }
          if (p.grainDirection === 'libre' && p.height <= (algoW - currentX) && p.width <= stripH) {
            bestColIdx = i;
            colRotated = true;
            break;
          }
        }

        if (bestColIdx === -1) break;

        const colLeader = workingPool[bestColIdx];
        const colW = colRotated ? colLeader.height : colLeader.width;
        let colUsedY = 0;

        while (colUsedY < stripH) {
          let pIdx = -1;
          let pRot = false;

          for (let i = 0; i < workingPool.length; i++) {
            const p = workingPool[i];
            if (p.placed) continue;

            const remH = stripH - colUsedY;
            if (p.width === colW && p.height <= remH) {
              pIdx = i;
              pRot = false;
              break;
            }
            if (p.grainDirection === 'libre' && p.height === colW && p.width <= remH) {
              pIdx = i;
              pRot = true;
              break;
            }
          }

          if (pIdx === -1) break;

          const part = workingPool[pIdx];
          const finalH = pRot ? part.width : part.height;

          stripParts.push({
            name: part.name,
            x: currentX,
            y: colUsedY,
            width: colW,
            height: finalH,
            rotated: pRot,
            color: colors[part.name]
          });

          part.placed = true;
          colUsedY += finalH + kerf;
        }
        currentX += colW + kerf;
      }

      if (stripParts.length > 0) {
        const stripUsedWidth = currentX - kerf;
        panelStrips.push({
          height: stripH,
          width: stripUsedWidth,
          parts: stripParts,
          efficiency: stripUsedWidth / algoW
        });
        currentPanelHeight += stripH + kerf;
      } else {
        break;
      }
    }

    if (panelStrips.length === 0) break;

    panelStrips.sort((a, b) => b.efficiency - a.efficiency);

    const placedInPanel: OptimizedPart[] = [];
    let yOffset = 0;

    for (const strip of panelStrips) {
      for (const p of strip.parts) {
        const finalX = p.x;
        const finalY = yOffset + p.y;

        const drawX = isVertical ? finalY : finalX;
        const drawY = isVertical ? finalX : finalY;
        const drawW = isVertical ? p.height : p.width;
        const drawH = isVertical ? p.width : p.height;

        placedInPanel.push({
          ...p,
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH,
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

    if (panels.length > 20) break; 
  }

  const totalUsed = panels.reduce((acc, l) => acc + l.usedArea, 0);
  const totalAvail = panels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency: (totalUsed / totalAvail) * 100,
    summary: `JADSI Industrial Engine v12.6: Optimización completada.`,
    kerf, trim, selectedThickness
  };
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 75%, 60%, 0.3)`;
  });
  return colors;
}
