
import { GrainDirection, OptimizationResult, OptimizedPanel, OptimizedPart, PanelStats } from '../../lib/types';

interface InternalPart {
  name: string;
  width: number;
  height: number;
  grainDirection: GrainDirection;
  thickness: number;
  originalIndex: number;
  placed: boolean;
}

interface FreeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * JADSI Industrial Engine v39.0 - OR-Tools Inspired Solver
 * Implementa búsqueda heurística avanzada con balance de stock reutilizable.
 */
export function runOptimization(
  parts: { name: string; width: number; height: number; quantity: number; grainDirection: GrainDirection; thickness: number }[],
  panelWidth: number,
  panelHeight: number,
  selectedThickness: number,
  hasGrain: boolean,
  kerf: number = 4.5,
  trim: number = 10
): OptimizationResult {
  const filteredParts = parts.filter(p => p.thickness === selectedThickness);
  
  if (filteredParts.length === 0) {
    return { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Sin piezas", kerf, trim, selectedThickness };
  }

  const usableW = Math.max(0, panelWidth - (trim * 2));
  const usableH = Math.max(0, panelHeight - (trim * 2));
  const partColors = generateColors(filteredParts);

  let globalPool: InternalPart[] = filteredParts.flatMap((p, idx) => 
    Array.from({ length: p.quantity }, () => ({
      ...p,
      originalIndex: idx,
      placed: false
    }))
  );

  const finalPanels: OptimizedPanel[] = [];
  let panelCounter = 1;

  while (globalPool.some(p => !p.placed)) {
    let bestPanelForThisStep: OptimizedPanel | null = null;
    let bestScore = -Infinity;

    // Simulación de búsqueda por restricciones (CP Search)
    const iterations = 12000;
    const targetEfficiency = 96.5;

    for (let iter = 0; iter < iterations; iter++) {
      const currentAvailablePieces = globalPool.filter(p => !p.placed).map(p => ({ ...p }));
      
      // Heurísticas de ordenamiento variables
      if (iter === 0) {
        currentAvailablePieces.sort((a, b) => (b.width * b.height) - (a.width * a.height));
      } else if (iter < 2000) {
        currentAvailablePieces.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
      } else {
        // Shuffle aleatorio inteligente (OR-Tools style Randomized Search)
        smartShuffle(currentAvailablePieces);
      }

      const strategies: ('horizontal' | 'vertical')[] = ['horizontal', 'vertical'];
      
      for (const strategy of strategies) {
        const attempt = fillSinglePanel(
          currentAvailablePieces,
          usableW,
          usableH,
          kerf,
          trim,
          panelWidth,
          panelHeight,
          partColors,
          strategy,
          hasGrain,
          panelCounter
        );

        // Función de evaluación de calidad industrial
        const currentScore = evaluatePanelQuality(attempt, panelWidth, panelHeight);
        
        if (currentScore > bestScore) {
          bestScore = currentScore;
          bestPanelForThisStep = attempt;
        }
      }

      // Criterio de parada temprana (Optimización encontrada)
      if (bestPanelForThisStep && bestPanelForThisStep.efficiency >= targetEfficiency) {
        const hasMajorLeftover = (bestPanelForThisStep.leftovers || []).some(l => Math.min(l.width, l.height) >= 500);
        if (hasMajorLeftover) break;
      }
    }

    if (bestPanelForThisStep && bestPanelForThisStep.parts.length > 0) {
      bestPanelForThisStep.parts.forEach(placedPart => {
        if (placedPart.isLeftover) return;
        
        const match = globalPool.find(p => 
          !p.placed && 
          p.name === placedPart.name && 
          ((placedPart.rotated ? p.height : p.width) === placedPart.width) &&
          ((placedPart.rotated ? p.width : p.height) === placedPart.height)
        );
        if (match) match.placed = true;
      });

      finalPanels.push(bestPanelForThisStep);
      panelCounter++;
    } else {
      break; 
    }
  }

  const totalUsedArea = finalPanels.reduce((acc, p) => acc + p.usedArea, 0);
  const totalAvailArea = finalPanels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: finalPanels,
    totalPanels: finalPanels.length,
    totalEfficiency: finalPanels.length > 0 ? (totalUsedArea / totalAvailArea) * 100 : 0,
    summary: `JADSI v39.0 - OR-Tools Search Engine: Búsqueda heurística completada en ${panelCounter - 1} tableros con balance de stock reutilizable.`,
    kerf,
    trim,
    selectedThickness
  };
}

