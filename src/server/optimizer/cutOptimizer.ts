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
 * JADSI Industrial Engine v20.0 - Perfect Stacking & Cluster Nesting
 * 
 * Basado en algoritmos de impacto global con afinidad geométrica.
 * Maximiza la densidad agrupando piezas de dimensiones idénticas en el mismo eje de guillotina.
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

  let bestGlobalResult: OptimizationResult | null = null;
  let bestGlobalScore = -Infinity;

  // Monte Carlo v20.0: 3000 iteraciones para búsqueda exhaustiva
  const iterations = 3000;

  for (let iter = 0; iter < iterations; iter++) {
    const pool: InternalPart[] = filteredParts.flatMap((p, idx) => 
      Array.from({ length: p.quantity }, () => ({
        ...p,
        originalIndex: idx,
        placed: false
      }))
    );

    // Estrategia de ordenamiento jerárquico v20.0
    if (iter === 0) {
      // Orden por Area Descendente (Estrategia Clásica)
      pool.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    } else if (iter === 1) {
      // Orden por Lado Largo (Estrategia de Tira)
      pool.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
    } else {
      // Barajado por Clústeres: Agrupamos piezas iguales y barajamos los grupos
      clusterShuffle(pool);
    }

    // Probamos ambas orientaciones maestras
    const resultH = executeLayout(pool.map(p => ({...p})), usableW, usableH, kerf, trim, panelWidth, panelHeight, partColors, 'horizontal', hasGrain);
    const resultV = executeLayout(pool.map(p => ({...p})), usableW, usableH, kerf, trim, panelWidth, panelHeight, partColors, 'vertical', hasGrain);
    
    [resultH, resultV].forEach(res => {
      const score = evaluateSolution(res);
      if (score > bestGlobalScore) {
        bestGlobalScore = score;
        bestGlobalResult = res;
      }
    });
  }

  return bestGlobalResult || { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Error v20.0", kerf, trim, selectedThickness };
}

function executeLayout(
  pool: InternalPart[], 
  algoW: number, 
  algoH: number, 
  kerf: number, 
  trim: number, 
  panelWidth: number,
  panelHeight: number,
  colors: Record<string, string>,
  strategy: 'vertical' | 'horizontal',
  hasGrain: boolean
): OptimizationResult {
  const panels: OptimizedPanel[] = [];
  const workingPool = pool;

  while (workingPool.some(p => !p.placed)) {
    const placedParts: OptimizedPart[] = [];
    const freeRects: FreeRect[] = [{ x: trim, y: trim, width: algoW, height: algoH }];

    for (const part of workingPool) {
      if (part.placed) continue;

      let bestRectIdx = -1;
      let minWasteScore = Infinity;
      let rotated = false;

      for (let i = 0; i < freeRects.length; i++) {
        const r = freeRects[i];
        
        // Test Normal
        if (part.width <= r.width && part.height <= r.height) {
          // Score v20.0: Area residual + Bono por coincidencia perfecta de dimensión
          let score = (r.width * r.height) - (part.width * part.height);
          if (Math.abs(part.width - r.width) < 1) score -= 1000000; // Coincidencia de Ancho
          if (Math.abs(part.height - r.height) < 1) score -= 1000000; // Coincidencia de Alto
          
          if (score < minWasteScore) {
            minWasteScore = score;
            bestRectIdx = i;
            rotated = false;
          }
        }

        // Test Rotated
        const rotationAllowed = !hasGrain || part.grainDirection === 'libre';
        if (rotationAllowed && part.height <= r.width && part.width <= r.height) {
          let score = (r.width * r.height) - (part.width * part.height);
          if (Math.abs(part.height - r.width) < 1) score -= 1000000;
          if (Math.abs(part.width - r.height) < 1) score -= 1000000;

          if (score < minWasteScore) {
            minWasteScore = score;
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
        splitGuillotine(freeRects, bestRectIdx, w, h, kerf, strategy);
      }
    }

    if (placedParts.length === 0) break;

    const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
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
    summary: `JADSI v20.0 Industrial Stacking: Estrategia ${strategy === 'vertical' ? 'Vertical (X-Rip)' : 'Horizontal (Y-Rip)'}.`,
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
    // Primer corte Vertical (X-Axis)
    if (remW > 0) freeRects.push({ x: r.x + partW + kerf, y: r.y, width: remW, height: r.height });
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + partH + kerf, width: partW, height: remH });
  } else {
    // Primer corte Horizontal (Y-Axis)
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + partH + kerf, width: r.width, height: remH });
    if (remW > 0) freeRects.push({ x: r.x + partW + kerf, y: r.y, width: remW, height: partH });
  }
}

function evaluateSolution(result: OptimizationResult): number {
  // Prioridad 1: Menos Paneles (Penalización masiva por panel extra)
  let score = (1000 / result.totalPanels) * 1e18;
  
  // Prioridad 2: Eficiencia Global
  score += result.totalEfficiency * 1e12;

  // Prioridad 3: Consolidación de Sobrantes (Preferir bloques únicos grandes)
  result.optimizedLayout.forEach(panel => {
    if (panel.leftovers && panel.leftovers.length > 0) {
      const largest = panel.leftovers.reduce((m, r) => (r.width * r.height > m.area ? {area: r.width * r.height, r} : m), {area: 0, r: panel.leftovers[0]});
      const l = largest.r;
      const minDim = Math.min(l.width, l.height);
      const aspectRatio = minDim / Math.max(l.width, l.height);
      
      // Bonus por área útil consolidada
      score += (l.width * l.height) * 10;
      // Bonus por forma cuadrada (reutilizable)
      score += (l.width * l.height) * aspectRatio * 5;
    }
    // Penalización por fragmentación (muchos sobrantes pequeños)
    if (panel.leftovers && panel.leftovers.length > 4) {
      score -= panel.leftovers.length * 1e9;
    }
  });

  return score;
}

function clusterShuffle(pool: InternalPart[]) {
  // Agrupamos piezas por dimensiones idénticas
  const groups: Map<string, InternalPart[]> = new Map();
  pool.forEach(p => {
    const key = `${p.width}x${p.height}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  });

  const groupArray = Array.from(groups.values());
  // Barajamos los grupos
  for (let i = groupArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [groupArray[i], groupArray[j]] = [groupArray[j], groupArray[i]];
  }

  // Reconstruimos el pool manteniendo los grupos unidos
  let idx = 0;
  groupArray.forEach(group => {
    group.forEach(p => {
      pool[idx++] = p;
    });
  });
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 70%, 55%, 0.35)`;
  });
  return colors;
}
