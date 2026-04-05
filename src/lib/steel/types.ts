export type OpeningType = 'door' | 'window';

export interface SteelOpening {
  id: string;
  type: OpeningType;
  width: number;
  height: number;
  position: number;
  sillHeight?: number;
  status?: 'ok' | 'warning' | 'error';
}

export interface InternalWall {
  id: string;
  parentWallId: string;
  xPosition: number;
  length: number;
  height: number;
  rotation: number;
  x: number;
  z: number;
  openings: SteelOpening[];
  status?: 'ok' | 'warning' | 'error';
}

export interface SteelWall {
  id: string;
  length: number;
  height: number;
  thickness: number;
  x: number;
  z: number;
  rotation: number;
  openings: SteelOpening[];
  studSpacing: 400 | 600;
  status?: 'ok' | 'warning' | 'error';
}

export interface LayerVisibility {
  exteriorPanels: boolean;
  interiorPanels: boolean;
  steelProfiles: boolean;
  horizontalBlocking: boolean;
  lintels: boolean;
  structuralDiagrams: boolean;
  foundation: boolean;
  budget: boolean;
}

export interface SoilProperties {
  type: 'arcilloso' | 'limoso' | 'arenoso' | 'rocoso';
  bearingCapacityKPa: number; 
  frictionKPa: number;
}

export interface PriceConfig {
  steelKg: number;
  concreteM3: number;
  osbSheet: number;
  gypsumSheet: number;
  screwT1: number;
  screwT2: number;
  laborM2: number;
}

export interface FoundationConfig {
  type: 'slab_with_piles';
  slabThickness: number;
  edgeBeamDepth: number;
  pileDepth: number;
  pileDiameter: number;
  soil: SoilProperties;
}

export interface SteelHouseConfig {
  width: number;
  length: number;
  globalWallHeight: number;
  walls: SteelWall[];
  internalWalls: InternalWall[];
  layers: LayerVisibility;
  structuralMode: boolean;
  roof?: {
    type: 'flat' | 'one_slope' | 'two_slope';
    slope: number; // grados
    coveringWeightKpa?: number;
  };
  foundation?: FoundationConfig;
  prices: PriceConfig;
  loads: {
    roofDeadKpa: number;
    roofLiveKpa: number;
    snowKpa: number;
    windKpa: number;
    floorDeadKpa: number;
    floorLiveKpa: number;
  };
  xRayMode?: boolean;
  explosionFactor?: number;
  blueprintMode?: boolean;
}

export interface StructuralAnalysisResult {
  isSafe: boolean;
  stressRatio: number; // 0 a 1+
  f_max: number; // deflexión real cm
  limit: number; // límite admisible cm
  description: string;
  loadKg: number; // carga total en el elemento
  webCrippling?: {
    isSafe: boolean;
    capacity: number;
    ratio: number;
    requiresStiffener?: boolean;
  };
  deflectionPoints?: { x: number; y: number }[];
  maxMoment?: number;
  maxShear?: number;
  recommendation?: string;
}

export interface StabilityResult {
  windForceX: number; // kN
  windForceZ: number; // kN
  shearWallsX: { id: string, length: number, shearLoad: number, capacity: number }[];
  shearWallsZ: { id: string, length: number, shearLoad: number, capacity: number }[];
}

export interface MaterialItem {
  name: string;
  category: 'perfileria' | 'paneles' | 'fijaciones' | 'aislacion' | 'otros';
  unit: string;
  quantity: number;
  description: string;
}

export interface MaterialEstimate {
  items: MaterialItem[];
  totalSteelWeightKg: number;
}

export interface FastenerPoint {
  x: number;
  y: number;
  type: 'T1' | 'T3';
  label: string;
}

export interface PanelLoads {
  verticalLoadN: number;
  shearForceN: number;
  overturningMomentNm: number;
}

export interface WallPanelData {
  id: string;
  index: number;
  xStart: number;
  xEnd: number;
  width: number;
  isWallStart: boolean;
  isWallEnd: boolean;
  needsBracing: boolean;
  loads: PanelLoads;
  reinforcementFactor?: number;
  fasteners: FastenerPoint[];
}

export interface HeaderAnalysis {
  type: 'single' | 'double' | 'triple' | 'tube' | 'truss';
  loadNmm: number;
  deflectionMm: number;
  maxAllowableDeflection: number;
  requiredIx: number;
  status: 'ok' | 'warning' | 'error';
  isFusedWithCorner: 'none' | 'left' | 'right';
  actualHeight: number;
  trussData?: {
    height: number;
    numDiagonals: number;
    chordThickness: number;
    panelWidth: number;
    diagonalAngle: number;
  };
  supportsRequired?: number;
  kings?: number;
  jacks?: number;
}