import { FreeRect, StripLight, EngineConfig, EngineState, InternalPart } from '../types/engine';

export function approxEqual(a: number, b: number, eps: number): boolean {
  return Math.abs(a - b) <= eps;
}

export function stableSortParts(parts: InternalPart[]): InternalPart[] {
  return [...parts].sort((a, b) => {
    if (a.width !== b.width) return b.width - a.width;
    if (a.height !== b.height) return b.height - a.height;
    return (a.originalIndex ?? 0) - (b.originalIndex ?? 0);
  });
}

export function orderFreeRects(rects: FreeRect[], config: EngineConfig, state: EngineState): FreeRect[] {
  if (!config.features.useSmartFreeRectOrder) return rects;

  return [...rects].sort((a, b) => {
    if (state.activeStrips.length > 0 && config.features.useGeometricContinuity) {
      const matchesA = state.activeStrips.some(strip => isSameStrip(a, strip, config));
      const matchesB = state.activeStrips.some(strip => isSameStrip(b, strip, config));
      if (matchesA !== matchesB) return matchesA ? -1 : 1;
    }

    if (state.activeStrips.length > 0) {
      let minDistA = Infinity;
      for (const strip of state.activeStrips) {
        const d = config.strategy === 'horizontal' ? Math.abs(a.x - strip.startX) : Math.abs(a.y - strip.startY);
        if (d < minDistA) minDistA = d;
      }
      let minDistB = Infinity;
      for (const strip of state.activeStrips) {
        const d = config.strategy === 'horizontal' ? Math.abs(b.x - strip.startX) : Math.abs(b.y - strip.startY);
        if (d < minDistB) minDistB = d;
      }
      if (minDistA !== minDistB) return minDistA - minDistB;
    }

    const ratioA = Math.max(a.width, a.height) / Math.min(a.width, a.height);
    const ratioB = Math.max(b.width, b.height) / Math.min(b.width, b.height);
    if (ratioA !== ratioB) return ratioA - ratioB;

    return (b.width * b.height) - (a.width * a.height);
  });
}

export function isSameStrip(rect: FreeRect, strip: StripLight, config: EngineConfig): boolean {
  if (strip.strategy === 'horizontal') {
    return Math.abs(rect.y - strip.startY) < 1;
  } else {
    return Math.abs(rect.x - strip.startX) < 1;
  }
}

export function pruneFreeRects(rects: FreeRect[], config: EngineConfig): FreeRect[] {
  let pruned = rects.filter(r => r.width >= config.minReusableDim && r.height >= config.minReusableDim);
  if (pruned.length > config.maxFreeRects) {
    pruned = pruned.slice(0, config.maxFreeRects);
  }
  return pruned;
}

export function log(config: EngineConfig, message: string, data?: any) {
  if (config.debug) {
    console.log(`[ENGINE] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

export function getStateSignature(state: EngineState): string {
  let hash = 0;
  for (const r of state.freeRects) {
    const vals = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    for (const v of vals) {
      hash ^= v + 0x9e3779b9 + (hash << 6) + (hash >> 2);
    }
  }
  for (const strip of state.activeStrips) {
    const v = strip.startX + strip.startY + strip.lockedDim;
    hash ^= v + 0x9e3779b9 + (hash << 6) + (hash >> 2);
  }
  hash ^= state.stats.placements + 0x9e3779b9 + (hash << 6) + (hash >> 2);
  return hash.toString();
}
