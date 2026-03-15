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
 * JADSI Industrial Engine v31.0 - Analytics Pro & Beam Saw Logic
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

    const maxIterations = 10000;
    const targetEfficiency = 95.3;

    for (let iter = 0; iter < maxIterations; iter++) {
      const currentAvailablePieces = globalPool.filter(p => !p.placed).map(p => ({ ...p }));
      
      // Heurística de ordenamiento inicial: Área descendente
      if (iter === 0) {
        currentAvailablePieces.sort((a, b) => (b.width * b.height) - (a.width * a.height));
      } else if (iter < 1000) {
        // Variante por lado largo
        currentAvailablePieces.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
      } else {
        smartShuffle(currentAvailablePieces);
      }

      // Alternar estrategias de primer corte (X-Rip o Y-Rip)
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

      // Salida anticipada si alcanzamos la meta de eficiencia industrial
      if (bestPanelForThisStep && bestPanelForThisStep.efficiency >= targetEfficiency) break;
    }

    if (bestPanelForThisStep && bestPanelForThisStep.parts.length > 0) {
      // Marcar piezas como colocadas definitivamente en este panel
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
    summary: `JADSI v31.0 Analytics: ${finalPanels.length} paneles procesados secuencialmente.`,
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
  
  // Inicialización de logística de corte
  let linearMeters = (panelWidth * 2 + panelHeight * 2) / 1000; // Perímetro inicial (trim)
  let displacements = 4; // 4 cortes perimetrales iniciales

  while (freeRects.length > 0) {
    // Ordenar huecos para favorecer la esquina cercana al origen
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

      // Evaluar sin rotación
      if (part.width <= r.width && part.height <= r.height) {
        const score = calculateIndustrialScore(part.width, part.height, r, strategy);
        if (score > bestScore) {
          bestScore = score; bestPieceIdx = i; rotated = false;
        }
      }

      // Evaluar con rotación (si la veta lo permite)
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
      
      // Cálculo de logística de corte (Simulación de Seccionadora)
      displacements += 2; 
      if (strategy === 'vertical') {
        linearMeters += (r.height + h) / 1000;
      } else {
        linearMeters += (r.width + w) / 1000;
      }

      splitGuillotine(freeRects, r, w, h, kerf, strategy);
    } else {
      // Si el hueco es lo suficientemente grande, registrarlo como sobrante útil
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

  // Limpiar estados de piezas para el pool del siguiente panel
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
    displacements: Math.round(displacements * 1.2), // Factor de ajuste industrial
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
  // Bono masivo por ajuste perfecto en el eje de guillotina (evita escalones)
  if (strategy === 'horizontal') {
    if (Math.abs(h - r.height) < 0.5) score += 5000000;
  } else {
    if (Math.abs(w - r.width) < 0.5) score += 5000000;
  }
  score += (w * h); // Priorizar piezas grandes
  // Bono por proximidad al origen
  if (r.x === 10 || r.y === 10) score += 100000;
  return score;
}

function splitGuillotine(freeRects: FreeRect[], r: FreeRect, pW: number, pH: number, kerf: number, strategy: 'vertical' | 'horizontal') {
  const remW = r.width - pW - kerf;
  const remH = r.height - pH - kerf;

  if (strategy === 'vertical') {
    // Primero dividir horizontalmente para crear la columna, luego verticalmente dentro de la columna
    if (remW > 0) freeRects.push({ x: r.x + pW + kerf, y: r.y, width: remW, height: r.height });
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + pH + kerf, width: pW, height: remH });
  } else {
    // Estrategia Horizontal (Tira): Dividir verticalmente primero para cerrar la tira
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + pH + kerf, width: r.width, height: remH });
    if (remW > 0) freeRects.push({ x: r.x + pW + kerf, y: r.y, width: remW, height: pH });
  }
}

function evaluatePanelQuality(panel: OptimizedPanel): number {
  // Puntuación cúbica de eficiencia para penalizar fuertemente los huecos
  let score = Math.pow(panel.efficiency, 3) * 1000;
  
  // Penalización por número de sobrantes (queremos pocos y grandes)
  const leftoverCount = panel.leftovers?.length || 0;
  score -= (leftoverCount * 10000);
  
  // Bono por el tamaño del sobrante más grande
  const maxLeftoverArea = Math.max(0, ...(panel.leftovers?.map(l => l.width * l.height) || [0]));
  score += (maxLeftoverArea / panel.totalArea) * 2000000;
  
  return score;
}

function smartShuffle(pieces: InternalPart[]) {
  // Solo mezclar después de las piezas críticas
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
