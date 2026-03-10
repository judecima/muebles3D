export type OpeningType = 'door' | 'window';

export interface SteelOpening {
  id: string;
  type: OpeningType;
  width: number;
  height: number;
  position: number; // Distancia desde el inicio (izq) del muro
  sillHeight?: number; // Altura desde el suelo (para ventanas)
}

export interface SteelWall {
  id: string;
  length: number;
  height: number;
  thickness: number;
  x: number;
  z: number;
  rotation: number; // en grados
  openings: SteelOpening[];
}

export interface SteelHouseConfig {
  globalWallHeight: number;
  walls: SteelWall[];
}
