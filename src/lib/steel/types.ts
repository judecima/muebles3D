export type OpeningType = 'door' | 'window';

export interface SteelOpening {
  id: string;
  type: OpeningType;
  width: number;
  height: number;
  position: number; 
  sillHeight?: number; 
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
}

export interface LayerVisibility {
  exteriorPanels: boolean;
  interiorPanels: boolean;
  steelProfiles: boolean;
  horizontalBlocking: boolean; // Rigidizadores horizontales
  lintels: boolean;
  reinforcements: boolean;
}

export interface SteelHouseConfig {
  width: number;
  length: number;
  globalWallHeight: number;
  walls: SteelWall[];
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
