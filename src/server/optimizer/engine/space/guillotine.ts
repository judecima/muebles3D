import { FreeRect, EngineConfig, EngineState } from '../types/engine';
import { SpaceStrategy, SplitResult } from './strategy';

export class GuillotineStrategy implements SpaceStrategy {
  split(rect: FreeRect, pieceW: number, pieceH: number, config: EngineConfig, state: EngineState): SplitResult {
    const remW = rect.width - pieceW - config.kerf;
    const remH = rect.height - pieceH - config.kerf;

    if (remW > 0 && remW < config.minReusableDim && remH > 0 && remH < config.minReusableDim) {
      return { rects: [], closeStrip: true };
    }

    const result: FreeRect[] = [];

    if (config.strategy === 'vertical') {
      if (remW > 0) result.push({ x: rect.x + pieceW + config.kerf, y: rect.y, width: remW, height: rect.height });
      if (remH > 0) result.push({ x: rect.x, y: rect.y + pieceH + config.kerf, width: pieceW, height: remH });
    } else {
      if (remH > 0) result.push({ x: rect.x, y: rect.y + pieceH + config.kerf, width: rect.width, height: remH });
      if (remW > 0) result.push({ x: rect.x + pieceW + config.kerf, y: rect.y, width: remW, height: pieceH });
    }

    return { rects: result, closeStrip: false };
  }
}
