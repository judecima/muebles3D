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
 * JADSI Industrial Engine v27.0 - Panel-by-Panel Master
 * 
 * Implementa una optimización secuencial voraz (greedy).
 * Cada panel se evalúa de forma independiente con hasta 10,000 iteraciones.
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

    // 10,000 iteraciones por cada panel individual
    const iterationsPerPanel = 10000;
    
    for (let iter = 0; iter < iterationsPerPanel; iter++) {
      // Tomamos solo las piezas que aún no han sido colocadas en paneles previos
      const remainingPieces = pool.filter(p => !p.placed).map(p => ({ ...p }));
      
      // Estrategia de ordenamiento estocástico pero jerárquico
      if (iter === 0) {
        // Primera prueba: Área descendente estricta
        remainingPieces.sort((a, b) => (b.width * b.height) - (a.width * a.height));
      } else if (iter < 100) {
        // Variaciones determinísticas (Lado largo, Perímetro)
        remainingPieces.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
      } else {
        // Mutación inteligente
        smartShuffle(remainingPieces);
      }

      // Probar ambos sentidos de guillotina para este panel
      // Alternamos estrategias para cubrir 5000 horizontales y 5000 verticales aprox.
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

      const currentScore = evaluatePanelQuality(attempt, strategy);
      
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestPanelForThisStep = attempt;
      }

      // SHORT-CIRCUIT: Si superamos el 95%, este panel es óptimo.
      if (bestPanelForThisStep && bestPanelForThisStep.efficiency >= 95.0) {
        break;
      }
    }

    if (bestPanelForThisStep && bestPanelForThisStep.parts.length > 0) {
      // Consolidar: Marcar piezas del "Mejor Panel" como colocadas en el pool global
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
      // Si no pudimos colocar nada, evitamos bucle infinito
      break;
    }
  }

  const totalUsedArea = finalPanels.reduce((acc, p) => acc + p.usedArea, 0);
  const totalAvailArea = finalPanels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: finalPanels,
    totalPanels: finalPanels.length,
    totalEfficiency: finalPanels.length > 0 ? (totalUsedArea / totalAvailArea) * 100 : 0,
    summary: `JADSI v27.0: Panel 1 optimizado al ${finalPanels[0]?.efficiency.toFixed(1)}%. Búsqueda secuencial exhaustiva completada.`,
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

  for (let i = 0; i < pieces.length; i++) {
    const part = pieces[i];
    if (part.placed) continue;

    let bestRectIdx = -1;
    let maxCP = -1;
    let rotated = false;

    for (let j = 0; j < freeRects.length; j++) {
      const r = freeRects[j];
      
      // Opción Normal (Respeta veta)
      if (part.width <= r.width && part.height <= r.height) {
        const cp = calculateContactPoint(r.x, r.y, part.width, part.height, panelWidth, panelHeight, trim, r);
        if (cp > maxCP) {
          maxCP = cp; bestRectIdx = j; rotated = false;
        }
      }

      // Opción Rotada (Solo si no hay veta o el usuario permite rotar)
      const canRotate = !hasGrain || part.grainDirection === 'libre';
      if (canRotate && part.height <= r.width && part.width <= r.height) {
        const cp = calculateContactPoint(r.x, r.y, part.height, part.width, panelWidth, panelHeight, trim, r);
        if (cp > maxCP) {
          maxCP = cp; bestRectIdx = j; rotated = true;
        }
      }
    }

    if (bestRectIdx !== -1) {
      const r = freeRects[bestRectIdx];
      const w = rotated ? part.height : part.width;
      const h = rotated ? part.width : part.height;

      placedParts.push({
        name: part.name,
        x: r.x, y: r.y, width: w, height: h,
        rotated,
        color: colors[part.name]
      });

      part.placed = true; // Marcamos temporalmente para este panel
      splitGuillotine(freeRects, bestRectIdx, w, h, kerf, strategy);
      
      // AFINIDAD DE CLÚSTER: Llenado inmediato de piezas hermanas
      fillCluster(pieces, freeRects, kerf, strategy, hasGrain, colors, placedParts, panelWidth, panelHeight, trim);
    }
  }

  // Restaurar estado 'placed' de las piezas para la siguiente iteración de Monte Carlo
  // (El proceso runOptimization marcará permanentemente solo las del "Ganador")
  pieces.forEach(p => p.placed = false);

  const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
  const leftovers = freeRects
    .filter(r => r.width >= 60 && r.height >= 60)
    .map((r, idx) => ({
      name: `S${idx + 1}`,
      x: r.x, y: r.y, width: r.width, height: r.height,
      rotated: false,
      isLeftover: true
    }));

  return {
    panelNumber,
    parts: placedParts,
    efficiency: (usedArea / (panelWidth * panelHeight)) * 100,
    usedArea,
    totalArea: panelWidth * panelHeight,
    leftovers
  };
}

