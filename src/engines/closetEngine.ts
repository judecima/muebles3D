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
    { id: 'fondo', name: 'Fondo Mueble', width: W - T, height: H - T, depth: 3, x: W/2, y: H/2, z: -D/2 + 1.5, type: 'static' },
    
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
  ];

  // Generar 2 cajones inferiores
  const drawerH = (H * 0.3 - T) / 2 - 4;
  const drawerD = D * 0.8;
  const drawerW = W - 2*T - 10;

  for (let i = 0; i < 2; i++) {
    const posY = T + (H * 0.3) * (i === 0 ? 0.25 : 0.75);
    const prefix = `cajon-${i+1}`;
    
    // Frente
    parts.push({ id: `${prefix}-frente`, name: `Frente Cajón ${i+1}`, width: drawerW, height: drawerH, depth: T, x: W/2, y: posY, z: D/2 + T/2, type: 'drawer' });
    // Laterales del cajón
    parts.push({ id: `${prefix}-lat-izq`, name: `Lat. Izq. Cajón ${i+1}`, width: T, height: drawerH * 0.7, depth: drawerD, x: W/2 - drawerW/2 + T/2 + 5, y: posY, z: D/2 - drawerD/2, type: 'drawer' });
    parts.push({ id: `${prefix}-lat-der`, name: `Lat. Der. Cajón ${i+1}`, width: T, height: drawerH * 0.7, depth: drawerD, x: W/2 + drawerW/2 - T/2 - 5, y: posY, z: D/2 - drawerD/2, type: 'drawer' });
    // Fondo del cajón (contrafrente)
    parts.push({ id: `${prefix}-fondo`, name: `Contrafrente Cajón ${i+1}`, width: drawerW - 2*T - 10, height: drawerH * 0.7, depth: T, x: W/2, y: posY, z: D/2 - drawerD + T/2, type: 'drawer' });
    // Piso del cajón
    parts.push({ id: `${prefix}-piso`, name: `Piso Cajón ${i+1}`, width: drawerW - 2*T - 10, height: 3, depth: drawerD - T, x: W/2, y: posY - (drawerH * 0.7)/2 + 1.5, z: D/2 - drawerD/2 + T/2, type: 'drawer' });
  }

  return { parts, summary: 'Placard estándar con puertas y cajones estructuralmente completos.' };
}
