export type FurnitureType = 'placard' | 'escritorio' | 'bajoMesada' | 'alacena' | 'rackTV' | 'biblioteca';

export interface Part {
  id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  z: number;
  type: 'static' | 'door-left' | 'door-right' | 'drawer';
  pivot?: { x: number; y: number; z: number };
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