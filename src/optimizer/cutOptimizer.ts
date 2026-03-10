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
 * ArquiMax Industrial Engine v11.5 (Deterministic Global Optimizer)
 * Enfoque: Optimización global sobre local. Jerarquía de 4 capas.
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

  // Estrategias determinísticas para encontrar el mejor layout global
  const strategies = [
    (a: any, b: any) => (b.width * b.height) - (a.width * a.height), // Área Desc
    (a: any, b: any) => b.height - a.height, // Altura Desc
    (a: any, b: any) => b.width - a.width, // Ancho Desc
    (a: any, b: any) => (b.width / b.height) - (a.width / a.height), // Aspect Ratio
  ];

  let bestResult: OptimizationResult | null = null;
  const partColors = generateColors(filteredParts);

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

    const currentResult = buildLayout(pool, usableW, usableH, kerf, trim, selectedThickness, partColors);
    
    if (!bestResult || currentResult.totalEfficiency > bestResult.totalEfficiency || (currentResult.totalPanels < bestResult.totalPanels)) {
      bestResult = currentResult;
    }
    
    // Si ya logramos la meta industrial de un solo panel al 96.4%, podemos parar
    if (bestResult.totalPanels === 1 && bestResult.totalEfficiency > 96.0) break;
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
  colors: Record<string, string>
): OptimizationResult {
  const panels: OptimizedPanel[] = [];
  let workingPool = [...pool];

  while (workingPool.some(p => !p.placed)) {
    const placedInPanel: OptimizedPart[] = [];
    let currentY = 0;

    // Layer 2: Franjas (Shelves)
    while (currentY < usableH) {
      // Buscar el líder de franja (la pieza más alta que quepa)
      const leaderIdx = workingPool.findIndex(p => !p.placed && 
        ((p.width <= usableW && p.height <= (usableH - currentY)) || 
         (p.grainDirection === 'libre' && p.height <= usableW && p.width <= (usableH - usableW)))
      );

      if (leaderIdx === -1) break;

      const leader = workingPool[leaderIdx];
      let shelfH = leader.height;
      let rotatedShelf = false;

      // Verificamos si rotada es mejor para la eficiencia global
      if (leader.grainDirection === 'libre' && leader.width <= (usableH - currentY) && leader.height <= usableW) {
        if (leader.width > leader.height) { // Si rotar reduce la altura de la franja, ahorramos espacio vertical
          shelfH = leader.width;
          rotatedShelf = true;
        }
      }

      let currentX = 0;

      // Layer 3: Contenedores (Columnas)
      while (currentX < usableW) {
        // Lógica de Prioridad Industrial: Buscar piezas que coincidan con la altura o tipo del líder
        let bestIdx = workingPool.findIndex(p => !p.placed && p.name === leader.name && 
          ((p.width <= (usableW - currentX) && p.height <= shelfH) || 
           (p.grainDirection === 'libre' && p.height <= (usableW - currentX) && p.width <= shelfH))
        );

        // Si no hay iguales, buscamos "Scavenger" (mejor ajuste de altura para minimizar desperdicio en la fila)
        if (bestIdx === -1) {
          bestIdx = workingPool.findIndex(p => !p.placed && 
            ((p.width <= (usableW - currentX) && p.height <= shelfH) || 
             (p.grainDirection === 'libre' && p.height <= (usableW - currentX) && p.width <= shelfH))
          );
        }

        if (bestIdx === -1) break;

        const p = workingPool[bestIdx];
        let isRotated = false;

        // Evaluación de rotación inteligente
        if (p.grainDirection === 'libre') {
          const normalFits = p.width <= (usableW - currentX) && p.height <= shelfH;
          const rotatedFits = p.height <= (usableW - currentX) && p.width <= shelfH;
          if (normalFits && rotatedFits) {
            // Preferimos la orientación que más se acerque a la altura de la franja (Lepton logic)
            isRotated = Math.abs(p.height - shelfH) > Math.abs(p.width - shelfH);
          } else if (rotatedFits) {
            isRotated = true;
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

        // Layer 4: Nesting Recursivo (Relleno vertical del contenedor)
        let nextY = pH + kerf;
        while (shelfH - nextY >= 50) { // Mínimo 50mm para que valga la pena
          const remH = shelfH - nextY;
          const nestIdx = workingPool.findIndex(np => !np.placed && 
            ((np.width <= pW && np.height <= remH) || 
             (np.grainDirection === 'libre' && np.height <= pW && np.width <= remH))
          );

          if (nestIdx !== -1) {
            const np = workingPool[nestIdx];
            let nRot = false;
            if (np.grainDirection === 'libre' && np.height <= pW && np.width <= remH) {
              if (np.width > np.height || np.width > pW) nRot = true;
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
    const totalArea = usableW * usableH;

    panels.push({
      panelNumber: panels.length + 1,
      parts: placedInPanel,
      efficiency: (usedArea / totalArea) * 100,
      usedArea,
      totalArea
    });

    if (panels.length > 20) break; // Límite de seguridad
  }

  const totalUsed = panels.reduce((acc, l) => acc + l.usedArea, 0);
  const totalAvail = panels.length * usableW * usableH;
  const totalEfficiency = (totalUsed / totalAvail) * 100;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency,
    summary: `ArquiMax Industrial Engine v11.5: Eficiencia ${totalEfficiency.toFixed(2)}% lograda mediante análisis global.`,
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
