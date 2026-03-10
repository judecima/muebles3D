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
 * ArquiMax Deep Engine v7.0 (Multi-Strategy Guillotine)
 * Soporta optimización orientada a Medio Panel Horizontal y evaluación de cortes V-H-V.
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

  const ITERATIONS = 3000;
  let bestScore = -Infinity;
  let bestLayouts: OptimizedPanel[] = [];

  // Probamos estrategias de orientación (H-V-H vs V-H-V)
  const strategies: ('horizontal' | 'vertical')[] = ['horizontal', 'vertical'];

  for (let i = 0; i < ITERATIONS; i++) {
    const currentParts = [...flatParts];
    const strategy = strategies[i % strategies.length];
    
    // Mezcla de ordenamiento para encontrar el mejor "packing"
    if (i % 4 === 0) currentParts.sort((a, b) => b.height - a.height || b.width - a.width);
    else if (i % 4 === 1) currentParts.sort((a, b) => b.width - a.width || b.height - a.height);
    else if (i % 4 === 2) currentParts.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    else shuffle(currentParts);

    const currentLayouts = executeGuillotineStrategy(currentParts, usableW, usableH, kerf, partColors, strategy);
    const score = calculateScore(currentLayouts, panelHeight / 2);

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
    summary: `ArquiMax v7.0 (Optimized): Eficiencia ${efficiency.toFixed(2)}%. Venta mínima: Medio Panel Horizontal.`,
    kerf,
    trim,
    selectedThickness
  };
}

