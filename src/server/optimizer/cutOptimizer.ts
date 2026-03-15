import { GrainDirection, OptimizationResult, OptimizedPanel, OptimizedPart } from '../../lib/types';

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
 * JADSI Industrial Engine v28.1 - Precision Threshold
 * 
 * Implementa una optimización "Rect-First". In lugar de iterar piezas, 
 * itera sobre los rectángulos libres (huecos) y busca la mejor pieza para cada uno.
 * Umbral de eficiencia elevado al 95.3% para máxima densidad.
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

  // Pool global de piezas
  let pool: InternalPart[] = filteredParts.flatMap((p, idx) => 
    Array.from({ length: p.quantity }, () => ({
      ...p,
      originalIndex: idx,
      placed: false
    }))
  );

  const finalPanels: OptimizedPanel[] = [];
  let panelCounter = 1;

  // OPTIMIZACIÓN SECUENCIAL: Un panel a la vez
  while (pool.some(p => !p.placed)) {
    let bestPanelForThisStep: OptimizedPanel | null = null;
    let bestScore = -Infinity;

    const iterationsPerPanel = 10000;
    
    for (let iter = 0; iter < iterationsPerPanel; iter++) {
      const remainingPieces = pool.filter(p => !p.placed).map(p => ({ ...p }));
      
      // Ordenamiento base: Áreas grandes primero para el Panel 1
      if (iter === 0) {
        remainingPieces.sort((a, b) => (b.width * b.height) - (a.width * a.height));
      } else if (iter < 500) {
        // Variaciones de ordenamiento determinístico
        remainingPieces.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
      } else {
        smartShuffle(remainingPieces);
      }

      // Probar ambos sentidos de guillotina
      const strategy: 'horizontal' | 'vertical' = iter % 2 === 0 ? 'horizontal' : 'vertical';
      
      const attempt = fillSinglePanel(
        remainingPieces,
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

      const currentScore = evaluatePanelQuality(attempt);
      
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestPanelForThisStep = attempt;
      }

      // Umbral de eficiencia ajustado a 95.3%
      if (bestPanelForThisStep && bestPanelForThisStep.efficiency >= 95.3) break;
    }

    if (bestPanelForThisStep && bestPanelForThisStep.parts.length > 0) {
      bestPanelForThisStep.parts.forEach(placedPart => {
        if (placedPart.isLeftover) return;
        const match = pool.find(p => 
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
    summary: `JADSI v28.1 Master: ${finalPanels.length} paneles. Eficiencia Global: ${((totalUsedArea / totalAvailArea) * 100).toFixed(1)}%.`,
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

  while (freeRects.length > 0) {
    // Priorizamos el hueco más cercano al origen para evitar saltos
    freeRects.sort((a, b) => {
      if (strategy === 'horizontal') {
        return (a.y - b.y) || (a.x - b.x);
      } else {
        return (a.x - b.x) || (a.y - b.y);
      }
    });

    const r = freeRects.shift()!;
    if (r.width < 1 || r.height < 1) continue;

    let bestPieceIdx = -1;
    let bestScore = -1;
    let rotated = false;

    // Escaneamos TODAS las piezas para encontrar la mejor para ESTE hueco específico
    for (let i = 0; i < pieces.length; i++) {
      const part = pieces[i];
      if (part.placed) continue;

      // Normal
      if (part.width <= r.width && part.height <= r.height) {
        const score = calculateGapScore(part.width, part.height, r, panelWidth, panelHeight, trim);
        if (score > bestScore) {
          bestScore = score; bestPieceIdx = i; rotated = false;
        }
      }

      // Rotada
      const canRotate = !hasGrain || part.grainDirection === 'libre';
      if (canRotate && part.height <= r.width && part.width <= r.height) {
        const score = calculateGapScore(part.height, part.width, r, panelWidth, panelHeight, trim);
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
      splitGuillotine(freeRects, r, w, h, kerf, strategy);
    } else {
      // Si nada entra, es un sobrante final para este tablero
      if (r.width >= 60 && r.height >= 60) {
        leftovers.push({
          name: `S${leftovers.length + 1}`,
          x: r.x, y: r.y, width: r.width, height: r.height,
          rotated: false,
          isLeftover: true
        });
      }
    }
  }

  // Reset del estado temporal para la siguiente iteración de Monte Carlo
  pieces.forEach(p => p.placed = false);

  const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
  return {
    panelNumber,
    parts: placedParts,
    efficiency: (usedArea / (panelWidth * panelHeight)) * 100,
    usedArea,
    totalArea: panelWidth * panelHeight,
    leftovers,
    strategy
  };
}

/**
 * Scoring de Hueco: Premia el contacto con bordes y el ajuste perfecto de dimensiones.
 */
function calculateGapScore(w: number, h: number, r: FreeRect, pW: number, pH: number, trim: number): number {
  let score = 0;
  
  // Bono por Ajuste Perfecto (Elimina escalones)
  if (Math.abs(w - r.width) < 0.5) score += 2000000;
  if (Math.abs(h - r.height) < 0.5) score += 2000000;

  // Bono por Contact Point (Compactación)
  if (Math.abs(r.x - trim) < 0.5) score += h * 100;
  if (Math.abs(r.y - trim) < 0.5) score += w * 100;
  
  // Prioridad de Area (Llenar con lo más grande posible)
  score += (w * h);

  return score;
}

function splitGuillotine(freeRects: FreeRect[], r: FreeRect, pW: number, pH: number, kerf: number, strategy: 'vertical' | 'horizontal') {
  const remW = r.width - pW - kerf;
  const remH = r.height - pH - kerf;

  if (strategy === 'vertical') {
    // Corte vertical primario: crea una columna remanente a la derecha y el resto abajo
    if (remW > 0) freeRects.push({ x: r.x + pW + kerf, y: r.y, width: remW, height: r.height });
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + pH + kerf, width: pW, height: remH });
  } else {
    // Corte horizontal primario: crea una fila remanente abajo y el resto a la derecha
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + pH + kerf, width: r.width, height: remH });
    if (remW > 0) freeRects.push({ x: r.x + pW + kerf, y: r.y, width: remW, height: pH });
  }
}

function evaluatePanelQuality(panel: OptimizedPanel): number {
  let score = Math.pow(panel.efficiency, 3) * 1000;
  // Premiamos que el sobrante más grande sea masivo
  const largestLeftoverArea = Math.max(0, ...(panel.leftovers?.map(l => l.width * l.height) || [0]));
  score += (largestLeftoverArea / panel.totalArea) * 1000000;
  // Penalizamos la cantidad de piezas (preferimos pocos bloques grandes)
  score -= (panel.leftovers?.length || 0) * 5000;
  return score;
}

function smartShuffle(pieces: InternalPart[]) {
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 75%, 50%, 0.35)`;
  });
  return colors;
}
