import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function kitchenBaseEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  const effectiveH = Math.min(H, 1000);

  const parts: Part[] = [
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: effectiveH, depth: D, x: T/2, y: effectiveH/2, z: 0, type: 'static' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: effectiveH, depth: D, x: W - T/2, y: effectiveH/2, z: 0, type: 'static' },
    { id: 'base', name: 'Base Inferior', width: W - 2*T, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static' },
    { id: 'estante', name: 'Estante Central', width: W - 2*T - 2, height: T, depth: D * 0.9, x: W/2, y: effectiveH/2, z: 0, type: 'static' },
    
    // Puertas con pivote externo para evitar colisión con laterales
    { 
      id: 'puerta-izq', name: 'Puerta Izquierda', 
      width: W/2 - 2, height: effectiveH - T - 4, depth: T, 
      x: W/4, y: (effectiveH + T)/2, z: D/2 + T/2, 
      type: 'door-left', 
      pivot: { x: 0, y: (effectiveH + T)/2, z: D/2 } 
    },
    { 
      id: 'puerta-der', name: 'Puerta Derecha', 
      width: W/2 - 2, height: effectiveH - T - 4, depth: T, 
      x: (3*W)/4, y: (effectiveH + T)/2, z: D/2 + T/2, 
      type: 'door-right', 
      pivot: { x: W, y: (effectiveH + T)/2, z: D/2 } 
    },
    // Bisagras (90 grados)
    { id: 'bis-1', name: 'Bisagra Cazoleta 90°', width: 0, height: 0, depth: 0, x: 0, y: 0, z: 0, type: 'hardware', isHardware: true },
    { id: 'bis-2', name: 'Bisagra Cazoleta 90°', width: 0, height: 0, depth: 0, x: 0, y: 0, z: 0, type: 'hardware', isHardware: true },
    { id: 'bis-3', name: 'Bisagra Cazoleta 90°', width: 0, height: 0, depth: 0, x: 0, y: 0, z: 0, type: 'hardware', isHardware: true },
    { id: 'bis-4', name: 'Bisagra Cazoleta 90°', width: 0, height: 0, depth: 0, x: 0, y: 0, z: 0, type: 'hardware', isHardware: true },
  ];

  return { parts, summary: 'Bajo mesada con sistema de apertura externa a 90° y 4 bisagras.' };
}
