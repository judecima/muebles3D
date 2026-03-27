import { InternalPart as InternalPartType, OptimizedPanel, OptimizedPart, PanelStats } from '@/lib/types';
import { EngineConfig, EngineState, IndexedPieces, FeatureFlags, InternalPart } from '../types/engine';
import { stableSortParts, orderFreeRects, pruneFreeRects, log, getStateSignature, approxEqual } from '../utils';
import { evaluatePanelQuality } from '../scoring';
import { createSpaceStrategy } from '../space';
import { selectBestPiece, removeFromIndex } from '../selection';

function hasFutureMatch(
  piece: InternalPart,
  config: EngineConfig,
  indexed: IndexedPieces,
  rectDimension: number,
  pieceDimension: number
): boolean {
  const remaining = rectDimension - pieceDimension - config.kerf;
  if (remaining <= 0) return false;

  const target = config.strategy === 'horizontal' ? piece.height : piece.width;
  const candidates = config.strategy === 'horizontal'
    ? indexed.byHeight.get(target) || []
    : indexed.byWidth.get(target) || [];

  return candidates.some(p =>
    !p.placed &&
    p !== piece &&
    (
      config.strategy === 'horizontal'
        ? p.width + config.kerf <= remaining
        : p.height + config.kerf <= remaining
    )
  );
}

