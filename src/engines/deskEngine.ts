import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function deskEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  
  // Limitar altura máxima
  const effectiveH = Math.min(H, 1000);

  const parts: Part[] = [
    { id: 'tapa', name: 'Tapa Escritorio', width: W, height: T, depth: D, x: W/2, y: effectiveH - T/2, z: 0, type: 'static' },
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: effectiveH - T, depth: D, x: T/2, y: (effectiveH - T)/2, z: 0, type: 'static' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: effectiveH - T, depth: D, x: W - T/2, y: (effectiveH - T)/2, z: 0, type: 'static' },
    { id: 'trasero', name: 'Panel Trasero', width: W - 2*T, height: effectiveH * 0.4, depth: T, x: W/2, y: effectiveH - T - (effectiveH * 0.4)/2, z: -D/4, type: 'static' },
    
    // Cajones debajo de la tapa
    { id: 'cajon-1', name: 'Frente Cajón Izquierdo', width: (W - 2*T)/2 - 5, height: 120, depth: T, x: T + (W-2*T)/4, y: effectiveH - T - 60, z: D/2 - D/8, type: 'drawer' },
    { id: 'cajon-2', name: 'Frente Cajón Derecho', width: (W - 2*T)/2 - 5, height: 120, depth: T, x: W - T - (W-2*T)/4, y: effectiveH - T - 60, z: D/2 - D/8, type: 'drawer' },
  ];

  return { parts, summary: `Escritorio ejecutivo. Altura ajustada a ${effectiveH}mm.` };
}
