// src/server/steel/drawings/panelTypes.ts

export type DrawingMemberType =
  | 'stud'
  | 'track'
  | 'header'
  | 'truss_top_chord'
  | 'truss_bottom_chord'
  | 'truss_web'
  | 'cripple'
  | 'jack'
  | 'king';

export interface PanelPoint2D {
  x: number; // mm (Local u coordinate)
  y: number; // mm (Local v coordinate / height)
}

export interface PanelMemberDrawing {
  id: string;
  label: string;
  wallId: string;
  memberType: DrawingMemberType;
  profileId: string;
  start: PanelPoint2D;
  end: PanelPoint2D;
  lengthMm: number;
  status?: 'SAFE' | 'WARNING' | 'FAIL';
  utilization?: number;
  axialN?: number;
  shearY_N?: number;
  momentZ_Nmm?: number;
  message?: string;
}

export interface PanelOpeningDrawing {
  id: string;
  type: string;
  x: number; // mm local panel coordinates
  y: number; // mm local panel coordinates
  width: number; // mm
  height: number; // mm
  sillHeight?: number; // mm
}

export interface PanelBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface PanelDrawing {
  wallId: string;
  panelLabel: string;
  widthMm: number;
  heightMm: number;
  bounds: PanelBounds;
  members: PanelMemberDrawing[];
  openings: PanelOpeningDrawing[];
  warnings: string[];
}
