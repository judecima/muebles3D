import { OptimizedPart, GrainDirection } from '../../../../lib/types';

export interface FreeRect {
  x: number;
  y: number;
  width: number;
  height: number;
  colX?: number;
  rowY?: number;
}

export interface EngineDebugEvent {
  type: 'PIECE_SELECT' | 'PANEL_START' | 'PANEL_END' | 'CONTAINER_SELECT' | 'SPLIT' | 'REMNANT_EVAL' | 'PIECE_PLACED' | 'PIECE_BLOCKED' | 'BLOCK_DOWNGRADED_FOR_CONSOLIDATION' | 'NEW_PANEL';
  stage: string;
  message: string;
  seq: number;
  panelNumber?: number;
  rect?: FreeRect;
  pieceId?: string;
  candidates?: any[];
  discards?: any[];
  winner?: any;
  motive?: string;
  metadata?: any;
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
  enableV44BalancedMode?: boolean; // v44.8: Modos Industriales y Confianza Normalizada
  maxActiveStrips: number;
  maxFreeRects?: number;
  minReusableDim?: number;
  minWasteBlockDim?: number; // Fase 2: Umbral de bloqueo de basura
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
  minWasteBlockDim: number; // Fase 2: Umbral de bloqueo de basura
  eps: number;
  seed?: number;
  debug?: boolean;
  panelNumber?: number;
}

export interface EngineState {
  freeRects: FreeRect[];
  activeStrips: StripLight[];
  closedStrips?: FreeRect[];
  placedParts?: OptimizedPart[];
  debugSeq?: number; // Fase 2: Secuencia determinista de eventos
  debugEvents?: EngineDebugEvent[];
  stats?: any;
  invalidCache?: Set<string>;
  poolSize: number;
  remainingArea: number;
  isConsolidationMode: boolean;
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
