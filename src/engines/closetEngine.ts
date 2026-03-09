import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function closetEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  
  const parts: Part[] = [
    // Laterales
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: T/2, y: H/2, z: 0, type: 'static' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static' },
    // Tapa y Base
    { id: 'tapa', name: 'Tapa Superior', width: W - 2*T, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static' },
    { id: 'base', name: 'Base Inferior', width: W - 2*T, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static' },
    // Fondo
    { id: 'fondo', name: 'Fondo', width: W - T, height: H - T, depth: 3, x: W/2, y: H/2, z: -D/2 + 1.5, type: 'static' },
    
    // Puertas (Ocupan el 70% superior)
    { 
      id: 'puerta-izq', name: 'Puerta Izquierda', 
      width: (W - 2*T)/2 - 2, height: H * 0.7, depth: T, 
      x: T + (W - 2*T)/4, y: H - (H * 0.7)/2 - T, z: D/2 + T/2, 
      type: 'door-left', 
      pivot: { x: T, y: H - (H * 0.7)/2 - T, z: D/2 } 
    },
    { 
      id: 'puerta-der', name: 'Puerta Derecha', 
      width: (W - 2*T)/2 - 2, height: H * 0.7, depth: T, 
      x: W - T - (W - 2*T)/4, y: H - (H * 0.7)/2 - T, z: D/2 + T/2, 
      type: 'door-right', 
      pivot: { x: W - T, y: H - (H * 0.7)/2 - T, z: D/2 } 
    },
    
    // Cajones (Ocupan el 30% inferior)
    { id: 'cajon-1', name: 'Frente Cajón 1', width: W - 2*T - 4, height: (H * 0.3 - T)/2 - 4, depth: T, x: W/2, y: T + (H * 0.3)/4, z: D/2 + T/2, type: 'drawer' },
    { id: 'cajon-2', name: 'Frente Cajón 2', width: W - 2*T - 4, height: (H * 0.3 - T)/2 - 4, depth: T, x: W/2, y: T + (H * 0.3)*0.75, z: D/2 + T/2, type: 'drawer' },
  ];

  return { parts, summary: 'Placard estándar con dos puertas superiores y dos cajones inferiores.' };
}