function executeGuillotineStrategy(
  parts: PartToCut[], 
  w: number, 
  h: number, 
  kerf: number,
  partColors: Record<string, string>,
  orientation: 'horizontal' | 'vertical'
): OptimizedPanel[] {
  const panels: OptimizedPanel[] = [];
  let remainingParts = [...parts];

  while (remainingParts.length > 0) {
    const placedParts: OptimizedPart[] = [];
    const placedInThisPanel = new Set<number>();
    
    if (orientation === 'horizontal') {
      let currentY = 0;
      while (currentY < h && remainingParts.length > 0) {
        let stripLeaderIdx = -1;
        let stripLeaderRotated = false;

        for (let i = 0; i < remainingParts.length; i++) {
          if (placedInThisPanel.has(i)) continue;
          const p = remainingParts[i];
          if (p.width <= w && p.height <= (h - currentY)) { stripLeaderIdx = i; stripLeaderRotated = false; break; }
          if (p.grainDirection === 'libre' && p.height <= w && p.width <= (h - currentY)) { stripLeaderIdx = i; stripLeaderRotated = true; break; }
        }
        if (stripLeaderIdx === -1) break;

        const firstPart = remainingParts[stripLeaderIdx];
        const stripH = stripLeaderRotated ? firstPart.width : firstPart.height;
        let currentX = 0;

        while (currentX < w && remainingParts.length > 0) {
          let stackLeaderIdx = -1;
          let stackLeaderRotated = false;
          for (let i = 0; i < remainingParts.length; i++) {
            if (placedInThisPanel.has(i)) continue;
            const p = remainingParts[i];
            const canFit = p.width <= (w - currentX) && p.height <= stripH;
            const canFitRot = p.grainDirection === 'libre' && p.height <= (w - currentX) && p.width <= stripH;
            if (canFit || canFitRot) {
              stackLeaderIdx = i;
              stackLeaderRotated = canFitRot && (!canFit || p.width < p.height);
              break;
            }
          }
          if (stackLeaderIdx === -1) break;

          const stackLeader = remainingParts[stackLeaderIdx];
          const stackW = stackLeaderRotated ? stackLeader.height : stackLeader.width;
          let stackY = 0;

          while (stackY < stripH && remainingParts.length > 0) {
            let partInStackIdx = -1;
            let partInStackRotated = false;
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
            placedParts.push({ name: p.name, x: currentX, y: currentY + stackY, width: finalW, height: finalH, rotated: partInStackRotated, color: partColors[p.name] });
            stackY += finalH + kerf;
            placedInThisPanel.add(partInStackIdx);
          }
          currentX += stackW + kerf;
        }
        currentY += stripH + kerf;
      }
    } else {
      // Estrategia Vertical (V-H-V)
      let currentX = 0;
      while (currentX < w && remainingParts.length > 0) {
        let stripLeaderIdx = -1;
        let stripLeaderRotated = false;
        for (let i = 0; i < remainingParts.length; i++) {
          if (placedInThisPanel.has(i)) continue;
          const p = remainingParts[i];
          if (p.height <= h && p.width <= (w - currentX)) { stripLeaderIdx = i; stripLeaderRotated = false; break; }
          if (p.grainDirection === 'libre' && p.width <= h && p.height <= (w - currentX)) { stripLeaderIdx = i; stripLeaderRotated = true; break; }
        }
        if (stripLeaderIdx === -1) break;

        const firstPart = remainingParts[stripLeaderIdx];
        const stripW = stripLeaderRotated ? firstPart.height : firstPart.width;
        let currentY = 0;

        while (currentY < h && remainingParts.length > 0) {
          let stackLeaderIdx = -1;
          let stackLeaderRotated = false;
          for (let i = 0; i < remainingParts.length; i++) {
            if (placedInThisPanel.has(i)) continue;
            const p = remainingParts[i];
            const canFit = p.height <= (h - currentY) && p.width <= stripW;
            const canFitRot = p.grainDirection === 'libre' && p.width <= (h - currentY) && p.height <= stripW;
            if (canFit || canFitRot) {
              stackLeaderIdx = i;
              stackLeaderRotated = canFitRot && (!canFit || p.height < p.width);
              break;
            }
          }
          if (stackLeaderIdx === -1) break;

          const stackLeader = remainingParts[stackLeaderIdx];
          const stackH = stackLeaderRotated ? stackLeader.width : stackLeader.height;
          let stackX = 0;

          while (stackX < stripW && remainingParts.length > 0) {
            let pIdx = -1;
            let pRot = false;
            for (let i = 0; i < remainingParts.length; i++) {
              if (placedInThisPanel.has(i)) continue;
              const p = remainingParts[i];
              const canFit = p.height <= stackH && p.width <= (stripW - stackX);
              const canFitRot = p.grainDirection === 'libre' && p.width <= stackH && p.height <= (stripW - stackX);
              if (canFit || canFitRot) { pIdx = i; pRot = canFitRot; break; }
            }
            if (pIdx === -1) break;

            const p = remainingParts[pIdx];
            const fW = pRot ? p.height : p.width;
            const fH = pRot ? p.width : p.height;
            placedParts.push({ name: p.name, x: currentX + stackX, y: currentY, width: fW, height: fH, rotated: pRot, color: partColors[p.name] });
            stackX += fW + kerf;
            placedInThisPanel.add(pIdx);
          }
          currentY += stackH + kerf;
        }
        currentX += stripW + kerf;
      }
    }

    if (placedInThisPanel.size === 0) break;
    const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
    panels.push({ panelNumber: panels.length + 1, parts: placedParts, efficiency: (usedArea / (w * h)) * 100, usedArea, totalArea: w * h });
    remainingParts = remainingParts.filter((_, idx) => !placedInThisPanel.has(idx));
  }
  return panels;
}

function calculateScore(layouts: OptimizedPanel[], halfHeight: number): number {
  if (layouts.length === 0) return -Infinity;
  const firstPanel = layouts[0];
  const maxY = firstPanel.parts.reduce((max, p) => Math.max(max, p.y + p.height), 0);
  
  // Bonus si cabe en medio panel horizontal
  let score = firstPanel.efficiency;
  if (maxY <= halfHeight) score += 100;
  
  // Penalización por paneles extra
  score -= (layouts.length - 1) * 500;
  return score;
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
