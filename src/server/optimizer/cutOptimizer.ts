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
  remainingW: number;
}

/**
 * JADSI Industrial Engine v14.0 - WASTE INTELLIGENCE
 * Simula estrategias Horizontal vs Vertical y evalúa la reusabilidad del desperdicio.
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
  let bestGlobalResult: (OptimizationResult & { wasteScore: number }) | null = null;
  let bestGlobalScore = -Infinity;

  // SIMULACIÓN DUAL: Probar orientaciones maestras (X-Rip vs Y-Rip)
  for (const isVerticalMaster of [false, true]) {
    
    // Probar diferentes heurísticas de empaquetado
    const heuristics = [
      (a: InternalPart, b: InternalPart) => b.height - a.height || b.width - a.width,
      (a: InternalPart, b: InternalPart) => (b.width * b.height) - (a.width * a.height)
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
      
      // EVALUACIÓN DE CALIDAD DE DESPERDICIO (Waste Quality Score)
      // Premiamos el área del bloque vacío más grande y su dimensión mínima.
      const wasteScore = calculateWasteQuality(currentResult, algoW, algoH);

      // PUNTUACIÓN JADSI v14: 
      // 1. Prioridad máxima: Menos paneles.
      // 2. Prioridad media: Eficiencia global.
      // 3. Prioridad desempate: Calidad del desperdicio (bloques grandes vs tiras).
      const score = (100 / currentResult.totalPanels) * 1000000 + 
                    (currentResult.totalEfficiency * 1000) + 
                    wasteScore;

      if (!bestGlobalResult || score > bestGlobalScore) {
        bestGlobalResult = { ...currentResult, wasteScore };
        bestGlobalScore = score;
      }
    }
  }

  return bestGlobalResult || { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Error en el motor v14", kerf, trim, selectedThickness };
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

    while (remainingH > 0) {
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

        for (let i = 0; i < workingPool.length; i++) {
          const p = workingPool[i];
          if (p.placed) continue;
          let fit = false; let rot = false;
          if (p.width === colW && p.height <= colRemainingH) { fit = true; rot = false; } 
          else if (p.grainDirection === 'libre' && p.height === colW && p.width <= colRemainingH) { fit = true; rot = true; }

          if (fit) {
            const h = rot ? p.width : p.height;
            colParts.push({
              name: p.name, x: 0, y: stripH - colRemainingH, width: colW, height: h, rotated: rot, color: colors[p.name]
            });
            p.placed = true;
            colRemainingH -= (h + kerf);
          }
        }
        columns.push({ width: colW, parts: colParts });
        remainingW -= (colW + kerf);
      }

      if (columns.length > 0) {
        strips.push({ height: stripH, columns, efficiency: 0, remainingW: Math.max(0, remainingW) });
        remainingH -= (stripH + kerf);
      } else { break; }
    }

    if (strips.length === 0) break;

    const placedParts: OptimizedPart[] = [];
    let currentY = 0;
    for (const strip of strips) {
      let currentX = 0;
      for (const col of strip.columns) {
        for (const p of col.parts) {
          const absX = currentX + p.x; const absY = currentY + p.y;
          const finalX = isVertical ? absY : absX; const finalY = isVertical ? absX : absY;
          const finalW = isVertical ? p.height : p.width; const finalH = isVertical ? p.width : p.height;
          placedParts.push({ ...p, x: finalX, y: finalY, width: finalW, height: finalH, rotated: isVertical ? !p.rotated : p.rotated });
        }
        currentX += col.width + kerf;
      }
      currentY += strip.height + kerf;
    }

    const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
    const totalArea = panelWidth * panelHeight;
    panels.push({ panelNumber: panels.length + 1, parts: placedParts, efficiency: (usedArea / totalArea) * 100, usedArea, totalArea });
    if (panels.length > 20) break; 
  }

  const totalUsed = panels.reduce((acc, p) => acc + p.usedArea, 0);
  const totalAvail = panels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: panels, totalPanels: panels.length, totalEfficiency: (totalUsed / totalAvail) * 100,
    summary: `JADSI v14.0 WasteIntelligence: ${isVertical ? 'Vertical' : 'Horizontal'} Master. Eficiencia: ${(totalUsed / totalAvail * 100).toFixed(1)}%.`,
    kerf, trim, selectedThickness
  };
}

/**
 * Calcula un puntaje basado en la utilidad de los sobrantes.
 * Premia sobrantes grandes y con dimensiones mínimas amplias.
 */
function calculateWasteQuality(result: OptimizationResult, algoW: number, algoH: number): number {
  let score = 0;
  result.optimizedLayout.forEach(panel => {
    // Calculamos el sobrante principal al final del panel (el rectángulo más grande posible)
    // Asumiendo Shelf-Algorithm, el sobrante es el área no ocupada por las tiras.
    const lastPartY = panel.parts.reduce((max, p) => Math.max(max, p.y + p.height), 0);
    const lastPartX = panel.parts.reduce((max, p) => Math.max(max, p.x + p.width), 0);
    
    const remainingH = algoH - lastPartY;
    const remainingW = algoW - lastPartX;

    // Área del sobrante vertical y horizontal
    const wasteAreaH = algoW * remainingH;
    const wasteAreaV = algoH * remainingW;

    // Usamos el área y penalizamos si la dimensión más corta es muy pequeña (menos de 100mm no es reutilizable)
    const bestWasteArea = Math.max(wasteAreaH, wasteAreaV);
    const minDim = bestWasteArea === wasteAreaH ? remainingH : remainingW;
    
    if (minDim > 100) {
      score += (bestWasteArea * minDim); 
    }
  });
  return score;
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 70%, 55%, 0.25)`;
  });
  return colors;
}
