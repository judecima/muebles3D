import { FreeRect, StripLight, EngineConfig, EngineState, InternalPart } from '../types/engine';

export function approxEqual(a: number, b: number, eps: number): boolean {
  return Math.abs(a - b) <= eps;
}

export function stableSortParts(parts: InternalPart[], config?: EngineConfig): InternalPart[] {
  return [...parts].sort((a, b) => {
    const canRotA = !config?.hasGrain || a.grainDirection === 'libre';
    const canRotB = !config?.hasGrain || b.grainDirection === 'libre';
    
    if (config) {
      if (config.strategy === 'horizontal') {
        const bestHA = canRotA ? Math.max(a.width, a.height) : a.height;
        const bestHB = canRotB ? Math.max(b.width, b.height) : b.height;
        // Agrupar tolerancias industriales (ej: 562 y 570)
        const diff = Math.abs(bestHA - bestHB);
        if (diff > 15) return bestHB - bestHA;
        return (b.width * b.height) - (a.width * a.height);
      } else if (config.strategy === 'vertical') {
        const bestWA = canRotA ? Math.max(a.width, a.height) : a.width;
        const bestWB = canRotB ? Math.max(b.width, b.height) : b.width;
        const diff = Math.abs(bestWA - bestWB);
        if (diff > 15) return bestWB - bestWA;
        return (b.width * b.height) - (a.width * a.height);
      }
    }
    return (b.width * b.height) - (a.width * a.height);
  });
}

export function orderFreeRects(rects: FreeRect[], config: EngineConfig, state: EngineState): FreeRect[] {
  return [...rects].sort((a, b) => {
    if (config.strategy === 'horizontal') {
      if (Math.abs(a.y - b.y) > 0.5) return a.y - b.y;
      return a.x - b.x;
    } else {
      if (Math.abs(a.x - b.x) > 0.5) return a.x - b.x;
      return a.y - b.y;
    }
  });
}

export function isSameStrip(rect: FreeRect, strip: StripLight, config: EngineConfig): boolean {
  if (strip.strategy === 'horizontal') {
    return Math.abs(rect.y - strip.startY) < 0.5 && approxEqual(rect.height, strip.lockedDim, config.eps);
  } else {
    return Math.abs(rect.x - strip.startX) < 0.5 && approxEqual(rect.width, strip.lockedDim, config.eps);
  }
}

export function log(msg: string) {
  // console.log(msg);
}
