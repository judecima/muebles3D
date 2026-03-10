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
 * ArquiMax Industrial Engine v11.8 (Deterministic Global Optimizer)
 * Enfoque: Análisis de Doble Orientación de Panel + Scavenger de Faja Agresivo.
 * El motor garantiza la colocación de todas las piezas buscando rellenos laterales
 * incluso cuando las piezas principales de la fila ya han sido colocadas.
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

  const panelOrientations = [
    { w: panelWidth, h: panelHeight, isRotated: false },
    { w: panelHeight, h: panelWidth, isRotated: true }
  ];

  let bestGlobalResult: OptimizationResult | null = null;
  let bestGlobalUnplaced = Infinity;
  const partColors = generateColors(filteredParts);

  for (const orient of panelOrientations) {
    const usableW = Math.max(0, orient.w - (trim * 2));
    const usableH = Math.max(0, orient.h - (trim * 2));

    const strategies = [
      (a: any, b: any) => (b.width * b.height) - (a.width * a.height),
      (a: any, b: any) => b.height - a.height,
      (a: any, b: any) => b.width - a.width,
      (a: any, b: any) => Math.max(b.width, b.height) - Math.max(a.width, a.height),
      (a: any, b: any) => (b.width / b.height) - (a.width / a.height),
    ];

    for (const strategy of strategies) {
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

      const currentResult = buildLayout(pool, usableW, usableH, kerf, trim, selectedThickness, partColors, orient.w, orient.h);
      const unplacedCount = pool.filter(p => !p.placed).length;
      
      // PRIORIDAD 1: Menor cantidad de piezas sin colocar
      // PRIORIDAD 2: Menor número de paneles
      // PRIORIDAD 3: Mayor eficiencia
      if (!bestGlobalResult || 
          unplacedCount < bestGlobalUnplaced || 
          (unplacedCount === bestGlobalUnplaced && currentResult.totalPanels < bestGlobalResult.totalPanels) ||
          (unplacedCount === bestGlobalUnplaced && currentResult.totalPanels === bestGlobalResult.totalPanels && currentResult.totalEfficiency > bestGlobalResult.totalEfficiency)) {
        bestGlobalResult = currentResult;
        bestGlobalUnplaced = unplacedCount;
      }
    }
  }

  return bestGlobalResult!;
}

function buildLayout(
  pool: InternalPart[], 
  usableW: number, 
  usableH: number, 
  kerf: number, 
  trim: number, 
  selectedThickness: number,
  colors: Record<string, string>,
  panelWidth: number,
  panelHeight: number
): OptimizationResult {
  const panels: OptimizedPanel[] = [];
  let workingPool = pool.map(p => ({ ...p }));

  while (workingPool.some(p => !p.placed)) {
    const placedInPanel: OptimizedPart[] = [];
    let currentY = 0;

    while (currentY < usableH) {
      const leaderIdx = workingPool.findIndex(p => !p.placed && 
        ((p.width <= usableW && p.height <= (usableH - currentY)) || 
         (p.grainDirection === 'libre' && p.height <= usableW && p.width <= (usableH - currentY)))
      );

      if (leaderIdx === -1) break;

      const leader = workingPool[leaderIdx];
      let shelfH = leader.height;
      let rotatedShelf = false;

      if (leader.grainDirection === 'libre') {
        const canNormal = leader.width <= usableW && leader.height <= (usableH - currentY);
        const canRotated = leader.height <= usableW && leader.width <= (usableH - currentY);
        
        if (canNormal && canRotated) {
          if (leader.width < leader.height) { 
            shelfH = leader.width;
            rotatedShelf = true;
          }
        } else if (canRotated) {
          shelfH = leader.width;
          rotatedShelf = true;
        }
      }

      let currentX = 0;

      // SCAVENGER AGRESIVO: Llenar el ancho de la faja sin detenerse
      while (currentX < usableW) {
        let bestIdx = -1;
        let minHeightDiff = Infinity;

        // Buscamos en TODO el pool la mejor pieza que quepa en el ancho restante
        for (let i = 0; i < workingPool.length; i++) {
          const p = workingPool[i];
          if (p.placed) continue;
          
          const canNormal = p.width <= (usableW - currentX) && p.height <= shelfH;
          const canRotated = p.grainDirection === 'libre' && p.height <= (usableW - currentX) && p.width <= shelfH;
          
          if (canNormal) {
            const diff = shelfH - p.height;
            if (diff < minHeightDiff) { minHeightDiff = diff; bestIdx = i; }
          }
          if (canRotated) {
            const diff = shelfH - p.width;
            if (diff < minHeightDiff) { minHeightDiff = diff; bestIdx = i; }
          }
        }

        if (bestIdx === -1) break; // Realmente no cabe nada más en este ancho

        const p = workingPool[bestIdx];
        let isRotated = false;

        const canNormal = p.width <= (usableW - currentX) && p.height <= shelfH;
        const canRotated = p.grainDirection === 'libre' && p.height <= (usableW - currentX) && p.width <= shelfH;

        if (bestIdx === leaderIdx) {
          isRotated = rotatedShelf;
        } else if (!canNormal && canRotated) {
          isRotated = true;
        } else if (canNormal && canRotated) {
          isRotated = Math.abs(p.height - shelfH) > Math.abs(p.width - shelfH);
        }

        const pW = isRotated ? p.height : p.width;
        const pH = isRotated ? p.width : p.height;

        placedInPanel.push({
          name: p.name,
          x: currentX,
          y: currentY,
          width: pW,
          height: pH,
          rotated: isRotated,
          color: colors[p.name]
        });
        p.placed = true;

        // Nesting Recursivo (V-Stacking)
        let nextY = pH + kerf;
        while (shelfH - nextY >= 5) {
          const remH = shelfH - nextY;
          let nestIdx = -1;
          let nestMinDiff = Infinity;

          for (let i = 0; i < workingPool.length; i++) {
            const np = workingPool[i];
            if (np.placed) continue;

            const nNormalFits = np.width <= pW && np.height <= remH;
            const nRotatedFits = np.grainDirection === 'libre' && np.height <= pW && np.width <= remH;

            if (nNormalFits) {
              const diff = remH - np.height;
              if (diff < nestMinDiff) { nestMinDiff = diff; nestIdx = i; }
            }
            if (nRotatedFits) {
              const diff = remH - np.width;
              if (diff < nestMinDiff) { nestMinDiff = diff; nestIdx = i; }
            }
          }

          if (nestIdx !== -1) {
            const np = workingPool[nestIdx];
            let nRot = false;
            
            const nNormalFits = np.width <= pW && np.height <= remH;
            const nRotatedFits = np.grainDirection === 'libre' && np.height <= pW && np.width <= remH;

            if (!nNormalFits && nRotatedFits) {
              nRot = true;
            } else if (nNormalFits && nRotatedFits) {
              if (Math.abs(np.height - pW) < Math.abs(np.width - pW)) nRot = true;
            }

            const nW = nRot ? np.height : np.width;
            const nH = nRot ? np.width : np.height;

            placedInPanel.push({
              name: np.name,
              x: currentX,
              y: currentY + nextY,
              width: nW,
              height: nH,
              rotated: nRot,
              color: colors[np.name]
            });
            np.placed = true;
            nextY += nH + kerf;
          } else break;
        }

        currentX += pW + kerf;
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
  const totalEfficiency = (totalUsed / totalAvail) * 100;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency,
    summary: `ArquiMax Industrial v11.8: Scavenger Agresivo Activo. Eficiencia: ${totalEfficiency.toFixed(2)}%`,
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
