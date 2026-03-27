import { FreeRect, EngineConfig, EngineState } from '../types/engine';
import { approxEqual, log } from '../utils';
import { GuillotineStrategy } from '../space/guillotine';

const STRICT_EPS_FACTOR = 0.5;

export function scorePlacement(
  pieceW: number,
  pieceH: number,
  rect: FreeRect,
  config: EngineConfig,
  state: EngineState
): number {
  let score = pieceW * pieceH;

  // Bonus por llenar tira
  if (config.strategy === 'horizontal') {
    if (approxEqual(pieceH, rect.height, config.eps)) score += 120_000;
  } else {
    if (approxEqual(pieceW, rect.width, config.eps)) score += 120_000;
  }

  // Bonus por cerrar completamente el rectángulo en un eje
  if (Math.abs(rect.width - pieceW) < 1) score += 150_000;
  if (Math.abs(rect.height - pieceH) < 1) score += 150_000;

  // Continuidad con strips activos (matching estricto)
  let bestMatch = false;
  if (config.features.useContinuityBonus && state.activeStrips.length > 0) {
    for (const strip of state.activeStrips) {
      const matches = config.strategy === 'horizontal'
        ? approxEqual(pieceH, strip.lockedDim, config.eps * STRICT_EPS_FACTOR)
        : approxEqual(pieceW, strip.lockedDim, config.eps * STRICT_EPS_FACTOR);
      if (matches) {
        bestMatch = true;
        break;
      }
    }
    if (bestMatch) {
      score += 200_000;
    } else {
      const starvationPenalty = 100_000 + (state.activeStrips.length * 30_000);
      score -= starvationPenalty;
    }
  }

  // Penalización por sobrantes pequeños inmediatos
  if (config.features.penalizeSmallLeftovers) {
    const remW = rect.width - pieceW - config.kerf;
    const remH = rect.height - pieceH - config.kerf;

    if (remW > 0 && remW < config.minReusableDim && remH > 0 && remH < config.minReusableDim) {
      score -= 200_000;
    }
    if (remW > 0 && remH > 0) {
      const ratio = Math.max(remW, remH) / Math.min(remW, remH);
      if (ratio > 8) score -= 100_000;
    }
    if (remW > 0 && remW < config.minReusableDim) score -= 80_000;
    if (remH > 0 && remH < config.minReusableDim) score -= 80_000;
    if (remW > 0 && remH > 0) {
      const ratio = Math.max(remW, remH) / Math.min(remW, remH);
      if (ratio > 6) score -= 50_000;
    }
  }

  // Penalización por fragmentación acumulada (Suavizada de 14000 a 8000)
  if (config.features.penalizeSmallLeftovers) {
    let accumulatedPenalty = 0;
    const panelArea = config.panelWidth * config.panelHeight;
    for (const r of state.freeRects) {
      const minDim = Math.min(r.width, r.height);
      if (minDim > 0) {
        const ratio = Math.max(r.width, r.height) / minDim;
        if (ratio > 6) {
          const area = r.width * r.height;
          const normalizedArea = area / panelArea;
          const excess = ratio - 6;
          const softExcess = Math.sqrt(excess);
          accumulatedPenalty += Math.min(5000, softExcess * normalizedArea * 8000);
        }
      }
    }
    score -= accumulatedPenalty;
  }

  // Penalización por muchos rectángulos libres (Suavizada de 200 a 50)
  score -= Math.min(5000, state.freeRects.length * 50);

  // Ruido exploratorio
  if (config.features.useExplorationNoise && config.seed !== undefined) {
    const seed = config.seed * (state.stats.placements + 1);
    const noise = 1 + (Math.sin(seed) * 0.03);
    score *= noise;
  }

  return score;
}

export function scoreWithLookahead(
  pieceW: number,
  pieceH: number,
  rect: FreeRect,
  config: EngineConfig,
  state: EngineState
): number {
  const immediateScore = scorePlacement(pieceW, pieceH, rect, config, state);
  if (!config.features.useLookahead) return immediateScore;

  const strategy = new GuillotineStrategy();
  const { rects: newRects } = strategy.split(rect, pieceW, pieceH, config, state);

  let futureArea = 0;
  let smallPenalty = 0;
  for (const r of newRects) {
    if (r.width >= config.minReusableDim && r.height >= config.minReusableDim) {
      futureArea += r.width * r.height;
      const ratio = Math.max(r.width, r.height) / Math.min(r.width, r.height);
      if (ratio > 6) smallPenalty += 30_000;
    } else {
      smallPenalty += 50_000;
    }
  }

  const futureScore = (futureArea - smallPenalty) * 0.35;
  return immediateScore + futureScore;
}

export function evaluatePanelQuality(panel: any): number {
  let score = panel.efficiency * 1000;
  score -= (panel.stats?.displacements ?? 0) * 10;
  score -= (panel.leftovers?.length ?? 0) * 500;
  const reusable = panel.leftovers?.filter((l: any) => Math.min(l.width, l.height) >= 150) ?? [];
  score += reusable.length * 300;
  return score;
}
