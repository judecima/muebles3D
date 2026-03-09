import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function bookshelfEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  
  const numShelves = 4;
  const parts: Part[] = [
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'tapa', name: 'Tapa Superior', width: W - 2*T, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static', cutLargo: W - 2*T, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'base', name: 'Base Inferior', width: W - 2*T, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: W - 2*T, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
  ];

  for (let i = 1; i <= numShelves; i++) {
    parts.push({
      id: `estante-${i}`,
      name: `Estante ${i}`,
      width: W - 2*T - 2,
      height: T,
      depth: D * 0.95,
      x: W/2,
      y: (H / (numShelves + 1)) * i,
      z: 0,
      type: 'static',
      cutLargo: W - 2*T - 2,
      cutAncho: D * 0.95,
      cutEspesor: T,
      grainDirection: 'horizontal'
    });
  }

  return { parts, summary: `Biblioteca abierta con ${numShelves} estantes fijos.` };
}
