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
 * JADSI Industrial Engine v22.0 - Hyper-Density Pack
 * 
 * Basado en algoritmos de afinidad de clúster y empaquetado por franjas maestras.
 * Optimizado para maximizar la eficiencia del primer panel (>94%) y consolidar sobrantes.
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

  // Búsqueda Ultra-Intensiva v22.0: 5000 iteraciones
  const iterations = 5000;

  for (let iter = 0; iter < iterations; iter++) {
    const pool: InternalPart[] = filteredParts.flatMap((p, idx) => 
      Array.from({ length: p.quantity }, () => ({
        ...p,
        originalIndex: idx,
        placed: false
      }))
    );

    // Estrategias de ordenamiento híbridas
    if (iter === 0) {
      pool.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    } else if (iter === 1) {
      pool.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
    } else if (iter === 2) {
      pool.sort((a, b) => b.width - a.width || b.height - a.height);
    } else if (iter === 3) {
      pool.sort((a, b) => b.height - a.height || b.width - a.width);
    } else {
      clusterShuffle(pool);
    }

    // Evaluación Dual-Axis (Vertical vs Horizontal)
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

  return bestGlobalResult || { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Error v22.0", kerf, trim, selectedThickness };
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
      let minWasteScore = Infinity;
      let rotated = false;

      for (let j = 0; j < freeRects.length; j++) {
        const r = freeRects[j];
        
        // Test Normal
        if (part.width <= r.width && part.height <= r.height) {
          let score = (r.width * r.height) - (part.width * part.height);
          // Bono masivo por Stacking (Coincidencia de eje)
          if (Math.abs(part.width - r.width) < 1) score -= 5000000;
          if (Math.abs(part.height - r.height) < 1) score -= 5000000;
          
          if (score < minWasteScore) {
            minWasteScore = score;
            bestRectIdx = j;
            rotated = false;
          }
        }

        // Test Rotated
        const rotationAllowed = !hasGrain || part.grainDirection === 'libre';
        if (rotationAllowed && part.height <= r.width && part.width <= r.height) {
          let score = (r.width * r.height) - (part.width * part.height);
          if (Math.abs(part.height - r.width) < 1) score -= 5000000;
          if (Math.abs(part.width - r.height) < 1) score -= 5000000;

          if (score < minWasteScore) {
            minWasteScore = score;
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
        
        // Lógica de Llenado de Franja: Intentar agotar piezas idénticas o que encajen perfecto
        fillStripAggressively(workingPool, freeRects, kerf, strategy, hasGrain, colors, placedParts);
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
    summary: `JADSI v22.0 Hyper-Density: ${strategy === 'vertical' ? 'Vertical' : 'Horizontal'}.`,
    kerf,
    trim,
    selectedThickness: pool[0].thickness
  };
}

/**
 * Busca piezas que encajen perfectamente en la franja actual para evitar fragmentación.
 */
function fillStripAggressively(
  pool: InternalPart[], 
  freeRects: FreeRect[], 
  kerf: number, 
  strategy: 'vertical' | 'horizontal',
  hasGrain: boolean,
  colors: Record<string, string>,
  placedParts: OptimizedPart[]
) {
  if (placedParts.length === 0) return;
  const last = placedParts[placedParts.length - 1];

  for (let i = 0; i < pool.length; i++) {
    const part = pool[i];
    if (part.placed) continue;

    let bestRectIdx = -1;
    let currentRotated = false;

    for (let j = 0; j < freeRects.length; j++) {
      const r = freeRects[j];
      const canRotate = !hasGrain || part.grainDirection === 'libre';

      // Prioridad 1: Pieza idéntica en misma orientación
      const wN = part.width; const hN = part.height;
      if (part.name === last.name && wN === (last.rotated ? last.height : last.width) && hN === (last.rotated ? last.width : last.height)) {
        if (wN <= r.width && hN <= r.height) {
          if (Math.abs(wN - r.width) < 1 || Math.abs(hN - r.height) < 1) {
            bestRectIdx = j; currentRotated = last.rotated; break;
          }
        }
      }

      // Prioridad 2: Cualquier pieza que encaje perfecto en el ancho/alto de la franja
      if (part.width <= r.width && part.height <= r.height) {
        if (Math.abs(part.width - r.width) < 0.5 || Math.abs(part.height - r.height) < 0.5) {
          bestRectIdx = j; currentRotated = false; break;
        }
      }
      if (canRotate && part.height <= r.width && part.width <= r.height) {
        if (Math.abs(part.height - r.width) < 0.5 || Math.abs(part.width - r.height) < 0.5) {
          bestRectIdx = j; currentRotated = true; break;
        }
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
  // Factor Panel 1: El más importante
  const p1 = result.optimizedLayout[0];
  const p1Efficiency = p1 ? p1.efficiency : 0;

  let score = (1000 / result.totalPanels) * 1e25; // Prioridad absoluta: menos paneles
  score += p1Efficiency * 1e20; // Prioridad 2: llenar el primer panel al máximo

  // Bono por contigüidad de piezas hermanas
  result.optimizedLayout.forEach(panel => {
    for (let i = 0; i < panel.parts.length; i++) {
      for (let j = i + 1; j < panel.parts.length; j++) {
        const p1 = panel.parts[i];
        const p2 = panel.parts[j];
        if (p1.name === p2.name) {
          const isContiguous = Math.abs(p1.x - (p2.x + p2.width)) < 10 || 
                               Math.abs(p2.x - (p1.x + p1.width)) < 10 ||
                               Math.abs(p1.y - (p2.y + p2.height)) < 10 ||
                               Math.abs(p2.y - (p1.y + p1.height)) < 10;
          if (isContiguous) score += 1e15; 
        }
      }
    }
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
