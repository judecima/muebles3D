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
 * JADSI Industrial Engine v18.5 - DGP (Density Global Positioning)
 * 
 * Este motor implementa una arquitectura híbrida de Guillotina Recursiva
 * con Evaluación de Impacto de Eje (Dual-Pass). 
 * Se optimizó para igualar la eficiencia de consolidación de Lepton.
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

  // Monte Carlo v18.5: 2000 iteraciones para exploración masiva del espacio de corte
  const iterations = 2000;

  for (let iter = 0; iter < iterations; iter++) {
    const pool: InternalPart[] = filteredParts.flatMap((p, idx) => 
      Array.from({ length: p.quantity }, () => ({
        ...p,
        originalIndex: idx,
        placed: false
      }))
    );

    // Estrategia de barajado estocástico
    if (iter === 0) pool.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    else if (iter === 1) pool.sort((a, b) => b.height - a.height || b.width - a.width);
    else shuffle(pool);

    // Simulación Dual: Probamos si es mejor empezar con guillotina vertical u horizontal
    const resultH = executeBAF(pool.map(p => ({...p})), usableW, usableH, kerf, trim, panelWidth, panelHeight, partColors, 'horizontal');
    const resultV = executeBAF(pool.map(p => ({...p})), usableW, usableH, kerf, trim, panelWidth, panelHeight, partColors, 'vertical');
    
    [resultH, resultV].forEach(res => {
      const score = evaluateSolutionQuality(res, usableW, usableH);
      if (score > bestGlobalScore) {
        bestGlobalScore = score;
        bestGlobalResult = res;
      }
    });
  }

  return bestGlobalResult || { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Error v18.5", kerf, trim, selectedThickness };
}

function executeBAF(
  pool: InternalPart[], 
  algoW: number, 
  algoH: number, 
  kerf: number, 
  trim: number, 
  panelWidth: number,
  panelHeight: number,
  colors: Record<string, string>,
  splitStrategy: 'vertical' | 'horizontal'
): OptimizationResult {
  const panels: OptimizedPanel[] = [];
  const workingPool = pool;

  while (workingPool.some(p => !p.placed)) {
    const placedParts: OptimizedPart[] = [];
    const freeRects: FreeRect[] = [{ x: trim, y: trim, width: algoW, height: algoH }];

    for (const part of workingPool) {
      if (part.placed) continue;

      let bestRectIdx = -1;
      let minWaste = Infinity;
      let rotated = false;

      // Best Area Fit Placement
      for (let i = 0; i < freeRects.length; i++) {
        const r = freeRects[i];
        
        // Test Normal
        if (part.width <= r.width && part.height <= r.height) {
          const waste = (r.width * r.height) - (part.width * part.height);
          if (waste < minWaste) {
            minWaste = waste;
            bestRectIdx = i;
            rotated = false;
          }
        }

        // Test Rotated
        if (part.grainDirection === 'libre' && part.height <= r.width && part.width <= r.height) {
          const waste = (r.width * r.height) - (part.width * part.height);
          if (waste < minWaste) {
            minWaste = waste;
            bestRectIdx = i;
            rotated = true;
          }
        }
      }

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
        
        // División de Guillotina basada en la estrategia maestra
        splitGuillotine(freeRects, bestRectIdx, w, h, kerf, splitStrategy);
      }
    }

    if (placedParts.length === 0) break;

    const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
    
    // Extracción de sobrantes (rectángulos libres finales mayores a 60mm)
    const leftovers = freeRects
      .filter(r => r.width >= 60 && r.height >= 60)
      .map((r, i) => ({
        name: `S${i + 1}`,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        rotated: false,
        isLeftover: true
      }));

    panels.push({
      panelNumber: panels.length + 1,
      parts: placedParts,
      efficiency: (usedArea / (panelWidth * panelHeight)) * 100,
      usedArea,
      totalArea: panelWidth * panelHeight,
      leftovers
    });
  }

  const totalUsed = panels.reduce((acc, p) => acc + p.usedArea, 0);
  const totalAvail = panels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency: (totalUsed / totalAvail) * 100,
    summary: `JADSI v18.5 DGP: Estrategia ${splitStrategy === 'vertical' ? 'Vertical' : 'Horizontal'}.`,
    kerf,
    trim,
    selectedThickness: pool[0].thickness
  };
}

function splitGuillotine(freeRects: FreeRect[], idx: number, partW: number, partH: number, kerf: number, strategy: 'vertical' | 'horizontal') {
  const r = freeRects.splice(idx, 1)[0];

  const remW = r.width - partW - kerf;
  const remH = r.height - partH - kerf;

  if (strategy === 'vertical') {
    // Guillotina Vertical: Cortamos la columna completa primero
    if (remW > 0) freeRects.push({ x: r.x + partW + kerf, y: r.y, width: remW, height: r.height });
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + partH + kerf, width: partW, height: remH });
  } else {
    // Guillotina Horizontal: Cortamos la fila completa primero
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + partH + kerf, width: r.width, height: remH });
    if (remW > 0) freeRects.push({ x: r.x + partW + kerf, y: r.y, width: remW, height: partH });
  }
}

function evaluateSolutionQuality(result: OptimizationResult, algoW: number, algoH: number): number {
  // Prioridad 1: Mínimos Paneles (Peso masivo)
  let score = (1000 / result.totalPanels) * 1e15;
  
  // Prioridad 2: Eficiencia (Peso alto)
  score += result.totalEfficiency * 1e10;

  // Prioridad 3: Calidad del Desperdicio (Lepton Style)
  result.optimizedLayout.forEach(panel => {
    if (panel.leftovers && panel.leftovers.length > 0) {
      // Premiamos al rectángulo de aire más grande
      const largestLeftover = panel.leftovers.reduce((m, r) => (r.width * r.height > m.area ? {area: r.width * r.height, r} : m), {area: 0, r: panel.leftovers[0]});
      
      const l = largestLeftover.r;
      const minDim = Math.min(l.width, l.height);
      const aspect = minDim / Math.max(l.width, l.height);

      // Bono por bloque masivo y proporcionado (cuadrado/útil)
      if (minDim > 300) score += (l.width * l.height) * 5;
      score += (l.width * l.height) * aspect; 
    }
    
    // Penalización por fragmentación (muchos retazos pequeños)
    if (panel.leftovers && panel.leftovers.length > 5) score -= 1e8;
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
