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
 * JADSI Industrial Engine v35.0 - X-Rip Dominance (Lepton Logic Alignment)
 * Optimización de alto rendimiento con prioridad en consolidación de stock vertical.
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

  // Pool de piezas restantes
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

    const maxIterations = 10000;
    const targetEfficiency = 95.3;

    // Evaluamos el panel actual de forma independiente
    for (let iter = 0; iter < maxIterations; iter++) {
      const currentAvailablePieces = globalPool.filter(p => !p.placed).map(p => ({ ...p }));
      
      // Ordenamiento base: Área descendente
      if (iter === 0) {
        currentAvailablePieces.sort((a, b) => (b.width * b.height) - (a.width * a.height));
      } else if (iter < 2000) {
        // Ordenamiento secundario: Lado mayor descendente
        currentAvailablePieces.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
      } else {
        smartShuffle(currentAvailablePieces);
      }

      // Probar ambas estrategias por cada panel
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

      // Short-circuit de eficiencia industrial
      if (bestPanelForThisStep && bestPanelForThisStep.efficiency >= targetEfficiency) break;
    }

    if (bestPanelForThisStep && bestPanelForThisStep.parts.length > 0) {
      // Marcar piezas como colocadas para el siguiente panel
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
    summary: `JADSI v35.0 Industrial (Engine B): X-Rip Dominance & Stock Consolidation.`,
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
  
  // Telemetría inicial
  let linearMeters = (panelWidth * 2 + panelHeight * 2) / 1000;
  let displacements = 4;

  while (freeRects.length > 0) {
    // Prioridad de huecos según estrategia
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

      // Intentar sin rotar
      if (part.width <= r.width && part.height <= r.height) {
        const score = calculateIndustrialScore(part.width, part.height, r, strategy);
        if (score > bestScore) {
          bestScore = score; bestPieceIdx = i; rotated = false;
        }
      }

      // Intentar rotado
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
      displacements += 1.5; 
      linearMeters += (strategy === 'vertical' ? h : w) / 1000;

      splitGuillotine(freeRects, r, w, h, kerf, strategy);
    } else {
      if (r.width >= 100 && r.height >= 100) {
        leftovers.push({
          name: `S${leftovers.length + 1}`,
          x: r.x, y: r.y, width: r.width, height: r.height,
          rotated: false,
          isLeftover: true
        });
      }
    }
  }

  // Reset flag temporal de piezas para la siguiente iteración de simulación
  pieces.forEach(p => p.placed = false);

  const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
  const leftoverArea = leftovers.reduce((acc, l) => acc + (l.width * l.height), 0);
  const totalArea = panelWidth * panelHeight;
  const wasteArea = totalArea - usedArea - leftoverArea;

  const stats: PanelStats = {
    totalAreaM2: Number((totalArea / 1000000).toFixed(2)),
    usedAreaM2: Number((usedArea / 1000000).toFixed(2)),
    leftoverAreaM2: Number((leftoverArea / 1000000).toFixed(2)),
    wasteAreaM2: Number((wasteArea / 1000000).toFixed(2)),
    wastePercentage: Number(((wasteArea / totalArea) * 100).toFixed(3)),
    displacements: Math.round(displacements),
    linearMeters: Number(linearMeters.toFixed(2))
  };

  return {
    panelNumber,
    parts: placedParts,
    efficiency: (usedArea / totalArea) * 100,
    usedArea,
    totalArea,
    leftovers,
    strategy,
    stats
  };
}

function calculateIndustrialScore(w: number, h: number, r: FreeRect, strategy: 'vertical' | 'horizontal'): number {
  let score = 0;
  // Bono crítico de alineación industrial
  if (strategy === 'horizontal') {
    if (Math.abs(h - r.height) < 0.5) score += 100000000;
  } else {
    if (Math.abs(w - r.width) < 0.5) score += 100000000;
  }
  
  // Priorizar área grande y cercanía al origen (Estabilidad)
  score += (w * h) * 10;
  if (r.x === 10 || r.y === 10) score += 5000000; 
  
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

/**
 * Función de Calidad Industrial v35.0 (Engine B)
 * Prioriza la dominancia de eje vertical y consolidación de stock masivo.
 */
function evaluatePanelQuality(panel: OptimizedPanel, panelWidth: number, panelHeight: number): number {
  // 1. Eficiencia base (Factor 1M)
  let score = panel.efficiency * 1000000;
  
  // 2. Bono por bloque sobrante masivo (Stock Reutilizable)
  const leftovers = panel.leftovers || [];
  const maxLeftoverArea = Math.max(0, ...leftovers.map(l => l.width * l.height));
  score += (maxLeftoverArea / panel.totalArea) * 500000000;

  // 3. Bonos por calidad de retazos
  leftovers.forEach(l => {
    const minDim = Math.min(l.width, l.height);
    if (minDim >= 400) score += 20000000;
    else if (minDim >= 250) score += 10000000;
  });

  // 4. REGLA MAESTRA: Dominancia de Medio Panel Vertical (X-Rip)
  // Si todo cabe en el primer 50% del ancho del tablero, el bono es imbatible.
  if (panel.strategy === 'vertical' && panel.parts.length > 0) {
    const maxX = Math.max(...panel.parts.map(p => p.x + p.width));
    if (maxX <= (panelWidth / 2) + 20) {
      score += 2000000000; // Bono de prioridad industrial absoluta
    }
  }
  
  // Penalización por fragmentación (cada sobrante extra resta puntos)
  score -= (leftovers.length * 5000000);
  
  return score;
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
    colors[name] = `hsla(${(i * 137.5) % 360}, 70%, 50%, 0.35)`;
  });
  return colors;
}
