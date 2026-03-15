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
 * JADSI Industrial Engine v21.0 - Cluster Affinity & Perfect Stacking
 * 
 * Basado en algoritmos de afinidad geométrica extrema.
 * Fuerza la contigüidad de piezas idénticas para generar sobrantes limpios y layouts industriales.
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

  // Búsqueda Intensiva v21.0: 3500 iteraciones
  const iterations = 3500;

  for (let iter = 0; iter < iterations; iter++) {
    const pool: InternalPart[] = filteredParts.flatMap((p, idx) => 
      Array.from({ length: p.quantity }, () => ({
        ...p,
        originalIndex: idx,
        placed: false
      }))
    );

    // Estrategia de ordenamiento v21.0: Mantener clústeres unidos
    if (iter === 0) {
      // Orden por Area Descendente (Maestro)
      pool.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    } else if (iter < 5) {
      // Orden por Lado Largo para forzar tiras
      pool.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
    } else {
      // Barajado por Clústeres
      clusterShuffle(pool);
    }

    // Probar ambas orientaciones maestras
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

  return bestGlobalResult || { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Error v21.0", kerf, trim, selectedThickness };
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

    // Procesamos el pool respetando la afinidad de clúster
    for (let i = 0; i < workingPool.length; i++) {
      const part = workingPool[i];
      if (part.placed) continue;

      let bestRectIdx = -1;
      let minWasteScore = Infinity;
      let rotated = false;

      // Evaluación de rectángulos con bono de afinidad industrial
      for (let j = 0; j < freeRects.length; j++) {
        const r = freeRects[j];
        
        // Test Normal
        if (part.width <= r.width && part.height <= r.height) {
          let score = (r.width * r.height) - (part.width * part.height);
          
          // Bono por coincidencia perfecta (Stacking)
          if (Math.abs(part.width - r.width) < 1) score -= 2000000;
          if (Math.abs(part.height - r.height) < 1) score -= 2000000;
          
          if (score < minWasteScore) {
            minWasteScore = score;
            bestRectIdx = j;
            rotated = false;
          }
        }

        // Test Rotated (si aplica)
        const rotationAllowed = !hasGrain || part.grainDirection === 'libre';
        if (rotationAllowed && part.height <= r.width && part.width <= r.height) {
          let score = (r.width * r.height) - (part.width * part.height);
          if (Math.abs(part.height - r.width) < 1) score -= 2000000;
          if (Math.abs(part.width - r.height) < 1) score -= 2000000;

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
        
        // Lógica de Afinidad Pro v21.0: 
        // Si acabamos de poner una pieza, intentamos llenar el resto de la "tira" con sus hermanas inmediatamente
        fillRemainingWithBrothers(workingPool, freeRects, kerf, strategy, hasGrain, colors, placedParts);
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
    summary: `JADSI v21.0 Cluster Pro: Estrategia ${strategy === 'vertical' ? 'Vertical (Columnas)' : 'Horizontal (Tiras)'}.`,
    kerf,
    trim,
    selectedThickness: pool[0].thickness
  };
}

/**
 * Busca piezas idénticas para llenar los huecos creados por el split actual,
 * garantizando que las piezas hermanas queden contiguas.
 */
function fillRemainingWithBrothers(
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

  // Buscamos en el pool piezas con el mismo nombre y dimensiones
  for (let i = 0; i < pool.length; i++) {
    const part = pool[i];
    if (part.placed) continue;

    // Solo hermanos idénticos
    if (part.name !== last.name || part.width !== (last.rotated ? last.height : last.width) || part.height !== (last.rotated ? last.width : last.height)) continue;

    let bestRectIdx = -1;
    let rotated = false;

    for (let j = 0; j < freeRects.length; j++) {
      const r = freeRects[j];
      
      // Intentamos encajar en la misma orientación que el hermano
      const w = last.rotated ? part.height : part.width;
      const h = last.rotated ? part.width : part.height;

      if (w <= r.width && h <= r.height) {
        // Bono masivo si la dimensión coincide con el rectángulo libre (continuar la tira)
        if (Math.abs(w - r.width) < 1 || Math.abs(h - r.height) < 1) {
          bestRectIdx = j;
          rotated = last.rotated;
          break;
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
      // Recursión implícita: seguimos buscando hermanos para los nuevos rectángulos
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
  // Prioridad 1: Menos Paneles
  let score = (1000 / result.totalPanels) * 1e20;
  
  // Prioridad 2: Eficiencia Global
  score += result.totalEfficiency * 1e15;

  // Prioridad 3: BONO DE AFINIDAD DE CLÚSTER (Contigüidad)
  // Recompensamos masivamente si piezas iguales están juntas
  result.optimizedLayout.forEach(panel => {
    for (let i = 0; i < panel.parts.length; i++) {
      for (let j = i + 1; j < panel.parts.length; j++) {
        const p1 = panel.parts[i];
        const p2 = panel.parts[j];
        if (p1.name === p2.name) {
          // Si comparten un eje X o Y cercano, están en la misma tira/columna
          const isContiguous = Math.abs(p1.x - (p2.x + p2.width)) < 10 || 
                               Math.abs(p2.x - (p1.x + p1.width)) < 10 ||
                               Math.abs(p1.y - (p2.y + p2.height)) < 10 ||
                               Math.abs(p2.y - (p1.y + p1.height)) < 10;
          if (isContiguous) score += 1e12; 
        }
      }
    }
  });

  // Prioridad 4: Consolidación de Sobrantes
  result.optimizedLayout.forEach(panel => {
    if (panel.leftovers && panel.leftovers.length > 0) {
      const largest = panel.leftovers.reduce((m, r) => (r.width * r.height > m.area ? {area: r.width * r.height, r} : m), {area: 0, r: panel.leftovers[0]});
      const l = largest.r;
      const minDim = Math.min(l.width, l.height);
      const aspectRatio = minDim / Math.max(l.width, l.height);
      score += (l.width * l.height) * 10 + (l.width * l.height) * aspectRatio * 5;
    }
    if (panel.leftovers && panel.leftovers.length > 4) score -= panel.leftovers.length * 1e10;
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
