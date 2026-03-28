import { OptimizedPart, GrainDirection } from '../../../../lib/types';

export interface FreeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StripLight {
  strategy: 'horizontal' | 'vertical';
  lockedDim: number; // Alto de fila (horizontal) o Ancho de columna (vertical)
  startX: number;
  startY: number;
  remainingLength: number;
}

export interface FeatureFlags {
  useStripLock: boolean;
  useSmartSplit: boolean;
  penalizeSmallLeftovers: boolean;
  useContinuityBonus: boolean;
  useSmartFreeRectOrder: boolean;
  useGeometricContinuity: boolean;
  useIndexedSelection: boolean;
  useBacktracking: boolean;
  useExplorationNoise: boolean;
  useTopKSelection: boolean;
  useMultiStrip: boolean;
  useLookahead: boolean;
  useInvalidCache: boolean;
  maxActiveStrips: number;
  maxFreeRects?: number;
  minReusableDim?: number;
  eps?: number;
  seed?: number;
  debug?: boolean;
}

export interface EngineConfig {
  strategy: 'horizontal' | 'vertical';
  kerf: number;
  trim: number;
  panelWidth: number;
  panelHeight: number;
  usableW: number;
  usableH: number;
  hasGrain: boolean;
  features: FeatureFlags;
  maxFreeRects: number;
  minReusableDim: number;
  eps: number;
  seed?: number;
  debug?: boolean;
}

export interface EngineState {
  freeRects: FreeRect[];
  activeStrips: StripLight[];
  closedStrips?: FreeRect[];
  placedParts?: OptimizedPart[];
  stats?: any;
  invalidCache?: Set<string>;
}

export interface IndexedPieces {
  byHeight: Map<number, InternalPart[]>;
  byWidth: Map<number, InternalPart[]>;
}

export interface InternalPart {
  id: string;
  name: string;
  width: number;
  height: number;
  thickness: number;
  quantity: number;
  grainDirection: GrainDirection;
  placed?: boolean;
}
