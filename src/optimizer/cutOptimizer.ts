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
 * ArquiMax Deep Engine v7.5 (Multi-Strategy Guillotine)
 * Optimizado para Medio Panel Vertical (Corte a los 1375mm).
 * Maximiza compactación eliminando espacios innecesarios entre piezas.
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

  // Estrategias de empaquetado: Horizontal Strips vs Vertical Strips
  const strategies: ('horizontal' | 'vertical')[] = ['horizontal', 'vertical'];

  for (let i = 0; i < ITERATIONS; i++) {
    const currentParts = [...flatParts];
    const strategy = strategies[i % strategies.length];
    
    // Variamos el orden de las piezas para explorar el espacio de soluciones
    if (i % 4 === 0) currentParts.sort((a, b) => b.height - a.height || b.width - a.width);
    else if (i % 4 === 1) currentParts.sort((a, b) => b.width - a.width || b.height - a.height);
    else if (i % 4 === 2) currentParts.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    else shuffle(currentParts);

    const currentLayouts = executeGuillotineStrategy(currentParts, usableW, usableH, kerf, partColors, strategy);
    
    // El "Medio Panel" de Red Arquimax es un corte vertical a la mitad del largo (1375mm)
    const halfWidth = usableW / 2;
    const score = calculateScore(currentLayouts, halfWidth);

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
    summary: `ArquiMax v7.5: Eficiencia ${efficiency.toFixed(2)}%. Prioridad: Compactación Industrial y Medio Panel (1375mm).`,
    kerf,
    trim,
    selectedThickness
  };
}

/**
 * Ejecuta una estrategia de empaquetado por franjas (Strip Packing) con compactación vertical.
 */
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

        // Buscamos la pieza más alta para liderar la franja
        for (let i = 0; i < remainingParts.length; i++) {
          if (placedInThisPanel.has(i)) continue;
          const p = remainingParts[i];
          if (p.width <= w && p.height <= (h - currentY)) { 
            stripLeaderIdx = i; stripLeaderRotated = false; break; 
          }
          if (p.grainDirection === 'libre' && p.height <= w && p.width <= (h - currentY)) { 
            stripLeaderIdx = i; stripLeaderRotated = true; break; 
          }
        }
        if (stripLeaderIdx === -1) break;

        const firstPart = remainingParts[stripLeaderIdx];
        const stripH = stripLeaderRotated ? firstPart.width : firstPart.height;
        let currentX = 0;

        // Llenamos la franja horizontalmente
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

          // COMPACTACIÓN VERTICAL: Llenamos el alto de la franja apilando piezas
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
    } else {
      // Estrategia de Franjas Verticales (útil cuando se busca liberar medio panel lateral)
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

          // Compactación Horizontal dentro de la franja vertical
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
            placedParts.push({ 
              name: p.name, 
              x: currentX + stackX, 
              y: currentY, 
              width: fW, 
              height: fH, 
              rotated: pRot, 
              color: partColors[p.name] 
            });
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

/**
 * Calcula el puntaje de una solución. Favorece la compactación y liberar la mitad derecha (1375mm).
 */
function calculateScore(layouts: OptimizedPanel[], halfWidth: number): number {
  if (layouts.length === 0) return -Infinity;
  const firstPanel = layouts[0];
  const maxX = firstPanel.parts.reduce((max, p) => Math.max(max, p.x + p.width), 0);
  
  // Eficiencia base del panel
  let score = firstPanel.efficiency;
  
  // BONO: Si cabe en medio panel (1375mm), damos un incentivo enorme.
  if (maxX <= halfWidth) {
    score += 5000; 
  }
  
  // BONO COMPACTACIÓN: Premiamos layouts donde el maxX sea menor (piezas más juntas a la izquierda).
  score += (1 - (maxX / (halfWidth * 2))) * 1000;

  // PENALIZACIÓN: Cada tablero extra reduce drásticamente el score.
  score -= (layouts.length - 1) * 10000;
  
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
