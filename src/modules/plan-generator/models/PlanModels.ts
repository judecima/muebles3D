
export type Point = { x: number; y: number };

export type DrawingElement = 
  | { type: 'line'; p1: Point; p2: Point; stroke: string; strokeWidth: number; dashArray?: string }
  | { type: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke: string; strokeWidth: number }
  | { type: 'text'; x: number; y: number; content: string; fontSize: number; fontWeight?: string; align?: 'left' | 'center' | 'right'; color: string; rotate?: number }
  | { type: 'circle'; x: number; y: number; r: number; fill: string; stroke?: string };

export interface Drawing {
  elements: DrawingElement[];
  width: number;
  height: number;
  scale: number;
  title: string;
}

export interface Sheet {
  id: string;
  sheetNumber: string;
  title: string;
  projectName: string;
  date: string;
  scale: string;
  drawing: Drawing;
}
