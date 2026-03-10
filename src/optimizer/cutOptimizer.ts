import { GrainDirection, OptimizationResult, OptimizedPanel, OptimizedPart } from '@/lib/types';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PartToCut {
  name: string;
  width: number;
  height: number;
  grainDirection: GrainDirection;
  thickness: number;
}

/**
 * ArquiMax Deep Engine v6.0 (3-Stage Guillotine with Stacking)
 * Implementa una estrategia de empaquetado por franjas horizontales,
 * permitiendo apilamiento vertical (V-Stacks) dentro de cada sección para maximizar eficiencia.
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
  
  const flatParts: PartToCut[] = filteredParts.flatMap(p => 
    Array.from({ length: p.quantity }, () => ({
      name: p.name,
      width: p.width,
      height: p.height,
      grainDirection: p.grainDirection,
      thickness: p.thickness
    }))
  );

  if (flatParts.length === 0) {
    return { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Sin piezas", kerf, trim, selectedThickness };
  }

  const usableW = Math.max(0, panelWidth - (trim * 2));
  const usableH = Math.max(0, panelHeight - (trim * 2));
  const partColors = generateColors(flatParts);

  const ITERATIONS = 2000;
  let bestScore = -Infinity;
  let bestLayouts: OptimizedPanel[] = [];

  // Probamos diferentes criterios de ordenamiento
  const sortMethods = ['height', 'area', 'width', 'shuffle'];

  for (let i = 0; i < ITERATIONS; i++) {
    const currentParts = [...flatParts];
    const sortMethod = sortMethods[i % sortMethods.length];
    
    if (sortMethod === 'height') {
      currentParts.sort((a, b) => b.height - a.height || b.width - a.width);
    } else if (sortMethod === 'area') {
      currentParts.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    } else if (sortMethod === 'shuffle') {
      shuffle(currentParts);
    }

    const currentLayouts = execute3StageGuillotine(currentParts, usableW, usableH, kerf, partColors);
    const score = calculateScore(currentLayouts);

    if (score > bestScore) {
      bestScore = score;
      bestLayouts = JSON.parse(JSON.stringify(currentLayouts));
    }
  }

  const efficiency = calculateTotalEfficiency(bestLayouts);

  return {
    optimizedLayout: bestLayouts,
    totalPanels: bestLayouts.length,
    totalEfficiency: efficiency,
    summary: `ArquiMax v6.0 (Stacked): Guillotina 3-Etapas. Eficiencia: ${efficiency.toFixed(2)}%`,
    kerf,
    trim,
    selectedThickness
  };
}

/**
 * Ejecuta una guillotina de 3 etapas (H-V-H)
 * 1. Franjas Horizontales (H-Cuts)
 * 2. Columnas Verticales (V-Cuts)
 * 3. Apilamiento Horizontal (Stacking H-Cuts)
 */