function calculateContactPoint(x: number, y: number, w: number, h: number, pW: number, pH: number, trim: number, r: FreeRect): number {
  let score = 0;
  // Contacto con los bordes del área útil
  if (Math.abs(x - trim) < 0.5) score += h * 10;
  if (Math.abs(y - trim) < 0.5) score += w * 10;
  if (Math.abs(x + w - (pW - trim)) < 0.5) score += h * 2;
  if (Math.abs(y + h - (pH - trim)) < 0.5) score += w * 2;
  
  // Coincidencia perfecta con el contenedor (Elimina escalones)
  if (Math.abs(w - r.width) < 0.5) score += h * 100; 
  if (Math.abs(h - r.height) < 0.5) score += w * 100; 
  
  return score;
}

function fillCluster(
  pieces: InternalPart[], 
  freeRects: FreeRect[], 
  kerf: number, 
  strategy: 'vertical' | 'horizontal',
  hasGrain: boolean,
  colors: Record<string, string>,
  placedParts: OptimizedPart[],
  pW: number, pH: number, trim: number
) {
  if (placedParts.length === 0) return;
  const last = placedParts[placedParts.length - 1];

  for (let i = 0; i < pieces.length; i++) {
    const part = pieces[i];
    if (part.placed) continue;

    // Verificar si es de la misma "familia" dimensional que la última colocada
    const isSameSize = (part.width === (last.rotated ? last.height : last.width) && part.height === (last.rotated ? last.width : last.height));
    if (!isSameSize) continue;

    let bestRectIdx = -1;
    for (let j = 0; j < freeRects.length; j++) {
      const r = freeRects[j];
      const wN = last.width; const hN = last.height;
      
      if (wN <= r.width && hN <= r.height) {
        // Solo colocar si mantiene la línea de guillotina perfecta
        if (Math.abs(wN - r.width) < 0.5 || Math.abs(hN - r.height) < 0.5) {
          bestRectIdx = j;
          break;
        }
      }
    }

    if (bestRectIdx !== -1) {
      const r = freeRects[bestRectIdx];
      placedParts.push({
        name: part.name,
        x: r.x, y: r.y, width: last.width, height: last.height,
        rotated: last.rotated,
        color: colors[part.name]
      });
      part.placed = true;
      splitGuillotine(freeRects, bestRectIdx, last.width, last.height, kerf, strategy);
    }
  }
}

function splitGuillotine(freeRects: FreeRect[], idx: number, partW: number, partH: number, kerf: number, strategy: 'vertical' | 'horizontal') {
  const r = freeRects.splice(idx, 1)[0];
  const remW = r.width - partW - kerf;
  const remH = r.height - partH - kerf;

  if (strategy === 'vertical') {
    // Corte primario Vertical (Columna)
    if (remW > 0) freeRects.push({ x: r.x + partW + kerf, y: r.y, width: remW, height: r.height });
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + partH + kerf, width: partW, height: remH });
  } else {
    // Corte primario Horizontal (Fila/Tira)
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + partH + kerf, width: r.width, height: remH });
    if (remW > 0) freeRects.push({ x: r.x + partW + kerf, y: r.y, width: remW, height: partH });
  }
}

/**
 * Función de Scoring Maestro:
 * Valora Eficiencia, Tamaño de Sobrante y Alineación.
 */
function evaluatePanelQuality(panel: OptimizedPanel, strategy: 'vertical' | 'horizontal'): number {
  // Puntuación base: Eficiencia exponencial
  let score = Math.pow(panel.efficiency, 3) * 1000;
  
  // BONO POR SOBRANTE MASIVO: El área del bloque sobrante más grande
  const largestLeftoverArea = Math.max(0, ...(panel.leftovers?.map(l => l.width * l.height) || [0]));
  score += (largestLeftoverArea / (panel.totalArea)) * 500000;

  // PENALIZACIÓN POR FRAGMENTACIÓN: Más sobrantes pequeños = menos puntos
  if (panel.leftovers) {
    score -= (panel.leftovers.length * 1000);
  }

  // BONO POR SIMPLICIDAD: Menos piezas por panel es mejor (si la eficiencia es alta)
  score -= (panel.parts.length * 100);

  return score;
}

function smartShuffle(pieces: InternalPart[]) {
  // Ordenamiento con un 85% de probabilidad de mantener las piezas grandes arriba
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const areaI = pieces[i].width * pieces[i].height;
    const areaJ = pieces[j].width * pieces[j].height;
    
    // Si la pieza en J es significativamente mayor que I, evitamos moverla hacia atrás
    if (areaJ > areaI && Math.random() > 0.15) continue;
    
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
