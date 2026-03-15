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

interface Column {
  width: number;
  parts: OptimizedPart[];
}

interface Strip {
  height: number;
  columns: Column[];
  efficiency: number;
}

/**
 * JADSI Industrial Engine v13.0 - RECURSIVE CONSOLIDATION STRATEGY
 * Optimiza para fabricación real y maximización de sobrantes útiles (offcuts).
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

  // PROBAR ORIENTACIÓN DE TABLERO: Horizontal (X-Rip) vs Vertical (Y-Rip)
  // Esto es vital para que los sobrantes queden en el eje largo o corto según convenga
  for (const isVerticalMaster of [false, true]) {
    
    // Probar diferentes heurísticas de ordenamiento (Alto, Área, Ancho)
    const heuristics = [
      (a: InternalPart, b: InternalPart) => b.height - a.height || b.width - a.width,
      (a: InternalPart, b: InternalPart) => (b.width * b.height) - (a.width * a.height),
      (a: InternalPart, b: InternalPart) => b.width - a.width || b.height - a.height
    ];

    for (const sortFn of heuristics) {
      const pool: InternalPart[] = filteredParts.flatMap((p, idx) => 
        Array.from({ length: p.quantity }, () => ({
          ...p,
          originalIndex: idx,
          placed: false
        }))
      );

      pool.sort(sortFn);

      const algoW = isVerticalMaster ? usableH : usableW;
      const algoH = isVerticalMaster ? usableW : usableH;

      const currentResult = executeNesting(pool, algoW, algoH, kerf, trim, selectedThickness, partColors, panelWidth, panelHeight, isVerticalMaster);
      
      // PUNTUACIÓN DE CALIDAD JADSI:
      // 1. Prioridad: Menos paneles.
      // 2. Prioridad: Mayor eficiencia en el primer panel.
      // 3. Prioridad: Compactación (Sobrante más grande).
      const score = (100 / currentResult.totalPanels) * 10000 + (currentResult.optimizedLayout[0]?.efficiency || 0);

      if (!bestGlobalResult || score > bestGlobalScore) {
        bestGlobalResult = currentResult;
        bestGlobalScore = score;
      }
    }
  }

  return bestGlobalResult || { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Error en el motor", kerf, trim, selectedThickness };
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
    const strips: Strip[] = [];
    let remainingH = algoH;

    // Generar tiras (Etapa 1 Guillotina)
    while (remainingH > 0) {
      // 1. Buscar líder de tira (la pieza más alta que quepa)
      let leaderIdx = -1;
      let leaderRotated = false;

      for (let i = 0; i < workingPool.length; i++) {
        const p = workingPool[i];
        if (p.placed) continue;

        if (p.height <= remainingH && p.width <= algoW) {
          leaderIdx = i; leaderRotated = false; break;
        }
        if (p.grainDirection === 'libre' && p.width <= remainingH && p.height <= algoW) {
          leaderIdx = i; leaderRotated = true; break;
        }
      }

      if (leaderIdx === -1) break;

      const leader = workingPool[leaderIdx];
      const stripH = leaderRotated ? leader.width : leader.height;
      const columns: Column[] = [];
      let remainingW = algoW;

      // 2. Llenar la tira con columnas (Etapa 2 Guillotina)
      while (remainingW > 0) {
        let colLeaderIdx = -1;
        let colLeaderRotated = false;

        for (let i = 0; i < workingPool.length; i++) {
          const p = workingPool[i];
          if (p.placed) continue;

          if (p.width <= remainingW && p.height <= stripH) {
            colLeaderIdx = i; colLeaderRotated = false; break;
          }
          if (p.grainDirection === 'libre' && p.height <= remainingW && p.width <= stripH) {
            colLeaderIdx = i; colLeaderRotated = true; break;
          }
        }

        if (colLeaderIdx === -1) break;

        const colLeader = workingPool[colLeaderIdx];
        const colW = colLeaderRotated ? colLeader.height : colLeader.width;
        const colParts: OptimizedPart[] = [];
        let colRemainingH = stripH;

        // 3. Llenar la columna (Etapa 3 Guillotina - Nesting Recursivo)
        // Buscamos piezas que tengan el MISMO ANCHO para apilarlas verticalmente
        for (let i = 0; i < workingPool.length; i++) {
          const p = workingPool[i];
          if (p.placed) continue;

          let fit = false;
          let rot = false;

          if (p.width === colW && p.height <= colRemainingH) {
            fit = true; rot = false;
          } else if (p.grainDirection === 'libre' && p.height === colW && p.width <= colRemainingH) {
            fit = true; rot = true;
          }

          if (fit) {
            const h = rot ? p.width : p.height;
            colParts.push({
              name: p.name,
              x: 0, // Posición relativa a la columna
              y: stripH - colRemainingH,
              width: colW,
              height: h,
              rotated: rot,
              color: colors[p.name]
            });
            p.placed = true;
            colRemainingH -= (h + kerf);
          }
        }

        columns.push({ width: colW, parts: colParts });
        remainingW -= (colW + kerf);
      }

      if (columns.length > 0) {
        const usedW = algoW - remainingW - kerf;
        strips.push({ height: stripH, columns, efficiency: usedW / algoW });
        remainingH -= (stripH + kerf);
      } else {
        break;
      }
    }

    if (strips.length === 0) break;

    // CONSOLIDAR PANEL
    const placedParts: OptimizedPart[] = [];
    let currentY = 0;

    for (const strip of strips) {
      let currentX = 0;
      for (const col of strip.columns) {
        for (const p of col.parts) {
          const absX = currentX + p.x;
          const absY = currentY + p.y;

          // Transponer si es Master Vertical
          const finalX = isVertical ? absY : absX;
          const finalY = isVertical ? absX : absY;
          const finalW = isVertical ? p.height : p.width;
          const finalH = isVertical ? p.width : p.height;

          placedParts.push({
            ...p,
            x: finalX,
            y: finalY,
            width: finalW,
            height: finalH,
            rotated: isVertical ? !p.rotated : p.rotated
          });
        }
        currentX += col.width + kerf;
      }
      currentY += strip.height + kerf;
    }

    const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
    const totalArea = panelWidth * panelHeight;

    panels.push({
      panelNumber: panels.length + 1,
      parts: placedParts,
      efficiency: (usedArea / totalArea) * 100,
      usedArea,
      totalArea
    });

    if (panels.length > 15) break; 
  }

  const totalUsed = panels.reduce((acc, p) => acc + p.usedArea, 0);
  const totalAvail = panels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency: (totalUsed / totalAvail) * 100,
    summary: `JADSI v13.0 Compact: Consolidación perimetral activa. Eficiencia: ${(totalUsed / totalAvail * 100).toFixed(1)}%.`,
    kerf, trim, selectedThickness
  };
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 70%, 55%, 0.25)`;
  });
  return colors;
}
