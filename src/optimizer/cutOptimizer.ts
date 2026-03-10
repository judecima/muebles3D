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
 * ArquiMax Industrial Engine v11.0 (Deterministic)
 * Basado en principios de optimización de guillotina de 4 capas.
 * Panel -> Strips -> Containers -> Pieces (with Recursive Nesting)
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
  
  // 1. Preprocesamiento: Expandir cantidades y ordenar determinísticamente
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

  // Orden Industrial: Área desc -> Lado mayor desc -> Lado menor desc
  pool.sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    if (areaB !== areaA) return areaB - areaA;
    const maxA = Math.max(a.width, a.height);
    const maxB = Math.max(b.width, b.height);
    if (maxB !== maxA) return maxB - maxA;
    return Math.min(b.width, b.height) - Math.min(a.width, a.height);
  });

  if (pool.length === 0) {
    return { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Sin piezas", kerf, trim, selectedThickness };
  }

  const usableW = Math.max(0, panelWidth - (trim * 2));
  const usableH = Math.max(0, panelHeight - (trim * 2));
  const partColors = generateColors(pool);
  const panels: OptimizedPanel[] = [];

  // 2. Proceso de empaquetado por Panel
  while (pool.some(p => !p.placed)) {
    const placedPartsInPanel: OptimizedPart[] = [];
    let currentY = 0;

    // Llenar el panel con fajas horizontales (Strips)
    while (currentY < usableH) {
      // 3. Selección de Pieza Guía para la Faja
      const guideIdx = pool.findIndex(p => !p.placed && 
        ((p.width <= usableW && p.height <= (usableH - currentY)) || 
         (p.grainDirection === 'libre' && p.height <= usableW && p.width <= (usableH - currentY)))
      );

      if (guideIdx === -1) break;

      const guide = pool[guideIdx];
      // Determinar orientación óptima para la guía (maximizar ancho si es posible)
      let canRotate = guide.grainDirection === 'libre';
      let stripH = guide.height;
      let guideW = guide.width;

      if (canRotate && guide.width > guide.height && guide.width <= (usableH - currentY) && guide.height <= usableW) {
        // En este motor jerárquico, priorizamos que la altura de la faja sea la dimensión menor para ahorrar espacio vertical
        [guideW, stripH] = [guide.height, guide.width];
      } else if (canRotate && guide.height > (usableH - currentY)) {
        [guideW, stripH] = [guide.height, guide.width];
      }

      let currentX = 0;

      // 4. Construcción de la Faja (Horizontal Strip)
      while (currentX < usableW) {
        // Buscar mejor pieza para el contenedor actual
        let bestPartIdx = -1;
        let isRotated = false;

        // Prioridad 1: Misma identidad (mismo nombre)
        bestPartIdx = pool.findIndex(p => !p.placed && p.name === guide.name && 
          ((p.width <= (usableW - currentX) && p.height <= stripH) ||
           (p.grainDirection === 'libre' && p.height <= (usableW - currentX) && p.width <= stripH))
        );

        // Prioridad 2: Scavenger (Cualquier pieza que quepa)
        if (bestPartIdx === -1) {
          bestPartIdx = pool.findIndex(p => !p.placed && 
            ((p.width <= (usableW - currentX) && p.height <= stripH) ||
             (p.grainDirection === 'libre' && p.height <= (usableW - currentX) && p.width <= stripH))
          );
        }

        if (bestPartIdx === -1) break;

        const p = pool[bestPartIdx];
        // Decidir rotación del contenedor
        isRotated = false;
        if (p.grainDirection === 'libre') {
          // Si rotada encaja mejor en altura o permite más ancho sobrante
          const fitsNormal = p.width <= (usableW - currentX) && p.height <= stripH;
          const fitsRotated = p.height <= (usableW - currentX) && p.width <= stripH;
          
          if (fitsNormal && fitsRotated) {
             // Priorizar la orientación que más se acerque a la altura de la faja
             isRotated = Math.abs(p.width - stripH) < Math.abs(p.height - stripH);
          } else if (fitsRotated) {
            isRotated = true;
          }
        }

        const actualW = isRotated ? p.height : p.width;
        const actualH = isRotated ? p.width : p.height;

        // Colocar pieza principal
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

        // 5. Nesting Recursivo Vertical dentro del Contenedor
        let nestedY = actualH + kerf;
        while (stripH - nestedY >= 50) { // Mínimo 50mm para nesting industrial
          const remH = stripH - nestedY;
          let bestNestIdx = -1;
          let nestRotated = false;

          // Buscar la pieza que mejor llene el área del hueco vertical
          let bestAreaFit = -1;

          for (let i = 0; i < pool.length; i++) {
            const candidate = pool[i];
            if (candidate.placed) continue;

            // Probar ambas orientaciones
            const canRotateCand = candidate.grainDirection === 'libre';
            const fitsNormal = candidate.width <= actualW && candidate.height <= remH;
            const fitsRotated = canRotateCand && candidate.height <= actualW && candidate.width <= remH;

            if (fitsNormal || fitsRotated) {
              const area = candidate.width * candidate.height;
              if (area > bestAreaFit) {
                bestAreaFit = area;
                bestNestIdx = i;
                // Preferir orientación que llene más el ancho del contenedor
                if (fitsNormal && fitsRotated) {
                  nestRotated = Math.abs(candidate.height - actualW) < Math.abs(candidate.width - actualW);
                } else {
                  nestRotated = fitsRotated;
                }
              }
            }
          }

          if (bestNestIdx !== -1) {
            const nestPart = pool[bestNestIdx];
            const nW = nestRotated ? nestPart.height : nestPart.width;
            const nH = nestRotated ? nestPart.width : nestPart.height;

            placedPartsInPanel.push({
              name: nestPart.name,
              x: currentX,
              y: currentY + nestedY,
              width: nW,
              height: nH,
              rotated: nestRotated,
              color: partColors[nestPart.name]
            });
            nestPart.placed = true;
            nestedY += nH + kerf;
          } else {
            break;
          }
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

  const totalEfficiency = calculateTotalEfficiency(panels);

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency: totalEfficiency,
    summary: `ArquiMax Industrial v11.0: Eficiencia global ${totalEfficiency.toFixed(2)}%. Algoritmo DGP Determinístico.`,
    kerf,
    trim,
    selectedThickness
  };
}

function calculateTotalEfficiency(layouts: OptimizedPanel[]): number {
  if (layouts.length === 0) return 0;
  const used = layouts.reduce((acc, l) => acc + l.usedArea, 0);
  const total = layouts.reduce((acc, l) => acc + l.totalArea, 0);
  return (used / total) * 100;
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 70%, 55%, 0.35)`;
  });
  return colors;
}