function execute3StageGuillotine(
  parts: PartToCut[], 
  w: number, 
  h: number, 
  kerf: number,
  partColors: Record<string, string>
): OptimizedPanel[] {
  const panels: OptimizedPanel[] = [];
  let remainingParts = [...parts];

  while (remainingParts.length > 0) {
    const placedParts: OptimizedPart[] = [];
    let currentY = 0;
    const placedInThisPanel = new Set<number>();

    // ETAPA 1: Generar Franjas Horizontales
    while (currentY < h && remainingParts.length > 0) {
      let stripLeaderIdx = -1;
      let stripLeaderRotated = false;

      // Buscar el líder de la franja (la pieza más alta que quepa)
      for (let i = 0; i < remainingParts.length; i++) {
        if (placedInThisPanel.has(i)) continue;
        const p = remainingParts[i];
        
        if (p.width <= w && p.height <= (h - currentY)) {
          stripLeaderIdx = i;
          stripLeaderRotated = false;
          break;
        }
        if (p.grainDirection === 'libre' && p.height <= w && p.width <= (h - currentY)) {
          stripLeaderIdx = i;
          stripLeaderRotated = true;
          break;
        }
      }

      if (stripLeaderIdx === -1) break;

      const firstPart = remainingParts[stripLeaderIdx];
      const stripH = stripLeaderRotated ? firstPart.width : firstPart.height;
      let currentX = 0;

      // ETAPA 2: Llenar la franja con Columnas (Stacks)
      while (currentX < w && remainingParts.length > 0) {
        let stackLeaderIdx = -1;
        let stackLeaderRotated = false;

        // Buscar líder de la columna (que quepa en el ancho remanente y alto de la franja)
        for (let i = 0; i < remainingParts.length; i++) {
          if (placedInThisPanel.has(i)) continue;
          const p = remainingParts[i];
          const canFit = p.width <= (w - currentX) && p.height <= stripH;
          const canFitRot = p.grainDirection === 'libre' && p.height <= (w - currentX) && p.width <= stripH;

          if (canFit || canFitRot) {
            stackLeaderIdx = i;
            stackLeaderRotated = canFitRot && (!canFit || p.width < p.height); // Preferimos rotar si ayuda al ancho
            break;
          }
        }

        if (stackLeaderIdx === -1) break;

        const stackLeader = remainingParts[stackLeaderIdx];
        const stackW = stackLeaderRotated ? stackLeader.height : stackLeader.width;
        let stackY = 0;

        // ETAPA 3: Apilar verticalmente dentro de la columna
        while (stackY < stripH && remainingParts.length > 0) {
          let partInStackIdx = -1;
          let partInStackRotated = false;

          // Buscar pieza que quepa en el ancho de la columna y el alto remanente de la columna
          for (let i = 0; i < remainingParts.length; i++) {
            if (placedInThisPanel.has(i)) continue;
            const p = remainingParts[i];
            
            const canFit = p.width <= stackW && p.height <= (stripH - stackY);
            const canFitRot = p.grainDirection === 'libre' && p.height <= stackW && p.width <= (stripH - stackY);

            if (canFit || canFitRot) {
              partInStackIdx = i;
              partInStackRotated = canFitRot && (!canFit || Math.abs(p.width - stackW) < Math.abs(p.height - stackW));
              break;
            }
          }

          if (partInStackIdx === -1) break;

          const p = remainingParts[partInStackIdx];
          const finalW = partInStackRotated ? p.height : p.width;
          const finalH = partInStackRotated ? p.width : p.height;

          placedParts.push({
            name: p.name,
            x: currentX,
            y: currentY + stackY,
            width: finalW,
            height: finalH,
            rotated: partInStackRotated,
            color: partColors[p.name]
          });

          stackY += finalH + kerf;
          placedInThisPanel.add(partInStackIdx);
        }

        currentX += stackW + kerf;
      }

      currentY += stripH + kerf;
    }

    if (placedInThisPanel.size === 0) break;

    const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
    panels.push({
      panelNumber: panels.length + 1,
      parts: placedParts,
      efficiency: (usedArea / (w * h)) * 100,
      usedArea,
      totalArea: w * h
    });

    remainingParts = remainingParts.filter((_, idx) => !placedInThisPanel.has(idx));
  }

  return panels;
}

function calculateScore(layouts: OptimizedPanel[]): number {
  if (layouts.length === 0) return -Infinity;
  const mainEfficiency = layouts[0].efficiency;
  // Penalizamos fuerte el uso de tableros extra
  const panelPenalty = (layouts.length - 1) * 500;
  return mainEfficiency - panelPenalty;
}

function calculateTotalEfficiency(layouts: OptimizedPanel[]): number {
  if (layouts.length === 0) return 0;
  const used = layouts.reduce((acc, l) => acc + l.usedArea, 0);
  const total = layouts.reduce((acc, l) => acc + l.totalArea, 0);
  return (used / total) * 100;
}

function shuffle(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function generateColors(parts: PartToCut[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 70%, 50%, 0.35)`;
  });
  return colors;
}
