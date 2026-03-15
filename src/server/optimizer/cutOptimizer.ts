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
 * JADSI Industrial Engine v18.0 - DGP (Density Global Positioning)
 * 
 * Basado en Hybrid Guillotine BAF (Best Area Fit) + Monte Carlo Mutator.
 * Optimizado para generar bloques de sobrante rectangulares masivos.
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
  
  if (filteredParts.length === 0) {
    return { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Sin piezas", kerf, trim, selectedThickness };
  }

  const usableW = Math.max(0, panelWidth - (trim * 2));
  const usableH = Math.max(0, panelHeight - (trim * 2));
  const partColors = generateColors(filteredParts);

  let bestGlobalResult: OptimizationResult | null = null;
  let bestGlobalScore = -Infinity;

  // Intensidad Monte Carlo v18: 200 iteraciones por pedido
  const iterations = 200;

  for (let iter = 0; iter < iterations; iter++) {
    const pool: InternalPart[] = filteredParts.flatMap((p, idx) => 
      Array.from({ length: p.quantity }, () => ({
        ...p,
        originalIndex: idx,
        placed: false
      }))
    );

    // Estrategias de ordenamiento mezcladas con mutación estocástica
    if (iter === 0) pool.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    else if (iter === 1) pool.sort((a, b) => b.height - a.height || b.width - a.width);
    else shuffle(pool);

    const currentResult = executeBAF(pool, usableW, usableH, kerf, trim, panelWidth, panelHeight, partColors);
    
    // Evaluación de Calidad de Solución (Prioridad Paneles -> Calidad Sobrante)
    const solutionScore = evaluateSolutionQuality(currentResult, usableW, usableH);

    if (solutionScore > bestGlobalScore) {
      bestGlobalScore = solutionScore;
      bestGlobalResult = currentResult;
    }
  }

  return bestGlobalResult || { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Error v18", kerf, trim, selectedThickness };
}

function executeBAF(
  pool: InternalPart[], 
  algoW: number, 
  algoH: number, 
  kerf: number, 
  trim: number, 
  panelWidth: number,
  panelHeight: number,
  colors: Record<string, string>
): OptimizationResult {
  const panels: OptimizedPanel[] = [];
  const workingPool = pool.map(p => ({ ...p }));

  while (workingPool.some(p => !p.placed)) {
    const placedParts: OptimizedPart[] = [];
    const freeRects: FreeRect[] = [{ x: trim, y: trim, width: algoW, height: algoH }];

    for (const part of workingPool) {
      if (part.placed) continue;

      let bestRectIdx = -1;
      let minWaste = Infinity;
      let rotated = false;

      // Buscar el mejor rectángulo libre (Best Area Fit)
      for (let i = 0; i < freeRects.length; i++) {
        const r = freeRects[i];
        
        // Probar normal
        if (part.width <= r.width && part.height <= r.height) {
          const waste = (r.width * r.height) - (part.width * part.height);
          if (waste < minWaste) {
            minWaste = waste;
            bestRectIdx = i;
            rotated = false;
          }
        }

        // Probar rotado
        if (part.grainDirection === 'libre' && part.height <= r.width && part.width <= r.height) {
          const waste = (r.width * r.height) - (part.width * part.height);
          if (waste < minWaste) {
            minWaste = waste;
            bestRectIdx = i;
            rotated = true;
          }
        }
      }

      // Si encaja, colocar y dividir el rectángulo
      if (bestRectIdx !== -1) {
        const r = freeRects[bestRectIdx];
        const w = rotated ? part.height : part.width;
        const h = rotated ? part.width : part.height;

        placedParts.push({
          name: part.name,
          x: r.x,
          y: r.y,
          width: w,
          height: h,
          rotated,
          color: colors[part.name]
        });

        part.placed = true;
        
        // Guillotine Split: Decidir eje de división para maximizar áreas libres contiguas
        splitGuillotine(freeRects, bestRectIdx, w, h, kerf);
      }
    }

    if (placedParts.length === 0) break;

    const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
    panels.push({
      panelNumber: panels.length + 1,
      parts: placedParts,
      efficiency: (usedArea / (panelWidth * panelHeight)) * 100,
      usedArea,
      totalArea: panelWidth * panelHeight
    });
  }

  const totalUsed = panels.reduce((acc, p) => acc + p.usedArea, 0);
  const totalAvail = panels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency: (totalUsed / totalAvail) * 100,
    summary: `JADSI v18 Hybrid: Optimización DGP con consolidación de bloques.`,
    kerf,
    trim,
    selectedThickness: pool[0].thickness
  };
}

/**
 * Divide un rectángulo libre tras insertar una pieza siguiendo la lógica de Guillotina.
 * Favorece que el desperdicio quede en el formato más grande posible.
 */
function splitGuillotine(freeRects: FreeRect[], idx: number, partW: number, partH: number, kerf: number) {
  const r = freeRects.splice(idx, 1)[0];

  const remW = r.width - partW - kerf;
  const remH = r.height - partH - kerf;

  // Estrategia: Dividir por el lado que deje el rectángulo más grande intacto
  if (remW * r.height > remH * r.width) {
    // Corte vertical primero
    if (remW > 0) freeRects.push({ x: r.x + partW + kerf, y: r.y, width: remW, height: r.height });
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + partH + kerf, width: partW, height: remH });
  } else {
    // Corte horizontal primero
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + partH + kerf, width: r.width, height: remH });
    if (remW > 0) freeRects.push({ x: r.x + partW + kerf, y: r.y, width: remW, height: partH });
  }
}

/**
 * Puntuador de Calidad JADSI v18
 * 1. Minimizar Paneles (Peso 1e15)
 * 2. Eficiencia (Peso 1e10)
 * 3. Calidad del Desperdicio (Penaliza fragmentos < 60mm, premia bloques grandes)
 */
function evaluateSolutionQuality(result: OptimizationResult, algoW: number, algoH: number): number {
  let score = (1000 / result.totalPanels) * 1e15 + (result.totalEfficiency * 1e10);
  
  result.optimizedLayout.forEach(panel => {
    // Encontrar el rectángulo de aire más grande al final del panel (como Lepton)
    const maxX = panel.parts.reduce((m, p) => Math.max(m, p.x + p.width), 0);
    const maxY = panel.parts.reduce((m, p) => Math.max(m, p.y + p.height), 0);
    
    const wasteW = algoW - (maxX - panel.parts[0].x); 
    const wasteH = algoH - (maxY - panel.parts[0].y);

    // Premiar si el sobrante es grande y tiene buena proporción
    const minDim = Math.min(wasteW, wasteH);
    if (minDim < 60) {
      score -= 5000000; // Penalización por tira inútil
    } else if (minDim > 150) {
      score += (wasteW * wasteH) * 2; // Bono por bloque reutilizable
    }
  });

  return score;
}

function shuffle(arr: any[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 65%, 60%, 0.3)`;
  });
  return colors;
}