export function fillSinglePanel(
  pieces: InternalPart[],
  usableW: number,
  usableH: number,
  kerf: number,
  trim: number,
  panelWidth: number,
  panelHeight: number,
  colors: Record<string, string>,
  strategy: 'horizontal' | 'vertical',
  panelNumber: number,
  hasGrain: boolean,
  features: Partial<FeatureFlags> = {}
): OptimizedPanel {
  const config: EngineConfig = {
    strategy,
    kerf,
    trim,
    panelWidth,
    panelHeight,
    usableW,
    usableH,
    hasGrain,
    features: {
      useStripLock: features.useStripLock ?? true,
      useSmartSplit: features.useSmartSplit ?? true,
      penalizeSmallLeftovers: features.penalizeSmallLeftovers ?? true,
      useContinuityBonus: features.useContinuityBonus ?? true,
      useSmartFreeRectOrder: features.useSmartFreeRectOrder ?? true,
      useGeometricContinuity: features.useGeometricContinuity ?? true,
      useIndexedSelection: features.useIndexedSelection ?? true,
      useBacktracking: features.useBacktracking ?? true,
      useExplorationNoise: features.useExplorationNoise ?? false,
      useTopKSelection: features.useTopKSelection ?? false,
      useMultiStrip: features.useMultiStrip ?? true,
      useLookahead: features.useLookahead ?? true,
      useInvalidCache: features.useInvalidCache ?? true,
      maxActiveStrips: features.maxActiveStrips ?? 2,
    },
    maxFreeRects: features.maxFreeRects ?? 100,
    minReusableDim: features.minReusableDim ?? 80,
    eps: features.eps ?? 1,
    seed: features.seed,
    debug: features.debug ?? false,
  };

  const state: EngineState = {
    freeRects: [{ x: trim, y: trim, width: usableW, height: usableH }],
    activeStrips: [],
    closedStrips: [],
    placedParts: [],
    invalidCache: config.features.useInvalidCache ? new Set() : undefined,
    stats: {
      placements: 0,
      stripsCreated: 0,
      attemptsWithoutPlacement: 0,
      cutLength: 0,
      directionChanges: 0,
      compactness: 0,
    },
  };

  const indexed: IndexedPieces = {
    byHeight: new Map(),
    byWidth: new Map(),
  };
  pieces.forEach(p => {
    if (p.placed) return;
    if (!indexed.byHeight.has(p.height)) indexed.byHeight.set(p.height, []);
    indexed.byHeight.get(p.height)!.push(p);
    if (!indexed.byWidth.has(p.width)) indexed.byWidth.set(p.width, []);
    indexed.byWidth.get(p.width)!.push(p);
  });

  const spaceStrategy = createSpaceStrategy(config);
  let safety = 0;
  let placedSomething = false;
  let lastSignature = '';
  let stagnationCount = 0;

  while (state.freeRects.length > 0 && safety++ < 5000) {
    const signature = getStateSignature(state);
    if (signature === lastSignature) {
      stagnationCount++;
    } else {
      stagnationCount = 0;
      lastSignature = signature;
    }
    if (stagnationCount > Math.max(25, state.freeRects.length)) break;

    state.freeRects = orderFreeRects(state.freeRects, config, state);
    const rect = state.freeRects.shift();
    if (!rect) break;

    const selection = selectBestPiece(pieces, rect, config, state, indexed);
    if (selection) {
      placedSomething = true;
      state.stats.attemptsWithoutPlacement = 0;
      const { piece, rotated, w, h } = selection;

      state.placedParts.push({
        name: piece.name,
        x: rect.x,
        y: rect.y,
        width: w,
        height: h,
        rotated,
        color: colors[piece.name],
      });
      piece.placed = true;
      state.stats.placements++;

      if (config.features.useStripLock) {
        let foundStrip = -1;
        for (let i = 0; i < state.activeStrips.length; i++) {
          const strip = state.activeStrips[i];
          const matches = (config.strategy === 'horizontal')
            ? approxEqual(piece.height, strip.lockedDim, config.eps * 0.5)
            : approxEqual(piece.width, strip.lockedDim, config.eps * 0.5);
          if (matches) {
            foundStrip = i;
            break;
          }
        }

        if (foundStrip === -1) {
          const rectDim = config.strategy === 'horizontal' ? rect.width : rect.height;
          const rectOK = (config.strategy === 'horizontal' && rect.width > config.minReusableDim * 2) ||
                         (config.strategy === 'vertical' && rect.height > config.minReusableDim * 2);
          const pieceOK = (config.strategy === 'horizontal' && piece.height > config.minReusableDim) ||
                         (config.strategy === 'vertical' && piece.width > config.minReusableDim);
          const futureOK = hasFutureMatch(piece, config, indexed, rectDim, w);
          const canCreateStrip = rectOK && pieceOK && futureOK;
          
          if ((!config.features.useMultiStrip || state.activeStrips.length < config.features.maxActiveStrips) && canCreateStrip) {
            state.activeStrips.push({
              strategy: config.strategy,
              lockedDim: config.strategy === 'horizontal' ? piece.height : piece.width,
              startX: rect.x,
              startY: rect.y,
              remainingLength: rectDim - w - kerf,
            });
            state.stats.stripsCreated++;
          }
        } else {
          const strip = state.activeStrips[foundStrip];
          strip.remainingLength -= w + kerf;
          if (strip.remainingLength <= 0) {
            state.activeStrips.splice(foundStrip, 1);
            state.closedStrips.push(strip);
          }
        }
      }

      const { rects } = spaceStrategy.split(rect, w, h, config, state);
      state.freeRects.push(...rects);
      state.stats.cutLength += (config.strategy === 'horizontal' ? rect.width : rect.height);
      state.freeRects = pruneFreeRects(state.freeRects, config);
      removeFromIndex(indexed, piece);
    } else {
      state.stats.attemptsWithoutPlacement++;
      if (state.stats.attemptsWithoutPlacement > 50) {
        if (state.activeStrips.length > 0) {
          state.activeStrips = [];
          state.stats.attemptsWithoutPlacement = 0;
        } else break;
      }
    }
  }

  if (!placedSomething) {
    return {
      panelNumber,
      parts: [],
      efficiency: 0,
      usedArea: 0,
      totalArea: panelWidth * panelHeight,
      leftovers: [],
      strategy,
      stats: {
        totalAreaM2: (panelWidth * panelHeight) / 1000000,
        usedAreaM2: 0,
        leftoverAreaM2: 0,
        wasteAreaM2: (panelWidth * panelHeight) / 1000000,
        wastePercentage: 100,
        displacements: 0,
        linearMeters: (panelWidth * 2 + panelHeight * 2) / 1000,
      },
    };
  }

  const usedArea = state.placedParts.reduce((acc, p) => acc + p.width * p.height, 0);
  const totalArea = panelWidth * panelHeight;
  const leftovers = state.freeRects
    .filter(r => r.width >= config.minReusableDim && r.height >= config.minReusableDim)
    .map((r, idx) => ({
      name: `S${idx + 1}`,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      rotated: false,
      isLeftover: true,
    }));

  const leftoverArea = leftovers.reduce((acc, l) => acc + l.width * l.height, 0);
  return {
    panelNumber,
    parts: state.placedParts,
    efficiency: (usedArea / totalArea) * 100,
    usedArea,
    totalArea,
    leftovers,
    strategy,
    stats: {
      totalAreaM2: Number((totalArea / 1000000).toFixed(2)),
      usedAreaM2: Number((usedArea / 1000000).toFixed(2)),
      leftoverAreaM2: Number((leftoverArea / 1000000).toFixed(2)),
      wasteAreaM2: Number(((totalArea - usedArea - leftoverArea) / 1000000).toFixed(2)),
      wastePercentage: Number(((1 - (usedArea / totalArea)) * 100).toFixed(3)),
      displacements: state.stats.stripsCreated * 2 + state.placedParts.length,
      linearMeters: Number(((panelWidth * 2 + panelHeight * 2 + (usedArea / 1000)) / 1000).toFixed(2)),
    },
  };
}

