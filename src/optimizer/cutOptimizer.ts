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
 * ArquiMax Industrial Engine v12.1 - DETERMINISTIC 4-LAYER GUILLOTINE
 * Maximiza el sobrante reutilizable agrupando piezas desde el origen (0,0).
 * Jerarquía: Panel -> Fajas (Strips) -> Columnas (Containers) -> Stacks (Nesting).
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

  // Estrategias Determinísticas para evaluación global
  const strategies = [
    (a: InternalPart, b: InternalPart) => (b.width * b.height) - (a.width * a.height), // Área Mayor
    (a: InternalPart, b: InternalPart) => b.height - a.height,                         // Altura Mayor
    (a: InternalPart, b: InternalPart) => b.width - a.width,                           // Ancho Mayor
  ];

  let bestResult: OptimizationResult | null = null;
  const partColors = generateColors(filteredParts);

  // EVALUACIÓN DE ORIENTACIÓN DE PANEL (Horizontal vs Vertical)
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

      // Dimensiones según orientación del panel para optimizar fajas
      const currentW = isVerticalPanel ? usableH : usableW;
      const currentH = isVerticalPanel ? usableW : usableH;

      const currentResult = buildStrictLayout(
        pool, 
        currentW, 
        currentH, 
        kerf, 
        trim, 
        selectedThickness, 
        partColors, 
        panelWidth, 
        panelHeight,
        isVerticalPanel
      );
      
      const totalPlaced = currentResult.optimizedLayout.reduce((acc, p) => acc + p.parts.length, 0);

      if (!bestResult || totalPlaced > bestResult.optimizedLayout.reduce((acc, p) => acc + p.parts.length, 0)) {
        bestResult = currentResult;
      } else if (totalPlaced === bestResult.optimizedLayout.reduce((acc, p) => acc + p.parts.length, 0)) {
        if (currentResult.totalPanels < bestResult.totalPanels) {
          bestResult = currentResult;
        } else if (currentResult.totalPanels === bestResult.totalPanels && currentResult.totalEfficiency > bestResult.totalEfficiency) {
          bestResult = currentResult;
        }
      }
    }
  }

  return bestResult!;
}

function buildStrictLayout(
  pool: InternalPart[], 
  usableW: number, 
  usableH: number, 
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

    // CAPA 2: FAJAS (STRIPS) - Cortes horizontales de lado a lado
    while (currentY < usableH) {
      const leaderIdx = workingPool.findIndex(p => !p.placed && 
        ((p.width <= usableW && p.height <= (usableH - currentY)) || 
         (p.grainDirection === 'libre' && p.height <= usableW && p.width <= (usableH - currentY)))
      );

      if (leaderIdx === -1) break;

      const leader = workingPool[leaderIdx];
      let shelfH = leader.height;
      
      // Decidir altura de faja óptima (Pieza Líder)
      if (leader.grainDirection === 'libre') {
        const canN = leader.width <= usableW && leader.height <= (usableH - currentY);
        const canR = leader.height <= usableW && leader.width <= (usableH - currentY);
        if (canR && (!canN || leader.width > leader.height)) {
          shelfH = leader.width;
        }
      }

      let currentX = 0;

      // CAPA 3: COLUMNAS (CONTAINERS) - Ancho fijo por pieza líder de columna
      while (currentX < usableW) {
        let colLeaderIdx = -1;
        for (let i = 0; i < workingPool.length; i++) {
          const p = workingPool[i];
          if (p.placed) continue;
          const fitsN = p.width <= (usableW - currentX) && p.height <= shelfH;
          const fitsR = p.grainDirection === 'libre' && p.height <= (usableW - currentX) && p.width <= shelfH;
          if (fitsN || fitsR) {
            colLeaderIdx = i;
            break;
          }
        }

        if (colLeaderIdx === -1) break;

        const colLeader = workingPool[colLeaderIdx];
        let isColRotated = false;
        const canN = colLeader.width <= (usableW - currentX) && colLeader.height <= shelfH;
        const canR = colLeader.grainDirection === 'libre' && colLeader.height <= (usableW - currentX) && colLeader.width <= shelfH;
        
        if (canR && (!canN || colLeader.height > colLeader.width)) isColRotated = true;
        
        const colW = isColRotated ? colLeader.height : colLeader.width;
        let colUsedH = 0;

        // CAPA 4: PIEZAS (NESTING) - Apilado vertical ESTRICTO
        // Para respetar guillotina, solo entran piezas que compartan el ancho de la columna
        while (colUsedH < shelfH) {
          let bestPartIdx = -1;
          let bestPartRot = false;

          for (let i = 0; i < workingPool.length; i++) {
            const p = workingPool[i];
            if (p.placed) continue;
            
            const remH = shelfH - colUsedH;
            // Solo entra si el ancho es EXACTAMENTE el mismo que el de la columna para corte recto
            const matchesN = p.width === colW && p.height <= remH;
            const matchesR = p.grainDirection === 'libre' && p.height === colW && p.width <= remH;

            if (matchesN) {
              bestPartIdx = i;
              bestPartRot = false;
              break;
            } else if (matchesR) {
              bestPartIdx = i;
              bestPartRot = true;
              break;
            }
          }

          if (bestPartIdx === -1) break;

          const p = workingPool[bestPartIdx];
          const finalW = bestPartRot ? p.height : p.width;
          const finalH = bestPartRot ? p.width : p.height;

          // Coordenadas absolutas desde el origen del área útil
          const globalX = isVertical ? currentY : currentX;
          const globalY = isVertical ? currentX : currentY + colUsedH;
          const globalW = isVertical ? finalH : finalW;
          const globalH = isVertical ? finalW : finalH;

          placedInPanel.push({
            name: p.name,
            x: globalX,
            y: globalY,
            width: globalW,
            height: globalH,
            rotated: isVertical ? !bestPartRot : bestPartRot,
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
    const panelArea = panelWidth * panelHeight;

    panels.push({
      panelNumber: panels.length + 1,
      parts: placedInPanel,
      efficiency: (usedArea / panelArea) * 100,
      usedArea,
      totalArea: panelArea
    });

    if (panels.length > 20) break; 
  }

  const totalUsed = panels.reduce((acc, l) => acc + l.usedArea, 0);
  const totalAvail = panels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency: (totalUsed / totalAvail) * 100,
    summary: `ArquiMax Industrial v12.1: Guillotina de 4 capas optimizada para sobrante máximo.`,
    kerf,
    trim,
    selectedThickness
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
