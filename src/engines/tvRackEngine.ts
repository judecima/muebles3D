import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function tvRackEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  const parts: Part[] = [
    { id: 'base', name: 'Base', width: W, height: T, depth: D, x: 0, y: T / 2, z: 0, type: 'static' },
    { id: 'tapa', name: 'Tapa', width: W, height: T, depth: D, x: 0, y: H - T / 2, z: 0, type: 'static' },
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H - 2 * T, depth: D, x: 0, y: H / 2, z: 0, type: 'static' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H - 2 * T, depth: D, x: W - T, y: H / 2, z: 0, type: 'static' },
    { id: 'division', name: 'Divisor Central', width: T, height: H - 2 * T, depth: D * 0.9, x: W / 2 - T / 2, y: H / 2, z: 0, type: 'static' },
    { id: 'cajon-1', name: 'Frente Cajón 1', width: W / 2 - 1.5 * T, height: H - 3 * T, depth: T, x: T + 2, y: H / 2, z: D / 2 + T / 2, type: 'drawer' },
    { id: 'estante', name: 'Estante Abierto', width: W / 2 - 1.5 * T, height: T, depth: D * 0.9, x: W / 2 + T / 2 + 2, y: H / 2, z: 0, type: 'static' },
  ];
  return { parts, summary: 'Rack de TV con cajón y estantes abiertos.' };
}