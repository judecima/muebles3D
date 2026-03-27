import { GrainDirection, OptimizedPanel, OptimizedPart } from '@/lib/types';

export interface FreeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StripLight {
  strategy: 'horizontal' | 'vertical';
  lockedDim: number;
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
  closedStrips: StripLight[];
  placedParts: OptimizedPart[];
  invalidCache?: Set<string>;
  stats: {
    placements: number;
    stripsCreated: number;
    attemptsWithoutPlacement: number;
    cutLength: number;
    directionChanges: number;
    compactness: number;
  };
}

export interface IndexedPieces {
  byHeight: Map<number, InternalPart[]>;
  byWidth: Map<number, InternalPart[]>;
}

export interface InternalPart {
  name: string;
  width: number;
  height: number;
  grainDirection: GrainDirection;
  thickness: number;
  originalIndex: number;
  placed: boolean;
}
