import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function bookshelfEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  const numEstantes = 4;
  const parts: Part[] = [
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: 0, y: H / 2, z: 0, type: 'static' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T, y: H / 2, z: 0, type: 'static' },
    { id: 'tapa', name: 'Tapa Superior', width: W - 2 * T, height: T, depth: D, x: T, y: H - T / 2, z: 0, type: 'static' },
    { id: 'base', name: 'Base Inferior', width: W - 2 * T, height: T, depth: D, x: T, y: T / 2, z: 0, type: 'static' },
  ];

  for (let i = 1; i <= numEstantes; i++) {
    parts.push({
      id: `estante-${i}`,
      name: `Estante ${i}`,
      width: W - 2 * T,
      height: T,
      depth: D * 0.95,
      x: T,
      y: (H / (numEstantes + 1)) * i,
      z: 0,
      type: 'static'
    });
  }

  return { parts, summary: `Biblioteca con ${numEstantes} estantes.` };
}