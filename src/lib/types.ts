export type FurnitureType = 'placard' | 'escritorio' | 'bajoMesada' | 'alacena' | 'rackTV' | 'biblioteca';
export type FurnitureColor = 'alarce-blanco' | 'alarce-marron';

export interface Part {
  id: string;
  name: string;
  width: number;  // Dimensión 3D X
  height: number; // Dimensión 3D Y
  depth: number;  // Dimensión 3D Z
  x: number; // Centro X
  y: number; // Centro Y
  z: number; // Centro Z
  type: 'static' | 'door-left' | 'door-right' | 'drawer' | 'hardware';
  pivot?: { x: number; y: number; z: number }; // Específico para puertas
  isHardware?: boolean;
  
  // Propiedades técnicas para despiece (independientes de la orientación 3D)
  cutLargo: number;
  cutAncho: number;
  cutEspesor: number;
}

export interface FurnitureDimensions {
  width: number;
  height: number;
  depth: number;
  thickness: number;
}

export interface FurnitureModel {
  parts: Part[];
  summary: string;
}
