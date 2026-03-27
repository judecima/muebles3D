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
 * JADSI Industrial Engine v40.0 - Senior Implementation
 * Motor híbrido determinístico + heurístico para optimización de corte 2D Guillotina.
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

  // Pre-procesamiento: Desglose y ordenamiento por área descendente
  let globalPool: InternalPart[] = filteredParts.flatMap((p, idx) => 
    Array.from({ length: p.quantity }, () => ({
      ...p,
      originalIndex: idx,
      placed: false
    }))
  ).sort((a, b) => (b.width * b.height) - (a.width * a.height));

  const finalPanels: OptimizedPanel[] = [];
  let panelCounter = 1;

  while (globalPool.some(p => !p.placed)) {
    let bestPanelForThisStep: OptimizedPanel | null = null;
    let bestScore = -Infinity;

    // Ejecutar múltiples estrategias de búsqueda para encontrar el mejor tablero local
    const iterations = 8000;
    const targetEfficiency = 97.5;

    for (let iter = 0; iter < iterations; iter++) {
      const currentAvailablePieces = globalPool.filter(p => !p.placed).map(p => ({ ...p }));
      
      // Variación de heurística de ordenamiento
      if (iter > 0) {
        if (iter < 1000) {
          // Heurística de Dimensión Máxima
          currentAvailablePieces.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
        } else {
          // Búsqueda estocástica inteligente
          smartShuffle(currentAvailablePieces);
        }
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

        const currentScore = evaluatePanelQuality(attempt, panelWidth, panelHeight);
        
        if (currentScore > bestScore) {
          bestScore = currentScore;
          bestPanelForThisStep = attempt;
        }
      }

      // Early exit si la eficiencia es excepcional
      if (bestPanelForThisStep && bestPanelForThisStep.efficiency >= targetEfficiency) break;
    }

    if (bestPanelForThisStep && bestPanelForThisStep.parts.length > 0) {
      // Marcar piezas como colocadas en el pool global
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
    summary: `JADSI v40.0 - Motor Industrial: Optimización completada en ${panelCounter - 1} tableros con reducción de fragmentación y máximización de stock útil.`,
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
    // Priorización de rectángulos según estrategia de guillotina
    freeRects.sort((a, b) => {
      if (strategy === 'horizontal') return (a.y - b.y) || (a.x - b.x);
      return (a.x - b.x) || (a.y - b.y);
    });

    const r = freeRects.shift()!;
    if (r.width < 1 || r.height < 1) continue;

    let bestPieceIdx = -1;
    let bestScore = -Infinity;
    let rotated = false;

    for (let i = 0; i < pieces.length; i++) {
      const part = pieces[i];
      if (part.placed) continue;

      // Evaluar Orientación Normal
      if (part.width <= r.width && part.height <= r.height) {
        const score = calculateFitScore(part.width, part.height, r, strategy);
        if (score > bestScore) {
          bestScore = score; bestPieceIdx = i; rotated = false;
        }
      }

      // Evaluar Orientación Rotada (solo si se permite)
      const canRotate = !hasGrain || part.grainDirection === 'libre';
      if (canRotate && part.height <= r.width && part.width <= r.height) {
        const score = calculateFitScore(part.height, part.width, r, strategy);
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
      
      // Aplicar Split Guillotina Inteligente
      const newRects = splitGuillotineSmart(r, w, h, kerf, strategy);
      freeRects.push(...newRects);
    } else {
      // Registrar sobrante si es de tamaño considerable
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

  // Limpiar estado de piezas para la siguiente iteración de simulación
  pieces.forEach(p => p.placed = false);

  const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
  const totalArea = panelWidth * panelHeight;
  const usefulLeftovers = leftovers.filter(l => Math.min(l.width, l.height) >= 80);
  const leftoverArea = usefulLeftovers.reduce((acc, l) => acc + (l.width * l.height), 0);

  const stats: PanelStats = {
    totalAreaM2: Number((totalArea / 1000000).toFixed(2)),
    usedAreaM2: Number((usedArea / 1000000).toFixed(2)),
    leftoverAreaM2: Number((leftoverArea / 1000000).toFixed(2)),
    wasteAreaM2: Number(((totalArea - usedArea - leftoverArea) / 1000000).toFixed(2)),
    wastePercentage: Number(((1 - (usedArea / totalArea)) * 100).toFixed(3)),
    displacements: Math.round(4 + (uniqueStrips.size * 2) + (placedParts.length * 0.5)),
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

function calculateFitScore(
  pieceW: number,
  pieceH: number,
  rect: FreeRect,
  strategy: 'vertical' | 'horizontal'
): number {
  const areaFit = pieceW * pieceH;
  const waste = (rect.width * rect.height) - areaFit;

  // Penalización por desperdicio de área
  let score = areaFit - (waste * 0.65);

  // Bonus crítico: Llenar completamente la tira en el eje de guillotina
  if (strategy === 'horizontal') {
    if (Math.abs(pieceH - rect.height) < 0.1) score += 1000000;
  } else {
    if (Math.abs(pieceW - rect.width) < 0.1) score += 1000000;
  }

  // Bonus secundario: Ajuste al ancho/alto restante para minimizar fragmentación
  const diffW = rect.width - pieceW;
  const diffH = rect.height - pieceH;
  if (diffW < 10) score += 50000;
  if (diffH < 10) score += 50000;

  return score;
}

function evaluatePanelQuality(panel: OptimizedPanel, panelWidth: number, panelHeight: number): number {
  let score = panel.efficiency * 1000000;
  const leftovers = panel.leftovers || [];
  
  // Penalización por fragmentación excesiva
  score -= (leftovers.length * 500000);

  for (const l of leftovers) {
    const minDim = Math.min(l.width, l.height);
    const maxDim = Math.max(l.width, l.height);
    const area = l.width * l.height;
    const aspectRatio = maxDim / minDim;

    // Penalizar tiras largas e inútiles
    if (aspectRatio > 6) score -= 2000000;

    // Bonificar bloques reutilizables industriales
    if (minDim >= 500) score += (area / panel.totalArea) * 10000000;
    else if (minDim >= 300) score += (area / panel.totalArea) * 2000000;

    // Penalizar basura (recortes de menos de 80mm)
    if (minDim < 80) score -= 1500000; 
  }

  return score;
}

function splitGuillotineSmart(
  rect: FreeRect, 
  pW: number, 
  pH: number, 
  kerf: number, 
  strategy: 'vertical' | 'horizontal'
): FreeRect[] {
  const remW = rect.width - pW - kerf;
  const remH = rect.height - pH - kerf;
  const result: FreeRect[] = [];

  // Elegir estrategia de split según la orientación global del tablero para mantener la guillotina
  if (strategy === 'vertical') {
    if (remW > 0) result.push({ x: rect.x + pW + kerf, y: rect.y, width: remW, height: rect.height });
    if (remH > 0) result.push({ x: rect.x, y: rect.y + pH + kerf, width: pW, height: remH });
  } else {
    if (remH > 0) result.push({ x: rect.x, y: rect.y + pH + kerf, width: rect.width, height: remH });
    if (remW > 0) result.push({ x: rect.x + pW + kerf, y: rect.y, width: remW, height: pH });
  }

  return result;
}

function smartShuffle(pieces: InternalPart[]) {
  // Mezcla aleatoria limitada para explorar el espacio de soluciones sin perder el orden base
  for (let i = 0; i < Math.min(pieces.length, 30); i++) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 70%, 50%, 0.25)`;
  });
  return colors;
}
