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
 * JADSI Industrial Engine v29.0 - Sequential Strip Master
 * 
 * Implementa una optimización voraz panel a panel.
 * Cada panel busca su propio eje de guillotina (Horizontal/Vertical) de forma independiente.
 * Utiliza una estrategia de Franjas Maestras para consolidar sobrantes y minimizar desplazamientos.
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

  // Pool global de piezas - Se mantiene fuera del loop de paneles para asegurar secuencialidad
  let globalPool: InternalPart[] = filteredParts.flatMap((p, idx) => 
    Array.from({ length: p.quantity }, () => ({
      ...p,
      originalIndex: idx,
      placed: false
    }))
  );

  const finalPanels: OptimizedPanel[] = [];
  let panelCounter = 1;

  // OPTIMIZACIÓN PANEL A PANEL (INDIVIDUAL)
  while (globalPool.some(p => !p.placed)) {
    let bestPanelForThisStep: OptimizedPanel | null = null;
    let bestScore = -Infinity;

    // 10,000 Iteraciones por panel para encontrar la perfección
    const maxIterations = 10000;
    const targetEfficiency = 95.3;

    for (let iter = 0; iter < maxIterations; iter++) {
      // Tomamos solo las piezas que aún no han sido colocadas en paneles previos
      const currentAvailablePieces = globalPool.filter(p => !p.placed).map(p => ({ ...p }));
      
      // Variamos el ordenamiento para explorar el espacio de soluciones
      if (iter === 0) {
        currentAvailablePieces.sort((a, b) => (b.width * b.height) - (a.width * a.height));
      } else if (iter < 1000) {
        // Priorizar el lado más largo (Strategy: Best Long Side Fit)
        currentAvailablePieces.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
      } else {
        smartShuffle(currentAvailablePieces);
      }

      // Alternamos estrategia de guillotina por cada iteración
      const strategy: 'horizontal' | 'vertical' = iter % 2 === 0 ? 'horizontal' : 'vertical';
      
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

      const currentScore = evaluatePanelQuality(attempt);
      
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestPanelForThisStep = attempt;
      }

      // Si alcanzamos el umbral pedido por el cliente, cerramos el panel
      if (bestPanelForThisStep && bestPanelForThisStep.efficiency >= targetEfficiency) break;
    }

    if (bestPanelForThisStep && bestPanelForThisStep.parts.length > 0) {
      // MARCAR DEFINITIVAMENTE LAS PIEZAS COMO USADAS
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
      // Evitar bucle infinito si una pieza no cabe
      break;
    }
  }

  const totalUsedArea = finalPanels.reduce((acc, p) => acc + p.usedArea, 0);
  const totalAvailArea = finalPanels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: finalPanels,
    totalPanels: finalPanels.length,
    totalEfficiency: finalPanels.length > 0 ? (totalUsedArea / totalAvailArea) * 100 : 0,
    summary: `JADSI v29.0 Mastery: ${finalPanels.length} paneles. Panel 1 Efficiency: ${finalPanels[0]?.efficiency.toFixed(1)}%.`,
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

  // Lógica de empaquetado por franjas (Strip-Packing)
  while (freeRects.length > 0) {
    // Prioridad: Rectángulo más cercano al origen
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

      // Evaluación Normal
      if (part.width <= r.width && part.height <= r.height) {
        const score = calculateIndustrialScore(part.width, part.height, r, strategy);
        if (score > bestScore) {
          bestScore = score; bestPieceIdx = i; rotated = false;
        }
      }

      // Evaluación Rotada (Si está permitido)
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
      splitGuillotine(freeRects, r, w, h, kerf, strategy);
    } else {
      // Registro de Sobrante: Solo si es mayor a 100mm para evitar fragmentación excesiva en el visor
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

  // IMPORTANTE: Limpiamos el pool local de esta iteración de Monte Carlo
  // El pool real solo se actualiza en runOptimization al elegir el mejor panel
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
 * Scoring Industrial: Prioriza la alineación de piezas idénticas y el llenado de franjas
 */
function calculateIndustrialScore(w: number, h: number, r: FreeRect, strategy: 'vertical' | 'horizontal'): number {
  let score = 0;
  
  // Bono de Alineación Perfecta (Obliga a cortes guillotina limpios)
  if (strategy === 'horizontal') {
    if (Math.abs(h - r.height) < 0.5) score += 5000000; // La pieza llena el alto de la franja
  } else {
    if (Math.abs(w - r.width) < 0.5) score += 5000000; // La pieza llena el ancho de la columna
  }

  // Bono por Ajuste de área
  score += (w * h);

  // Bono de Contact Point (Esquinas y bordes)
  if (r.x === 10 || r.y === 10) score += 100000;

  return score;
}

function splitGuillotine(freeRects: FreeRect[], r: FreeRect, pW: number, pH: number, kerf: number, strategy: 'vertical' | 'horizontal') {
  const remW = r.width - pW - kerf;
  const remH = r.height - pH - kerf;

  if (strategy === 'vertical') {
    // Corte Vertical: Crea una columna a la derecha y el resto abajo
    if (remW > 0) freeRects.push({ x: r.x + pW + kerf, y: r.y, width: remW, height: r.height });
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + pH + kerf, width: pW, height: remH });
  } else {
    // Corte Horizontal: Crea una fila abajo y el resto a la derecha
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + pH + kerf, width: r.width, height: remH });
    if (remW > 0) freeRects.push({ x: r.x + pW + kerf, y: r.y, width: remW, height: pH });
  }
}

/**
 * Evalúa la calidad global del panel. Prefiere alta eficiencia y pocos sobrantes grandes.
 */
function evaluatePanelQuality(panel: OptimizedPanel): number {
  // Eficiencia al cubo para priorizar el Panel 1
  let score = Math.pow(panel.efficiency, 3) * 1000;
  
  // Penalización por cantidad de sobrantes (objetivo: 7-9)
  const leftoverCount = panel.leftovers?.length || 0;
  score -= (leftoverCount * 10000);

  // Bonus por el área del sobrante más grande (consolidación)
  const maxLeftoverArea = Math.max(0, ...(panel.leftovers?.map(l => l.width * l.height) || [0]));
  score += (maxLeftoverArea / panel.totalArea) * 2000000;

  return score;
}

function smartShuffle(pieces: InternalPart[]) {
  // Mezcla inteligente: Mantiene las piezas grandes cerca del principio pero altera el orden relativo
  for (let i = Math.min(10, pieces.length - 1); i < pieces.length; i++) {
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
