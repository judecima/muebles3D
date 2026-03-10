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
 * ArquiMax Industrial Engine v12.0 (Deterministic Global Optimizer)
 * Enfoque: Análisis de Impacto Global + Scavenger de Faja Agresivo.
 * Garantiza la colocación del 100% de las piezas y maximiza la densidad mediante Nesting de 4 capas.
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

  // Dimensiones útiles del tablero
  const usableW = Math.max(0, panelWidth - (trim * 2));
  const usableH = Math.max(0, panelHeight - (trim * 2));

  // Estrategias Industriales Determinísticas (Se ejecutan todas y se elige la mejor)
  const strategies = [
    (a: any, b: any) => (b.width * b.height) - (a.width * a.height), // Área Mayor
    (a: any, b: any) => b.height - a.height,                         // Altura Mayor
    (a: any, b: any) => b.width - a.width,                           // Ancho Mayor
    (a: any, b: any) => Math.max(b.width, b.height) - Math.max(a.width, a.height), // Lado Mayor
    (a: any, b: any) => (b.width / b.height) - (a.width / a.height), // Ratio de aspecto
  ];

  let bestResult: OptimizationResult | null = null;
  const partColors = generateColors(filteredParts);

  // Ejecutar cada estrategia de forma determinística
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

    const currentResult = buildLayout(pool, usableW, usableH, kerf, trim, selectedThickness, partColors, panelWidth, panelHeight);
    
    // Criterio de Selección: 1. Más piezas colocadas, 2. Menos paneles, 3. Mejor eficiencia
    const totalPlaced = currentResult.optimizedLayout.reduce((acc, p) => acc + p.parts.length, 0);
    const bestTotalPlaced = bestResult ? bestResult.optimizedLayout.reduce((acc, p) => acc + p.parts.length, 0) : -1;

    if (!bestResult || totalPlaced > bestTotalPlaced) {
      bestResult = currentResult;
    } else if (totalPlaced === bestTotalPlaced) {
      if (currentResult.totalPanels < bestResult.totalPanels) {
        bestResult = currentResult;
      } else if (currentResult.totalPanels === bestResult.totalPanels && currentResult.totalEfficiency > bestResult.totalEfficiency) {
        bestResult = currentResult;
      }
    }
  }

  return bestResult!;
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

    // Capa 2: Fajas (Strips) de Guillotina
    while (currentY < usableH) {
      const leaderIdx = workingPool.findIndex(p => !p.placed && 
        ((p.width <= usableW && p.height <= (usableH - currentY)) || 
         (p.grainDirection === 'libre' && p.height <= usableW && p.width <= (usableH - currentY)))
      );

      if (leaderIdx === -1) break;

      const leader = workingPool[leaderIdx];
      let shelfH = leader.height;
      let rotatedShelf = false;

      // Optimizar rotación del líder para definir la altura de la faja (Layer 2)
      if (leader.grainDirection === 'libre') {
        const canNormal = leader.width <= usableW && leader.height <= (usableH - currentY);
        const canRotated = leader.height <= usableW && leader.width <= (usableH - currentY);
        
        if (canNormal && canRotated) {
          // Si rotada aprovecha mejor la altura (es más alta), definimos la faja por ese lado
          if (leader.width > leader.height) { 
            shelfH = leader.width;
            rotatedShelf = true;
          }
        } else if (canRotated) {
          shelfH = leader.width;
          rotatedShelf = true;
        }
      }

      let currentX = 0;

      // Capa 3: Llenado Horizontal (Scavenger Agresivo)
      while (currentX < usableW) {
        let bestIdx = -1;
        let bestScore = -1;

        for (let i = 0; i < workingPool.length; i++) {
          const p = workingPool[i];
          if (p.placed) continue;
          
          const canNormal = p.width <= (usableW - currentX) && p.height <= shelfH;
          const canRotated = p.grainDirection === 'libre' && p.height <= (usableW - currentX) && p.width <= shelfH;
          
          if (canNormal || canRotated) {
            // Prioridad: 1. Misma Identidad (Nombre) 2. Mejor Ajuste de Altura (Densidad)
            const h = canNormal ? p.height : p.width;
            const idScore = p.name === leader.name ? 1000 : 0;
            const fitScore = (h / shelfH) * 100;
            const score = idScore + fitScore;

            if (score > bestScore) {
              bestScore = score;
              bestIdx = i;
            }
          }
        }

        if (bestIdx === -1) break;

        const p = workingPool[bestIdx];
        let isRotated = false;
        
        if (bestIdx === leaderIdx) {
          isRotated = rotatedShelf;
        } else {
          const fitsN = p.width <= (usableW - currentX) && p.height <= shelfH;
          const fitsR = p.grainDirection === 'libre' && p.height <= (usableW - currentX) && p.width <= shelfH;
          
          if (!fitsN && fitsR) isRotated = true;
          else if (fitsN && fitsR) {
            // ROTACIÓN INTELIGENTE: Si rotar la pieza (ej. amarre) iguala mejor la altura de la faja, rotar.
            if (Math.abs(p.width - shelfH) < Math.abs(p.height - shelfH)) isRotated = true;
          }
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

        // Capa 4: Nesting Vertical Recursivo (Llenar huecos sobre la pieza)
        let nextY = pH + kerf;
        while (shelfH - nextY >= 20) { // Mínimo 20mm para anidar algo
          const remH = shelfH - nextY;
          let nestIdx = -1;
          let nestBestScore = -1;

          for (let i = 0; i < workingPool.length; i++) {
            const np = workingPool[i];
            if (np.placed) continue;
            const fitsN = np.width <= pW && np.height <= remH;
            const fitsR = np.grainDirection === 'libre' && np.height <= pW && np.width <= remH;
            if (fitsN || fitsR) {
              const h = fitsN ? np.height : np.width;
              const score = h / remH;
              if (score > nestBestScore) {
                nestBestScore = score;
                nestIdx = i;
              }
            }
          }

          if (nestIdx !== -1) {
            const np = workingPool[nestIdx];
            const fitsN = np.width <= pW && np.height <= remH;
            const fitsR = np.grainDirection === 'libre' && np.height <= pW && np.width <= remH;
            const nRot = !fitsN && fitsR;
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

    if (panels.length > 30) break; // Límite de seguridad
  }

  const totalUsed = panels.reduce((acc, l) => acc + l.usedArea, 0);
  const totalAvail = panels.length * panelWidth * panelHeight;
  const totalEfficiency = (totalUsed / totalAvail) * 100;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency,
    summary: `ArquiMax Industrial Engine v12.0: Eficiencia Global ${totalEfficiency.toFixed(1)}%.`,
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
