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
 * ArquiMax Industrial Engine v11.0 (DGP - Deterministic Guillotine Packer)
 * Basado en principios de optimización industrial (Layer 1-4).
 * Panel -> Strips -> Containers -> Pieces + Nesting.
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
  
  // 1. Preprocesamiento Determinístico
  let pool: InternalPart[] = filteredParts.flatMap((p, idx) => 
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

  // Orden Industrial: Área desc -> Lado mayor desc
  pool.sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    if (areaB !== areaA) return areaB - areaA;
    return Math.max(b.width, b.height) - Math.max(a.width, a.height);
  });

  if (pool.length === 0) {
    return { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Sin piezas", kerf, trim, selectedThickness };
  }

  const usableW = Math.max(0, panelWidth - (trim * 2));
  const usableH = Math.max(0, panelHeight - (trim * 2));
  const partColors = generateColors(pool);
  const panels: OptimizedPanel[] = [];

  // 2. Empaquetado por Panel
  while (pool.some(p => !p.placed)) {
    const placedPartsInPanel: OptimizedPart[] = [];
    let currentY = 0;

    // Layer 2: Fajas (Strips) horizontales
    while (currentY < usableH) {
      // Seleccionar Pieza Guía (la de mayor área disponible que quepa)
      const guideIdx = pool.findIndex(p => !p.placed && 
        ((p.width <= usableW && p.height <= (usableH - currentY)) || 
         (p.grainDirection === 'libre' && p.height <= usableW && p.width <= (usableH - currentY)))
      );

      if (guideIdx === -1) break;

      const guide = pool[guideIdx];
      // Determinar orientación óptima para la altura de la faja (preferir el lado que deje más espacio arriba)
      let stripH = guide.height;
      let guideW = guide.width;
      let rotatedGuide = false;

      if (guide.grainDirection === 'libre') {
        // Si rotada cabe mejor o permite una faja más baja para ahorrar altura
        if (guide.width < guide.height && guide.width <= (usableH - currentY)) {
          stripH = guide.width;
          guideW = guide.height;
          rotatedGuide = true;
        }
      }

      let currentX = 0;

      // Layer 3: Contenedores dentro de la faja
      while (currentX < usableW) {
        // Buscar mejor pieza para el contenedor (Scavenger + Priority Identity)
        let bestIdx = -1;
        let isRotated = false;

        // Prioridad 1: Pieza con el mismo nombre que la guía
        bestIdx = pool.findIndex(p => !p.placed && p.name === guide.name && 
          ((p.width <= (usableW - currentX) && p.height <= stripH) ||
           (p.grainDirection === 'libre' && p.height <= (usableW - currentX) && p.width <= stripH))
        );

        // Prioridad 2: Cualquier pieza que quepa (Scavenger)
        if (bestIdx === -1) {
          bestIdx = pool.findIndex(p => !p.placed && 
            ((p.width <= (usableW - currentX) && p.height <= stripH) ||
             (p.grainDirection === 'libre' && p.height <= (usableW - currentX) && p.width <= stripH))
          );
        }

        if (bestIdx === -1) break;

        const p = pool[bestIdx];
        isRotated = false;
        
        // Evaluación de rotación inteligente
        if (p.grainDirection === 'libre') {
          const fitsNormal = p.width <= (usableW - currentX) && p.height <= stripH;
          const fitsRotated = p.height <= (usableW - currentX) && p.width <= stripH;
          if (fitsNormal && fitsRotated) {
            // Elegir la orientación que más se acerque a la altura de la faja
            isRotated = Math.abs(p.width - stripH) < Math.abs(p.height - stripH);
          } else if (fitsRotated) {
            isRotated = true;
          }
        }

        const actualW = isRotated ? p.height : p.width;
        const actualH = isRotated ? p.width : p.height;

        // Colocar Pieza (Layer 4)
        placedPartsInPanel.push({
          name: p.name,
          x: currentX,
          y: currentY,
          width: actualW,
          height: actualH,
          rotated: isRotated,
          color: partColors[p.name]
        });
        p.placed = true;

        // Nesting Vertical dentro del Contenedor (Recursivo)
        let nestedY = actualH + kerf;
        while (stripH - nestedY >= 50) {
          const remH = stripH - nestedY;
          let bestNestIdx = pool.findIndex(np => !np.placed && 
            ((np.width <= actualW && np.height <= remH) ||
             (np.grainDirection === 'libre' && np.height <= actualW && np.width <= remH))
          );

          if (bestNestIdx !== -1) {
            const np = pool[bestNestIdx];
            let nRot = false;
            if (np.grainDirection === 'libre') {
               const nNormal = np.width <= actualW && np.height <= remH;
               const nRotated = np.height <= actualW && np.width <= remH;
               if (nNormal && nRotated) {
                 nRot = Math.abs(np.height - actualW) < Math.abs(np.width - actualW);
               } else if (nRotated) {
                 nRot = true;
               }
            }
            const nW = nRot ? np.height : np.width;
            const nH = nRot ? np.width : np.height;

            placedPartsInPanel.push({
              name: np.name,
              x: currentX,
              y: currentY + nestedY,
              width: nW,
              height: nH,
              rotated: nRot,
              color: partColors[np.name]
            });
            np.placed = true;
            nestedY += nH + kerf;
          } else break;
        }

        currentX += actualW + kerf;
      }
      currentY += stripH + kerf;
    }

    if (placedPartsInPanel.length === 0) break;

    panels.push({
      panelNumber: panels.length + 1,
      parts: placedPartsInPanel,
      efficiency: (placedPartsInPanel.reduce((acc, p) => acc + (p.width * p.height), 0) / (usableW * usableH)) * 100,
      usedArea: placedPartsInPanel.reduce((acc, p) => acc + (p.width * p.height), 0),
      totalArea: usableW * usableH
    });

    if (panels.length > 50) break; // Límite de seguridad
  }

  const totalUsed = panels.reduce((acc, l) => acc + l.usedArea, 0);
  const totalArea = usableW * usableH * panels.length;
  const totalEfficiency = (totalUsed / totalArea) * 100;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency: totalEfficiency,
    summary: `ArquiMax Industrial Engine v11.0: Eficiencia global ${totalEfficiency.toFixed(2)}%. Algoritmo DGP Determinístico.`,
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
