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
 * Evalúa múltiples estrategias determinísticas y selecciona la de mayor eficiencia global.
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

  // ESTRATEGIAS DETERMINÍSTICAS (Heurísticas Industriales)
  // Probamos diferentes criterios de ordenamiento para encontrar el mejor layout global
  const strategies = [
    (a: any, b: any) => (b.width * b.height) - (a.width * a.height), // Área Desc (Estándar)
    (a: any, b: any) => b.height - a.height, // Altura Desc (Shelf-First)
    (a: any, b: any) => b.width - a.width, // Ancho Desc
    (a: any, b: any) => Math.max(b.width, b.height) - Math.max(a.width, a.height), // Lado Mayor Desc
    (a: any, b: any) => (b.width / b.height) - (a.width / a.height), // Ratio de aspecto
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

    // Aplicar estrategia de ordenamiento
    pool.sort(strategy);

    // Construir layout para esta estrategia
    const currentResult = buildLayout(pool, usableW, usableH, kerf, trim, selectedThickness, partColors);
    
    // El mejor resultado es el que maximiza la eficiencia global (o minimiza paneles)
    if (!bestResult || 
        currentResult.totalPanels < bestResult.totalPanels || 
        (currentResult.totalPanels === bestResult.totalPanels && currentResult.totalEfficiency > bestResult.totalEfficiency)) {
      bestResult = currentResult;
    }
    
    // Meta Industrial: Si ya consolidamos en 1 panel con eficiencia superior al 96%, es óptimo
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
  let workingPool = pool.map(p => ({ ...p })); // Clon para esta estrategia

  while (workingPool.some(p => !p.placed)) {
    const placedInPanel: OptimizedPart[] = [];
    let currentY = 0;

    // Layer 2: Franjas (Shelves) - Guillotina Horizontal
    while (currentY < usableH) {
      // Buscar el líder de franja (la pieza más alta que quepa)
      const leaderIdx = workingPool.findIndex(p => !p.placed && 
        ((p.width <= usableW && p.height <= (usableH - currentY)) || 
         (p.grainDirection === 'libre' && p.height <= usableW && p.width <= (usableH - currentY)))
      );

      if (leaderIdx === -1) break;

      const leader = workingPool[leaderIdx];
      let shelfH = leader.height;
      let rotatedShelf = false;

      // Evaluación inteligente de rotación para el líder (Prioridad Global)
      if (leader.grainDirection === 'libre' && leader.width <= (usableH - currentY) && leader.height <= usableW) {
        // Si al rotar la pieza líder, el desperdicio en la fila es similar pero la altura consumida es menor, rotamos
        if (leader.width < leader.height) {
          shelfH = leader.width;
          rotatedShelf = true;
        }
      }

      let currentX = 0;

      // Layer 3: Contenedores (Columnas)
      while (currentX < usableW) {
        // Lógica de Selección Industrial: 
        // 1. Intentar piezas con el mismo código/nombre que el líder (Identidad)
        // 2. Si no, piezas que mejor ajusten a la altura de la franja (Scavenger)
        let bestIdx = workingPool.findIndex(p => !p.placed && p.name === leader.name && 
          ((p.width <= (usableW - currentX) && p.height <= shelfH) || 
           (p.grainDirection === 'libre' && p.height <= (usableW - currentX) && p.width <= shelfH))
        );

        if (bestIdx === -1) {
          // Scavenger: Buscar la pieza que minimice el desperdicio de altura en esta columna
          let minHeightDiff = Infinity;
          for (let i = 0; i < workingPool.length; i++) {
            const p = workingPool[i];
            if (p.placed) continue;
            
            // Probar normal
            if (p.width <= (usableW - currentX) && p.height <= shelfH) {
              const diff = shelfH - p.height;
              if (diff < minHeightDiff) {
                minHeightDiff = diff;
                bestIdx = i;
              }
            }
            // Probar rotada
            if (p.grainDirection === 'libre' && p.height <= (usableW - currentX) && p.width <= shelfH) {
              const diff = shelfH - p.width;
              if (diff < minHeightDiff) {
                minHeightDiff = diff;
                bestIdx = i;
              }
            }
          }
        }

        if (bestIdx === -1) break;

        const p = workingPool[bestIdx];
        let isRotated = false;

        // Decisión final de rotación para la columna
        if (p.grainDirection === 'libre') {
          const normalFits = p.width <= (usableW - currentX) && p.height <= shelfH;
          const rotatedFits = p.height <= (usableW - currentX) && p.width <= shelfH;
          if (normalFits && rotatedFits) {
            // Elegimos la rotación que deje la altura más cercana al líder (Lepton logic)
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

        // Layer 4: Nesting Recursivo (Relleno de altura dentro de la columna)
        let nextY = pH + kerf;
        while (shelfH - nextY >= 10) { // Margen mínimo
          const remH = shelfH - nextY;
          const nestIdx = workingPool.findIndex(np => !np.placed && 
            ((np.width <= pW && np.height <= remH) || 
             (np.grainDirection === 'libre' && np.height <= pW && np.width <= remH))
          );

          if (nestIdx !== -1) {
            const np = workingPool[nestIdx];
            let nRot = false;
            if (np.grainDirection === 'libre' && np.height <= pW && np.width <= remH) {
              // Favorecer la rotación que mejor use el ancho de la columna
              if (Math.abs(np.height - pW) > Math.abs(np.width - pW)) nRot = true;
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
    summary: `ArquiMax Industrial Engine v11.5: Análisis Global determinístico completado.`,
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
