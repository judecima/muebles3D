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
 * JADSI Industrial Engine v23.0 - Precision Contact & Cluster Affinity
 * 
 * Basado en la regla de Contact Point (CP) combinada con Best Area Fit (BAF).
 * Diseñado para maximizar la densidad global y consolidar sobrantes monolíticos.
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

  // Búsqueda Ultra-Intensiva v23.0: 5000 iteraciones para encontrar el óptimo global
  const iterations = 5000;

  for (let iter = 0; iter < iterations; iter++) {
    const pool: InternalPart[] = filteredParts.flatMap((p, idx) => 
      Array.from({ length: p.quantity }, () => ({
        ...p,
        originalIndex: idx,
        placed: false
      }))
    );

    // Estrategias de ordenamiento jerárquico + Mutación Monte Carlo
    if (iter === 0) {
      pool.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    } else if (iter === 1) {
      pool.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
    } else if (iter === 2) {
      pool.sort((a, b) => b.width - a.width || b.height - a.height);
    } else {
      clusterShuffle(pool);
    }

    // Evaluación Dual-Axis con Contact Point Heuristic
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

  return bestGlobalResult || { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Error v23.0", kerf, trim, selectedThickness };
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

    for (let i = 0; i < workingPool.length; i++) {
      const part = workingPool[i];
      if (part.placed) continue;

      let bestRectIdx = -1;
      let maxContactScore = -1;
      let minResidueArea = Infinity;
      let rotated = false;

      for (let j = 0; j < freeRects.length; j++) {
        const r = freeRects[j];
        
        // 1. Evaluar Orientación Normal
        if (part.width <= r.width && part.height <= r.height) {
          const cpScore = calculateContactScore(r.x, r.y, part.width, part.height, panelWidth, panelHeight, trim, r);
          const residue = (r.width * r.height) - (part.width * part.height);
          
          if (cpScore > maxContactScore || (cpScore === maxContactScore && residue < minResidueArea)) {
            maxContactScore = cpScore;
            minResidueArea = residue;
            bestRectIdx = j;
            rotated = false;
          }
        }

        // 2. Evaluar Orientación Rotada (si está permitido)
        const rotationAllowed = !hasGrain || part.grainDirection === 'libre';
        if (rotationAllowed && part.height <= r.width && part.width <= r.height) {
          const cpScore = calculateContactScore(r.x, r.y, part.height, part.width, panelWidth, panelHeight, trim, r);
          const residue = (r.width * r.height) - (part.height * part.width);

          if (cpScore > maxContactScore || (cpScore === maxContactScore && residue < minResidueArea)) {
            maxContactScore = cpScore;
            minResidueArea = residue;
            bestRectIdx = j;
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
        
        // Lógica de Agrupamiento Proactiva (Cluster Affinity)
        // Intentar llenar la franja creada con piezas del mismo tipo/tamaño inmediatamente
        fillStripWithCluster(workingPool, freeRects, kerf, strategy, hasGrain, colors, placedParts, panelWidth, panelHeight, trim);
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
    summary: `JADSI v23.0 Precision Contact: ${strategy === 'vertical' ? 'Vertical' : 'Horizontal'}.`,
    kerf,
    trim,
    selectedThickness: pool[0].thickness
  };
}

/**
 * Heurística de Contact Point (CP)
 * Premiar piezas que toquen bordes del panel o límites del rectángulo libre.
 * Esto obliga a las piezas a consolidarse en las esquinas y contra otras piezas.
 */
function calculateContactScore(x: number, y: number, w: number, h: number, pW: number, pH: number, trim: number, r: FreeRect): number {
  let score = 0;
  // Contacto con bordes externos (incluyendo refilado)
  if (Math.abs(x - trim) < 0.5) score += h;
  if (Math.abs(y - trim) < 0.5) score += w;
  if (Math.abs(x + w - (pW - trim)) < 0.5) score += h;
  if (Math.abs(y + h - (pH - trim)) < 0.5) score += w;

  // Contacto con límites de guillotina del rectángulo libre (bordes de otras piezas)
  if (Math.abs(w - r.width) < 0.5) score += h * 2; // Alineación perfecta de columna/tira
  if (Math.abs(h - r.height) < 0.5) score += w * 2;

  return score;
}

/**
 * Busca agresivamente piezas del mismo clúster para llenar la franja actual.
 */
function fillStripWithCluster(
  pool: InternalPart[], 
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

  for (let i = 0; i < pool.length; i++) {
    const part = pool[i];
    if (part.placed) continue;

    let bestRectIdx = -1;
    let currentRotated = false;
    let maxCP = -1;

    for (let j = 0; j < freeRects.length; j++) {
      const r = freeRects[j];
      const canRotate = !hasGrain || part.grainDirection === 'libre';

      // 1. Prioridad Absoluta: Pieza idéntica en el mismo eje
      const wN = part.width; const hN = part.height;
      if (part.name === last.name && wN === (last.rotated ? last.height : last.width) && hN === (last.rotated ? last.width : last.height)) {
        if (wN <= r.width && hN <= r.height) {
          if (Math.abs(wN - r.width) < 0.5 || Math.abs(hN - r.height) < 0.5) {
            bestRectIdx = j; currentRotated = last.rotated; break;
          }
        }
      }

      // 2. Prioridad Secundaria: Cualquier pieza que maximice contacto (CP)
      if (part.width <= r.width && part.height <= r.height) {
        const cp = calculateContactScore(r.x, r.y, part.width, part.height, pW, pH, trim, r);
        if (cp > maxCP) { maxCP = cp; bestRectIdx = j; currentRotated = false; }
      }
      if (canRotate && part.height <= r.width && part.width <= r.height) {
        const cp = calculateContactScore(r.x, r.y, part.height, part.width, pW, pH, trim, r);
        if (cp > maxCP) { maxCP = cp; bestRectIdx = j; currentRotated = true; }
      }
    }

    if (bestRectIdx !== -1) {
      const r = freeRects[bestRectIdx];
      const w = currentRotated ? part.height : part.width;
      const h = currentRotated ? part.width : part.height;

      placedParts.push({
        name: part.name,
        x: r.x,
        y: r.y,
        width: w,
        height: h,
        rotated: currentRotated,
        color: colors[part.name]
      });

      part.placed = true;
      splitGuillotine(freeRects, bestRectIdx, w, h, kerf, strategy);
    }
  }
}

function splitGuillotine(freeRects: FreeRect[], idx: number, partW: number, partH: number, kerf: number, strategy: 'vertical' | 'horizontal') {
  const r = freeRects.splice(idx, 1)[0];
  const remW = r.width - partW - kerf;
  const remH = r.height - partH - kerf;

  if (strategy === 'vertical') {
    if (remW > 0) freeRects.push({ x: r.x + partW + kerf, y: r.y, width: remW, height: r.height });
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + partH + kerf, width: partW, height: remH });
  } else {
    if (remH > 0) freeRects.push({ x: r.x, y: r.y + partH + kerf, width: r.width, height: remH });
    if (remW > 0) freeRects.push({ x: r.x + partW + kerf, y: r.y, width: remW, height: partH });
  }
}

function evaluateSolution(result: OptimizationResult): number {
  const p1 = result.optimizedLayout[0];
  const p1Efficiency = p1 ? p1.efficiency : 0;

  // Prioridad 1: Menor cantidad de paneles (Peso exponencial)
  let score = (1000 / result.totalPanels) * 1e25; 
  
  // Prioridad 2: Eficiencia extrema del Panel 1 (>94%)
  score += p1Efficiency * 1e20; 

  // Prioridad 3: Calidad del sobrante (Premiar bloques grandes y penalizar fragmentos)
  result.optimizedLayout.forEach(panel => {
    panel.leftovers?.forEach(l => {
      const area = l.width * l.height;
      const minSide = Math.min(l.width, l.height);
      if (minSide > 300) score += area * 1e5; // Bono por bloque reutilizable grande
      if (minSide < 60) score -= 1e15; // Penalización por residuo inservible
    });
  });

  return score;
}

function clusterShuffle(pool: InternalPart[]) {
  const groups: Map<string, InternalPart[]> = new Map();
  pool.forEach(p => {
    const key = `${p.width}x${p.height}x${p.name}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  });

  const groupArray = Array.from(groups.values());
  for (let i = groupArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [groupArray[i], groupArray[j]] = [groupArray[j], groupArray[i]];
  }

  let idx = 0;
  groupArray.forEach(group => group.forEach(p => { pool[idx++] = p; }));
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 75%, 50%, 0.35)`;
  });
  return colors;
}
