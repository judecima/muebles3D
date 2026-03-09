export type FurnitureType = 'placard' | 'escritorio' | 'bajoMesada' | 'alacena' | 'rackTV' | 'biblioteca';
export type FurnitureColor = 'blanco' | 'marron' | 'beige';

export interface Part {
  id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  x: number; // Centro X
  y: number; // Centro Y
  z: number; // Centro Z
  type: 'static' | 'door-left' | 'door-right' | 'drawer' | 'hardware';
  pivot?: { x: number; y: number; z: number }; // Específico para puertas
  isHardware?: boolean;
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
