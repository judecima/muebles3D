import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function kitchenWallEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  const parts: Part[] = [
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: 0, y: H / 2, z: 0, type: 'static' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T, y: H / 2, z: 0, type: 'static' },
    { id: 'base', name: 'Base Inferior', width: W - 2 * T, height: T, depth: D, x: T, y: T / 2, z: 0, type: 'static' },
    { id: 'tapa', name: 'Tapa Superior', width: W - 2 * T, height: T, depth: D, x: T, y: H - T / 2, z: 0, type: 'static' },
    { id: 'estante', name: 'Estante Central', width: W - 2.2 * T, height: T, depth: D * 0.9, x: T * 1.1, y: H / 2, z: 0, type: 'static' },
    { id: 'puerta-izq', name: 'Puerta Izquierda', width: (W - 2 * T) / 2 - 2, height: H - 4, depth: T, x: T + 1, y: H / 2, z: D / 2 + T / 2, type: 'door-left', pivot: { x: T, y: 0, z: D / 2 } },
    { id: 'puerta-der', name: 'Puerta Derecha', width: (W - 2 * T) / 2 - 2, height: H - 4, depth: T, x: W / 2 + 1, y: H / 2, z: D / 2 + T / 2, type: 'door-right', pivot: { x: W - T, y: 0, z: D / 2 } },
  ];
  return { parts, summary: 'Alacena superior con 2 puertas y estante regulable.' };
}