function fillSinglePanel(
  pieces: InternalPart[], 
  usableW: number, 
  usableH: number, 
  kerf: number, 
  trim: number, 
  panelWidth: number,
  panelHeight: number,
  colors: Record<string, string>,
  strategy: 'vertical' | 'horizontal',
  hasGrain: boolean,
  panelNumber: number
): OptimizedPanel {
  const placedParts: OptimizedPart[] = [];
  const freeRects: FreeRect[] = [{ x: trim, y: trim, width: usableW, height: usableH }];
  const leftovers: OptimizedPart[] = [];
  const uniqueStrips = new Set<number>();

  while (freeRects.length > 0) {
    // Ordenamiento según estrategia de guillotina
    freeRects.sort((a, b) => {
      if (strategy === 'horizontal') return (a.y - b.y) || (a.x - b.x);
      return (a.x - b.x) || (a.y - b.y);
    });

    const r = freeRects.shift()!;
    if (r.width < 1 || r.height < 1) continue;

    let bestPieceIdx = -1;
    let bestScore = -1;
    let rotated = false;

    for (let i = 0; i < pieces.length; i++) {
      const part = pieces[i];
      if (part.placed) continue;

      // Fit Normal
      if (part.width <= r.width && part.height <= r.height) {
        const score = calculateIndustrialScore(part.width, part.height, r, strategy);
        if (score > bestScore) {
          bestScore = score; bestPieceIdx = i; rotated = false;
        }
      }

      // Fit Rotado
      const canRotate = !hasGrain || part.grainDirection === 'libre';
      if (canRotate && part.height <= r.width && part.width <= r.height) {
        const score = calculateIndustrialScore(part.height, part.width, r, strategy);
        if (score > bestScore) {
          bestScore = score; bestPieceIdx = i; rotated = true;
        }
      }
    }

    if (bestPieceIdx !== -1) {
      const part = pieces[bestPieceIdx];
      const w = rotated ? part.height : part.width;
      const h = rotated ? part.width : part.height;

      placedParts.push({
        name: part.name,
        x: r.x, y: r.y, width: w, height: h,
        rotated,
        color: colors[part.name]
      });

      part.placed = true;
      uniqueStrips.add(strategy === 'vertical' ? r.x : r.y);
      splitGuillotine(freeRects, r, w, h, kerf, strategy);
    } else {
      if (r.width >= 5 || r.height >= 5) {
        leftovers.push({
          name: `S${leftovers.length + 1}`,
          x: r.x, y: r.y, width: r.width, height: r.height,
          rotated: false,
          isLeftover: true
        });
      }
    }
  }

  pieces.forEach(p => p.placed = false);

  const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
  const totalArea = panelWidth * panelHeight;
  const usefulLeftovers = leftovers.filter(l => Math.min(l.width, l.height) >= 100);
  const leftoverArea = usefulLeftovers.reduce((acc, l) => acc + (l.width * l.height), 0);

  const stats: PanelStats = {
    totalAreaM2: Number((totalArea / 1000000).toFixed(2)),
    usedAreaM2: Number((usedArea / 1000000).toFixed(2)),
    leftoverAreaM2: Number((leftoverArea / 1000000).toFixed(2)),
    wasteAreaM2: Number(((totalArea - usedArea - leftoverArea) / 1000000).toFixed(2)),
    wastePercentage: Number(((1 - (usedArea / totalArea)) * 100).toFixed(3)),
    displacements: Math.round(4 + (uniqueStrips.size * 2) + (placedParts.length * 0.8)),
    linearMeters: Number(((panelWidth * 2 + panelHeight * 2 + (usedArea / 1000)) / 1000).toFixed(2))
  };

  return {
    panelNumber,
    parts: placedParts,
    efficiency: (usedArea / totalArea) * 100,
    usedArea,
    totalArea,
    leftovers: usefulLeftovers,
    strategy,
    stats
  };
}

function evaluatePanelQuality(panel: OptimizedPanel, panelWidth: number, panelHeight: number): number {
  let score = panel.efficiency * 100000;
  const leftovers = panel.leftovers || [];
  
  // Penalizar fragmentación (OR-Tools goal: Less chunks)
  score -= (leftovers.length * 2000000);

  leftovers.forEach(l => {
    const minDim = Math.min(l.width, l.height);
    const area = l.width * l.height;

    // Bonificar sobrantes industriales reutilizables (>500mm)
    if (minDim >= 500) score += (area / panel.totalArea) * 5000000000;
    else if (minDim >= 300) score += (area / panel.totalArea) * 1000000000;

    // Penalizar tiras inútiles
    if (minDim < 80) score -= 1000000000; 
  });

  return score;
}

function calculateIndustrialScore(w: number, h: number, r: FreeRect, strategy: 'vertical' | 'horizontal'): number {
  let score = 0;
  // Preferencia por llenar tiras completas (Guillotina perfecta)
  if (strategy === 'horizontal') {
    if (Math.abs(h - r.height) < 0.1) score += 50000000;
  } else {
    if (Math.abs(w - r.width) < 0.1) score += 50000000;
  }
  score += (w * h) * 5;
  return score;
}

function splitGuillotine(freeRects: FreeRect[], r: FreeRect, pW: number, pH: number, kerf: number, strategy: 'vertical' | 'horizontal') {
  const remW = r.width - pW - kerf;
  const remH = r.height - pH - kerf;

  if (strategy === 'vertical') {
    if (remW > 0) freeRects.push({ x: r.x + pW + kerf, y: r.y, width: remW, height: r.height });
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + pH + kerf, width: pW, height: remH });
  } else {
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + pH + kerf, width: r.width, height: remH });
    if (remW > 0) freeRects.push({ x: r.x + pW + kerf, y: r.y, width: remW, height: pH });
  }
}

function smartShuffle(pieces: InternalPart[]) {
  for (let i = Math.min(20, pieces.length - 1); i < pieces.length; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 75%, 55%, 0.3)`;
  });
  return colors;
}