export function runOptimization(
  parts: any[],
  panelWidth: number,
  panelHeight: number,
  selectedThickness: number,
  hasGrain: boolean,
  kerf: number = 4.5,
  trim: number = 10
): any {
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
      placed: false,
    }))
  );
  globalPool = stableSortParts(globalPool);

  const finalPanels: OptimizedPanel[] = [];
  let panelCounter = 1;

  const heights = globalPool.map(p => p.height);
  const widths = globalPool.map(p => p.width);
  const baseStrategy = variance(heights) < variance(widths) ? 'horizontal' : 'vertical';

  while (globalPool.some(p => !p.placed)) {
    let bestPanelForThisStep: OptimizedPanel | null = null;
    let bestScore = -Infinity;

    const strategies: ('horizontal' | 'vertical')[] = [baseStrategy, baseStrategy === 'horizontal' ? 'vertical' : 'horizontal'];

    for (const strategy of strategies) {
      const attempt = fillSinglePanel(
        globalPool.filter(p => !p.placed).map(p => ({ ...p })),
        usableW,
        usableH,
        kerf,
        trim,
        panelWidth,
        panelHeight,
        partColors,
        strategy,
        panelCounter,
        hasGrain
      );

      const currentScore = evaluatePanelQuality(attempt);
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestPanelForThisStep = attempt;
      }
    }

    if (bestPanelForThisStep && bestPanelForThisStep.parts.length > 0) {
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
    } else break;
  }

  const totalUsedArea = finalPanels.reduce((acc, p) => acc + p.usedArea, 0);
  const totalAvailArea = finalPanels.length * panelWidth * panelHeight;

  return {
    optimizedLayout: finalPanels,
    totalPanels: finalPanels.length,
    totalEfficiency: finalPanels.length > 0 ? (totalUsedArea / totalAvailArea) * 100 : 0,
    summary: `Motor v43 industrial - ${finalPanels.length} paneles, eficiencia ${(totalUsedArea / totalAvailArea * 100).toFixed(2)}%`,
    kerf,
    trim,
    selectedThickness,
  };
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsla(${(i * 137.5) % 360}, 70%, 50%, 0.25)`;
  });
  return colors;
}

function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
}
