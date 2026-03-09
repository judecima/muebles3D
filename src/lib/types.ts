export type FurnitureType = 'placard' | 'escritorio' | 'bajoMesada' | 'alacena' | 'rackTV' | 'biblioteca';
export type FurnitureColor = 'blanco' | 'marron' | 'beige';

export interface Part {
  id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  x: number; // Posición centro X relativo al mueble
  y: number; // Posición centro Y relativo al mueble
  z: number; // Posición centro Z relativo al mueble
  type: 'static' | 'door-left' | 'door-right' | 'drawer' | 'hardware';
  pivot?: { x: number; y: number; z: number }; // Solo para puertas
  isHardware?: boolean; // Para identificar herrajes en la tabla
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
