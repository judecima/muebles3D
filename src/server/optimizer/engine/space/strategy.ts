import { FreeRect, EngineConfig, EngineState } from '../types/engine';

export interface SplitResult {
  rects: FreeRect[];
  closeStrip: boolean;
}

export interface SpaceStrategy {
  split(rect: FreeRect, pieceW: number, pieceH: number, config: EngineConfig, state: EngineState): SplitResult;
}
