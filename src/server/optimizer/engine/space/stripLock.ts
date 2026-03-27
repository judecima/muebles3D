import { FreeRect, EngineConfig, EngineState, StripLight } from '../types/engine';
import { SpaceStrategy, SplitResult } from './strategy';
import { GuillotineStrategy } from './guillotine';
import { isSameStrip } from '../utils';

export class StripLockStrategy implements SpaceStrategy {
  split(rect: FreeRect, pieceW: number, pieceH: number, config: EngineConfig, state: EngineState): SplitResult {
    let activeStripIndex = -1;
    for (let i = 0; i < state.activeStrips.length; i++) {
      if (isSameStrip(rect, state.activeStrips[i], config)) {
        activeStripIndex = i;
        break;
      }
    }

    if (activeStripIndex === -1) {
      return new GuillotineStrategy().split(rect, pieceW, pieceH, config, state);
    }

    const strip = state.activeStrips[activeStripIndex];
    const remW = rect.width - pieceW - config.kerf;
    const remH = rect.height - pieceH - config.kerf;

    if (remW > 0 && remW < config.minReusableDim && remH > 0 && remH < config.minReusableDim) {
      state.activeStrips.splice(activeStripIndex, 1);
      state.closedStrips.push(strip);
      return { rects: [], closeStrip: true };
    }

    const result: FreeRect[] = [];
    if (strip.strategy === 'horizontal') {
      const rightWidth = rect.width - pieceW - config.kerf;
      if (rightWidth > 0) {
        result.push({ x: rect.x + pieceW + config.kerf, y: rect.y, width: rightWidth, height: rect.height });
      }
      if (strip.remainingLength <= 0) {
        state.activeStrips.splice(activeStripIndex, 1);
        state.closedStrips.push(strip);
        const nextY = rect.y + rect.height + config.kerf;
        if (nextY + strip.lockedDim <= config.usableH) {
          const newStrip: StripLight = {
            strategy: strip.strategy,
            lockedDim: strip.lockedDim,
            startX: config.trim,
            startY: nextY,
            remainingLength: config.usableW,
          };
          state.activeStrips.push(newStrip);
          state.stats.stripsCreated++;
        }
      } else {
        strip.remainingLength -= pieceW + config.kerf;
      }
    } else {
      const bottomHeight = rect.height - pieceH - config.kerf;
      if (bottomHeight > 0) {
        result.push({ x: rect.x, y: rect.y + pieceH + config.kerf, width: rect.width, height: bottomHeight });
      }
      if (strip.remainingLength <= 0) {
        state.activeStrips.splice(activeStripIndex, 1);
        state.closedStrips.push(strip);
        const nextX = rect.x + rect.width + config.kerf;
        if (nextX + strip.lockedDim <= config.usableW) {
          const newStrip: StripLight = {
            strategy: strip.strategy,
            lockedDim: strip.lockedDim,
            startX: nextX,
            startY: config.trim,
            remainingLength: config.usableH,
          };
          state.activeStrips.push(newStrip);
          state.stats.stripsCreated++;
        }
      } else {
        strip.remainingLength -= pieceH + config.kerf;
      }
    }

    const closeStrip = strip.remainingLength <= 0;
    return { rects: result, closeStrip };
  }
}
