export type FurnitureType = 
  | 'bajoMesada' 
  | 'rackTV' 
  | 'escritorio' 
  | 'alacena' 
  | 'placard' 
  | 'biblioteca' 
  | 'alacenaFlip' 
  | 'bajomesada-cajonera' 
  | 'porta-anafe'
  | 'cabinet_base_120_2p3c'
  | 'cabinet_base_140_3p3c'
  | 'cabinet_wall_60_1p'
  | 'cabinet_wall_120_3p'
  | 'cabinet_wall_140_3p'
  | 'cabinet_pantry_60_2p'
  | 'cabinet_microwave_60'
  | 'cabinet_hood_60'
  | 'cabinet_base_single_60_1p'
  | 'cabinet_base_double_80_2p'
  | 'cabinet_base_3p'
  | 'cabinet_wall_3p';

export type FurnitureColor = 'blanco' | 'gris_claro' | 'grafito' | 'roble_claro' | 'nogal' | 'negro';
export type GrainDirection = 'vertical' | 'horizontal' | 'libre';

export const COLOR_PALETTE: Record<FurnitureColor, string> = {
  blanco: '#FFFFFF',
  gris_claro: '#D9D9D9',
  grafito: '#3A3A3A',
  roble_claro: '#D2B48C',
  nogal: '#7A5230',
  negro: '#1F1F1F'
};

export interface Part {
  id: string;
  groupId?: string; 
  name: string;
  width: number;  
  height: number; 
  depth: number;  
  x: number;
  y: number;
  z: number;
  type: 'static' | 'door-left' | 'door-right' | 'door-flip' | 'drawer' | 'hardware' | 'piston-body' | 'piston-rod';
  pivot?: { x: number; y: number; z: number };
  isHardware?: boolean;
  
  cutLargo: number;
  cutAncho: number;
  cutEspesor: number;
  grainDirection: GrainDirection;
  hingeCount?: number;
  pistonConfig?: {
    side: 'left' | 'right';
    anchorMueble: { x: number; y: number; z: number };
    anchorPuertaLocal: { x: number; y: number; z: number };
    doorId: string;
    lengthClosed: number;
    lengthOpen: number;
  };
}

export interface FurnitureDimensions {
  width: number;
  height: number;
  depth: number;
  thickness: number;
  hasBack?: boolean; 
  hasShelf?: boolean;
}

export interface FurnitureModel {
  parts: Part[];
  summary: string;
  hasDoors: boolean;
  hasDrawers: boolean;
}

export interface PanelSize {
  id: string;
  width: number;
  height: number;
  name: string;
}

export const AVAILABLE_PANELS: PanelSize[] = [
  { id: 'standard-1', width: 2600, height: 1830, name: '2600 x 1830 mm' },
  { id: 'standard-2', width: 2440, height: 1830, name: '2440 x 1830 mm' },
  { id: 'standard-3', width: 2800, height: 2100, name: '2800 x 2100 mm' },
];

export interface OptimizedPart {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  color?: string;
}

export interface OptimizedPanel {
  panelNumber: number;
  parts: OptimizedPart[];
  efficiency: number;
  usedArea: number;
  totalArea: number;
}

export interface OptimizationResult {
  optimizedLayout: OptimizedPanel[];
  totalPanels: number;
  totalEfficiency: number;
  summary: string;
  kerf: number;
  trim: number;
  selectedThickness: number;
}
