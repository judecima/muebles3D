export type FurnitureType = 'placard' | 'escritorio' | 'bajoMesada' | 'alacena' | 'rackTV' | 'biblioteca';

export interface Part {
  id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  x: number; // Posición centro X relativo al mueble
  y: number; // Posición centro Y relativo al mueble
  z: number; // Posición centro Z relativo al mueble
  type: 'static' | 'door-left' | 'door-right' | 'drawer';
  pivot?: { x: number; y: number; z: number }; // Solo para puertas
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
