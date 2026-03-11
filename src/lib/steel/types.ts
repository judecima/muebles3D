
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
  parentWallId: string; // Puede ser ID de SteelWall o de otra InternalWall
  xPosition: number; // Posición a lo largo del muro padre
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
  reinforcements: boolean;
  bracing: boolean;
}

export interface SteelHouseConfig {
  width: number;
  length: number;
  globalWallHeight: number;
  walls: SteelWall[];
  internalWalls: InternalWall[];
  layers: LayerVisibility;
  structuralMode: boolean;
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

export interface PanelLoads {
  verticalLoadN: number;
  shearForceN: number;
  overturningMomentNm: number;
}

export interface WallPanelData {
  id: string;
  xStart: number;
  xEnd: number;
  width: number;
  isWallStart: boolean;
  isWallEnd: boolean;
  needsBracing: boolean;
  loads: PanelLoads;
}
