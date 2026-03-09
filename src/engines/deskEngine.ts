import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function deskEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  const parts: Part[] = [
    { id: 'tapa', name: 'Tapa Escritorio', width: W, height: T, depth: D, x: 0, y: H - T / 2, z: 0, type: 'static' },
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H - T, depth: D, x: 0, y: (H - T) / 2, z: 0, type: 'static' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H - T, depth: D, x: W - T, y: (H - T) / 2, z: 0, type: 'static' },
    // Cajones a los lados o abajo
    { id: 'cajon-1', name: 'Frente Cajón Izq', width: 300, height: 150, depth: T, x: T, y: H - T - 150 / 2, z: D / 2 + T / 2, type: 'drawer' },
    { id: 'cajon-2', name: 'Frente Cajón Der', width: 300, height: 150, depth: T, x: W - T - 300, y: H - T - 150 / 2, z: D / 2 + T / 2, type: 'drawer' },
  ];
  return { parts, summary: 'Escritorio ejecutivo con 2 cajones superiores.' };
}