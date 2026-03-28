import { FreeRect, EngineConfig, EngineState } from '../types/engine';

export interface SplitResult {
  rects: FreeRect[];
  closeStrip: boolean;
}

export interface SpaceStrategy {
  split(rect: FreeRect, pieceW: number, pieceH: number, config: EngineConfig, state: EngineState): SplitResult;
}

export class GuillotineStrategy implements SpaceStrategy {
  split(rect: FreeRect, pieceW: number, pieceH: number, config: EngineConfig, state: EngineState): SplitResult {
    const remW = rect.width - pieceW - config.kerf;
    const remH = rect.height - pieceH - config.kerf;

    if (remW > 0 && remW < 1 && remH > 0 && remH < 1) {
      return { rects: [], closeStrip: true };
    }

    return this.calculateSmartSplit(rect, pieceW, pieceH, remW, remH, config);
  }

  private calculateSmartSplit(rect: FreeRect, pW: number, pH: number, remW: number, remH: number, config: EngineConfig): SplitResult {
    const k = config.kerf;
    const result: FreeRect[] = [];
    
    // GAP ABSORPTION: Si queda un hueco inútil (<60mm), lo "absorbemos" para no limitar la tira.
    const effectivePH = (remH > 0 && remH < config.minReusableDim) ? rect.height : pH;
    const effectivePW = (remW > 0 && remW < config.minReusableDim) ? rect.width : pW;

    const usableW = config.usableW || (config.panelWidth - config.trim);
    const usableH = config.usableH || (config.panelHeight - config.trim);

    const isLevel0 = config.strategy === 'horizontal' 
      ? rect.width >= usableW - 5 
      : rect.height >= usableH - 5;

    const useHorizontalSplit = (config.strategy === 'horizontal' && isLevel0) || (config.strategy === 'vertical' && !isLevel0);

    const parentColX = (rect as any).colX ?? rect.x;
    const parentRowY = (rect as any).rowY ?? rect.y;

    if (useHorizontalSplit) {
      if (rect.width - pW > 0) {
          const newColX = config.strategy === 'horizontal' ? (rect.x + pW + k) : parentColX;
          const newRowY = parentRowY;
          result.push({ x: rect.x + pW + k, y: rect.y, width: rect.width - pW - k, height: pH, colX: newColX, rowY: newRowY } as any);
      }
      if (rect.height - effectivePH > 0) {
          const newColX = parentColX;
          const newRowY = config.strategy === 'horizontal' ? (rect.y + effectivePH + k) : parentRowY;
          result.push({ x: rect.x, y: rect.y + effectivePH + k, width: rect.width, height: rect.height - effectivePH - k, colX: newColX, rowY: newRowY } as any);
      }
    } else {
      if (rect.width - effectivePW > 0) {
          const newColX = config.strategy === 'vertical' ? (rect.x + effectivePW + k) : parentColX;
          const newRowY = parentRowY;
          result.push({ x: rect.x + effectivePW + k, y: rect.y, width: rect.width - effectivePW - k, height: rect.height, colX: newColX, rowY: newRowY } as any);
      }
      if (rect.height - pH > 0) {
          const newColX = parentColX;
          const newRowY = config.strategy === 'horizontal' ? (rect.y + pH + k) : parentRowY;
          result.push({ x: rect.x, y: rect.y + pH + k, width: pW, height: rect.height - pH - k, colX: newColX, rowY: newRowY } as any);
      }
    }

    return { rects: result, closeStrip: false };
  }
}
