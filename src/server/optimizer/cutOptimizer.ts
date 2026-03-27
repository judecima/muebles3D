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

interface Strip {
  size: number; // Ancho compartido si modo=vertical (Columnas), Alto compartido si modo=horizontal (Filas)
  pieces: InternalPart[];
}

/**
 * JADSI v42.1 STRIP ENGINE
 * Motor de optimización industrial basado en el agrupamiento por tiras (Strips).
 * Corrige la simetría entre cortes verticales y horizontales para seccionadoras de guillotina.
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

  const usableW = panelWidth - trim * 2;
  const usableH = panelHeight - trim * 2;

  let pool: InternalPart[] = filteredParts.flatMap((p, idx) =>
    Array.from({ length: p.quantity }, () => ({
      ...p,
      originalIndex: idx,
      placed: false
    }))
  );

  const panels: OptimizedPanel[] = [];
  let panelNumber = 1;

  while (pool.some(p => !p.placed)) {
    const remaining = pool.filter(p => !p.placed);

    // Evaluamos ambas estrategias de corte para el panel actual de forma independiente
    // Vertical: Cortes primarios verticales -> Forman Columnas -> Comparten Ancho
    // Horizontal: Cortes primarios horizontales -> Forman Filas -> Comparten Alto
    const verticalStrips = buildStrips(remaining, 'vertical', usableH, hasGrain, kerf);
    const horizontalStrips = buildStrips(remaining, 'horizontal', usableW, hasGrain, kerf);

    const bestStrategy = evaluateStripLayout(verticalStrips, horizontalStrips, usableW, usableH, kerf);

    const panel = layoutStrips(
      bestStrategy,
      usableW,
      usableH,
      trim,
      kerf,
      panelWidth,
      panelHeight,
      panelNumber
    );

    if (panel.parts.length === 0) break;

    markPlaced(pool, panel.parts);
    panels.push(panel);
    panelNumber++;
    
    if (panelNumber > 50) break; // Límite de seguridad
  }

  const totalUsed = panels.reduce((a, p) => a + p.usedArea, 0);
  const totalArea = panels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: panels,
    totalPanels: panels.length,
    totalEfficiency: panels.length > 0 ? (totalUsed / totalArea) * 100 : 0,
    summary: "JADSI v42.1 STRIP ENGINE - Optimización industrial por tiras simétricas (Filas/Columnas)",
    kerf,
    trim,
    selectedThickness
  };
}

// ================= STRIPS =================

function buildStrips(
  pieces: InternalPart[],
  mode: 'vertical' | 'horizontal',
  stackLimit: number,
  hasGrain: boolean,
  kerf: number
): Strip[] {
  const groups = new Map<number, InternalPart[]>();

  for (const p of pieces) {
    if (p.placed) continue;

    // En modo Vertical (Columnas), las piezas deben tener el mismo ANCHO para que el corte sea recto
    // En modo Horizontal (Filas), las piezas deben tener el mismo ALTO
    const key = mode === 'vertical' ? p.width : p.height;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);

    // Probar rotación virtual para mejorar el agrupamiento (si se permite)
    const canRotate = !hasGrain || p.grainDirection === 'libre';
    if (canRotate && p.width !== p.height) {
      const rotKey = mode === 'vertical' ? p.height : p.width;
      if (rotKey !== key) {
        if (!groups.has(rotKey)) groups.set(rotKey, []);
        groups.get(rotKey)!.push({ ...p, width: p.height, height: p.width });
      }
    }
  }

  const strips: Strip[] = [];

  for (const [size, list] of groups.entries()) {
    // Ordenamos piezas de la tira por área para maximizar densidad
    const sorted = [...list].sort((a, b) => (b.width * b.height) - (a.width * a.height));
    const selected: InternalPart[] = [];
    let usedInStack = 0;

    for (const p of sorted) {
      // En modo Vertical apilamos por ALTO (dimensión vertical)
      // En modo Horizontal apilamos por ANCHO (dimensión horizontal)
      const stackDim = mode === 'vertical' ? p.height : p.width;

      if (usedInStack + stackDim <= stackLimit) {
        selected.push(p);
        usedInStack += stackDim + kerf;
      }
    }

    if (selected.length > 0) {
      strips.push({ size, pieces: selected });
    }
  }

  // Ordenar tiras por área total ocupada para priorizar el llenado denso del panel
  return strips.sort((a, b) => {
    const areaA = a.size * a.pieces.reduce((sum, p) => sum + (mode === 'vertical' ? p.height : p.width), 0);
    const areaB = b.size * b.pieces.reduce((sum, p) => sum + (mode === 'vertical' ? p.height : p.width), 0);
    return areaB - areaA;
  });
}

// ================= EVALUACION =================

function evaluateStripLayout(
  vertical: Strip[],
  horizontal: Strip[],
  usableW: number,
  usableH: number,
  kerf: number
): { strips: Strip[], mode: 'vertical' | 'horizontal' } {
  
  const calculateTotalArea = (strips: Strip[], panelLimit: number, mode: 'vertical' | 'horizontal') => {
    let totalArea = 0;
    let currentPos = 0;
    for (const s of strips) {
      if (currentPos + s.size <= panelLimit) {
        totalArea += s.size * s.pieces.reduce((sum, p) => sum + (mode === 'vertical' ? p.height : p.width), 0);
        currentPos += s.size + kerf;
      }
    }
    return totalArea;
  };

  const areaV = calculateTotalArea(vertical, usableW, 'vertical');
  const areaH = calculateTotalArea(horizontal, usableH, 'horizontal');

  // Seleccionamos la estrategia que mejor aprovecha el área de ESTE tablero
  return areaV >= areaH
    ? { strips: vertical, mode: 'vertical' }
    : { strips: horizontal, mode: 'horizontal' };
}

// ================= LAYOUT =================

function layoutStrips(
  config: { strips: Strip[], mode: 'vertical' | 'horizontal' },
  usableW: number,
  usableH: number,
  trim: number,
  kerf: number,
  panelWidth: number,
  panelHeight: number,
  panelNumber: number
): OptimizedPanel {
  const parts: OptimizedPart[] = [];
  let offsetX = trim;
  let offsetY = trim;

  const panelLimit = config.mode === 'vertical' ? usableW : usableH;

  for (const strip of config.strips) {
    const stripSize = strip.size;
    const currentPos = config.mode === 'vertical' ? offsetX : offsetY;

    // Validación de guillotina: si la tira entera no cabe, saltamos
    if (currentPos + stripSize > trim + panelLimit) continue;

    let cursor = trim; // El cursor avanza a lo largo de la tira

    for (const p of strip.pieces) {
      const pStackDim = config.mode === 'vertical' ? p.height : p.width;
      const stackLimit = config.mode === 'vertical' ? usableH : usableW;

      if (cursor + pStackDim > trim + stackLimit) break;

      parts.push({
        name: p.name,
        x: config.mode === 'vertical' ? offsetX : cursor,
        y: config.mode === 'vertical' ? cursor : offsetY,
        width: p.width,
        height: p.height,
        rotated: false
      });

      cursor += pStackDim + kerf;
    }

    if (config.mode === 'vertical') {
      offsetX += stripSize + kerf;
    } else {
      offsetY += stripSize + kerf;
    }
  }

  const usedArea = parts.reduce((a, p) => a + (p.width * p.height), 0);
  const totalArea = panelWidth * panelHeight;

  return {
    panelNumber,
    parts,
    efficiency: (usedArea / totalArea) * 100,
    usedArea,
    totalArea,
    leftovers: [],
    strategy: config.mode,
    stats: {
      totalAreaM2: totalArea / 1000000,
      usedAreaM2: usedArea / 1000000,
      leftoverAreaM2: 0,
      wasteAreaM2: (totalArea - usedArea) / 1000000,
      wastePercentage: 100 - ((usedArea / totalArea) * 100),
      displacements: parts.length + config.strips.length,
      linearMeters: 0
    }
  };
}

// ================= UTILS =================

function markPlaced(pool: InternalPart[], placed: OptimizedPart[]) {
  for (const p of placed) {
    const match = pool.find(x => 
      !x.placed && 
      x.name === p.name && 
      ((x.width === p.width && x.height === p.height) || (x.width === p.height && x.height === p.width))
    );
    if (match) match.placed = true;
  }
}
