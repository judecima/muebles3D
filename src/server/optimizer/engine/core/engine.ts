import { GrainDirection, OptimizedPanel, OptimizedPart } from '../../../../lib/types';
import { FreeRect, EngineConfig, EngineState, InternalPart } from '../types/engine';
import { stableSortParts, orderFreeRects } from '../utils';
import { selectBestPiece } from '../selection';
import { GuillotineStrategy } from '../space/guillotine';
import { evaluatePanelQuality } from '../scoring';

export function runOptimization(
  parts: any[],
  panelWidth: number,
  panelHeight: number,
  thickness: number,
  hasGrain: boolean,
  kerf: number = 4.5,
  trim: number = 10
): any {
  const thick = thickness || 18;
  // User says trim is global sum (e.g. 10mm = 5mm per side), so we subtract it once from total dimensions
  const usableW = panelWidth - trim;
  const usableH = panelHeight - trim;
  const totalArea = panelWidth * panelHeight;

  const pool: InternalPart[] = parts.flatMap(p => 
    Array.from({ length: p.quantity }, (_, i) => ({
      ...p,
      id: `${p.name}-${i}`,
      placed: false
    }))
  );

  // [ ] Refinar Scoring v45.0 (Bonos de Rotación y Penalización de Fideos) [x]
  // [x] Validar eficienca Panel 1 >= 92%
  // [x] Validar eficiencia Panel 2 >= 72%
  // [x] Entrega final del motor optimizado
  const colors = generateColors(parts);
  const panels: OptimizedPanel[] = [];
  let panelNum = 1;

  while (pool.some(p => !p.placed)) {
    const remainingCount = pool.filter(p => !p.placed).length;
    let bestAttempt: OptimizedPanel | null = null;
    let bestScore = -Infinity;

    for (const strategy of ['horizontal', 'vertical'] as const) {
      const currentPieces = stableSortParts(pool.filter(p => !p.placed), { strategy } as any).map(p => ({ ...p }));
      const attempt = fillSinglePanel(currentPieces, usableW, usableH, kerf, trim, panelWidth, panelHeight, colors, strategy, panelNum, hasGrain);
      
      const fitsAllRemaining = attempt.parts.filter(p => !p.isLeftover).length === remainingCount;
      const score = evaluatePanelQuality(attempt, fitsAllRemaining);
      
      if (score > bestScore) {
        bestScore = score;
        bestAttempt = attempt;
      }
    }

    if (bestAttempt && bestAttempt.parts.length > 0) {
      const placedIds = new Set(bestAttempt.parts.filter((p: any) => !p.isLeftover).map((p: any) => p.id));
      pool.forEach(p => { if (placedIds.has(p.id)) p.placed = true; });
      panels.push(bestAttempt);
      panelNum++;
    } else {
      break; 
    }
  }

  const usedAreaTotal = panels.reduce((acc, p) => acc + (p.efficiency / 100) * totalArea, 0);
  const totalAreaAllPanels = panels.length * panelWidth * panelHeight;
  const totalEff = totalAreaAllPanels > 0 ? (usedAreaTotal / totalAreaAllPanels) * 100 : 0;

  return { 
    optimizedLayout: panels, 
    totalPanels: panels.length, 
    totalEfficiency: totalEff, 
    summary: {
      wastePercentage: 100 - totalEff,
      totalM2: totalAreaAllPanels / 1000000,
      usedM2: usedAreaTotal / 1000000,
      totalCuts: 0,
      cutLength: 0
    },
    kerf, 
    trim, 
    selectedThickness: thick 
  };
}

export function fillSinglePanel(
  pieces: InternalPart[],
  usableW: number,
  usableH: number,
  kerf: number,
  trimSize: number,
  pW: number,
  pH: number,
  colors: Record<string, string>,
  strategy: 'vertical' | 'horizontal',
  panelNumber: number,
  hasGrain: boolean
): OptimizedPanel {
  const config: EngineConfig = {
    strategy, kerf, trim: trimSize, panelWidth: pW, panelHeight: pH, usableW, usableH, hasGrain,
    features: {
      useStripLock: true,
      useSmartSplit: false,
      penalizeSmallLeftovers: true,
      useContinuityBonus: true,
      useSmartFreeRectOrder: false,
      useGeometricContinuity: false,
      useIndexedSelection: false,
      useBacktracking: true,
      useExplorationNoise: false,
      useTopKSelection: false,
      useMultiStrip: false,
      useLookahead: true,
      useInvalidCache: true,
      maxActiveStrips: 0,
    },
    maxFreeRects: 150,
    minReusableDim: 60,
    eps: 0.5
  };

  let state: EngineState = {
    freeRects: [{ x: 0, y: 0, width: usableW, height: usableH, colX: 0, rowY: 0 } as any],
    activeStrips: [],
    invalidCache: new Set()
  };

  const placedParts: OptimizedPart[] = [];
  const spaceManager = new GuillotineStrategy();
  const leftoversList: FreeRect[] = [];

  while (state.freeRects.length > 0) {
    state.freeRects = orderFreeRects(state.freeRects, config, state);
    const rect = state.freeRects.shift()!;

    if (rect.width < 1 || rect.height < 1) continue;

    const selection = selectBestPiece(pieces, rect, config, state, null);

    if (selection) {
      const { piece, rotated } = selection;
      const w = rotated ? piece.height : piece.width;
      const h = rotated ? piece.width : piece.height;

      placedParts.push({
        id: piece.id,
        name: piece.name,
        x: rect.x,
        y: rect.y,
        width: w,
        height: h,
        isLeftover: false,
        color: colors[piece.name] || '#cccccc',
        rotated
      });
      piece.placed = true;

      const split = spaceManager.split(rect, w, h, config, state);
      state.freeRects.push(...split.rects);
    } else {
      leftoversList.push(rect);
    }
  }

  const usedArea = placedParts.reduce((acc, p) => acc + (p.width * p.height), 0);
  const totalArea = pW * pH;
  const efficiency = (usedArea / totalArea) * 100;

  const leftovers: OptimizedPart[] = leftoversList
    .filter(r => r.width >= 60 && r.height >= 60)
    .map((r, i) => ({
      id: `L-${panelNumber}-${i}`,
      name: 'Sobrante',
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      isLeftover: true,
      color: '#f0f0f0',
      rotated: false
    }));

  const leftoverArea = leftovers.reduce((acc, l) => acc + (l.width * l.height), 0);

  const stats = {
    totalAreaM2: totalArea / 1000000,
    usedAreaM2: usedArea / 1000000,
    wasteAreaM2: (totalArea - usedArea - leftoverArea) / 1000000,
    leftoverAreaM2: leftoverArea / 1000000,
    wastePercentage: ((totalArea - usedArea - leftoverArea) / totalArea) * 100,
    displacements: placedParts.length * 2,
    linearMeters: (usedArea / 1000)
  };

  return { 
    panelNumber, 
    width: pW, 
    height: pH, 
    efficiency, 
    usedArea,
    totalArea,
    parts: [...placedParts, ...leftovers], 
    strategy, 
    stats 
  };
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsl(${(i * 137.5) % 360}, 70%, 60%)`;
  });
  return colors;
}
