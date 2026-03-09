import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function tvRackEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;

  const parts: Part[] = [
    { id: 'base', name: 'Base Principal', width: W, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static' },
    { id: 'tapa', name: 'Tapa Superior', width: W, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static' },
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H - 2*T, depth: D, x: T/2, y: H/2, z: 0, type: 'static' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H - 2*T, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static' },
    { id: 'divisor', name: 'Divisor Central', width: T, height: H - 2*T, depth: D * 0.9, x: W/2, y: H/2, z: 0, type: 'static' },
    
    // Dos cajones inferiores
    { id: 'cajon-1', name: 'Frente Cajón 1', width: (W - 3*T)/2 - 4, height: H - 2*T - 10, depth: T, x: T + (W-3*T)/4 + 2, y: H/2, z: D/2 + T/2, type: 'drawer' },
    { id: 'cajon-2', name: 'Frente Cajón 2', width: (W - 3*T)/2 - 4, height: H - 2*T - 10, depth: T, x: W - T - (W-3*T)/4 - 2, y: H/2, z: D/2 + T/2, type: 'drawer' },
  ];

  return { parts, summary: 'Rack para TV minimalista con dos amplios cajones.' };
}
