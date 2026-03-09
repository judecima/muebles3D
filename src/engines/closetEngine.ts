import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function closetEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  
  const parts: Part[] = [
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: T/2, y: H/2, z: 0, type: 'static' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static' },
    { id: 'tapa', name: 'Tapa Superior', width: W - 2*T, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static' },
    { id: 'base', name: 'Base Inferior', width: W - 2*T, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static' },
    { id: 'fondo', name: 'Fondo Mueble', width: W - T, height: H - T, depth: 3, x: W/2, y: H/2, z: -D/2 + 1.5, type: 'static' },
    
    // Puertas
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
    // Herrajes de Puertas
    { id: 'bisagra-p1', name: 'Bisagra Cazoleta (Puerta Izq)', width: 0, height: 0, depth: 0, x: 0, y: 0, z: 0, type: 'hardware', isHardware: true },
    { id: 'bisagra-p1b', name: 'Bisagra Cazoleta (Puerta Izq)', width: 0, height: 0, depth: 0, x: 0, y: 0, z: 0, type: 'hardware', isHardware: true },
    { id: 'bisagra-p2', name: 'Bisagra Cazoleta (Puerta Der)', width: 0, height: 0, depth: 0, x: 0, y: 0, z: 0, type: 'hardware', isHardware: true },
    { id: 'bisagra-p2b', name: 'Bisagra Cazoleta (Puerta Der)', width: 0, height: 0, depth: 0, x: 0, y: 0, z: 0, type: 'hardware', isHardware: true },
  ];

  // Cajones (Tolerancia herraje: 13mm por lado = 26mm total descuento ancho)
  const slideClearance = 26;
  const drawerH = (H * 0.3 - T) / 2 - 4;
  const drawerD = D * 0.8;
  const drawerBoxW = W - 2*T - slideClearance; // Ancho de la caja interna
  const frontW = W - 2*T - 4; // El frente es más ancho para tapar huecos

  for (let i = 0; i < 2; i++) {
    const posY = T + (H * 0.3) * (i === 0 ? 0.25 : 0.75);
    const prefix = `cajon-${i+1}`;
    
    parts.push({ id: `${prefix}-frente`, name: `Frente Cajón ${i+1}`, width: frontW, height: drawerH, depth: T, x: W/2, y: posY, z: D/2 + T/2, type: 'drawer' });
    parts.push({ id: `${prefix}-lat-izq`, name: `Lat. Izq. Cajón ${i+1}`, width: T, height: drawerH * 0.7, depth: drawerD, x: W/2 - drawerBoxW/2 + T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer' });
    parts.push({ id: `${prefix}-lat-der`, name: `Lat. Der. Cajón ${i+1}`, width: T, height: drawerH * 0.7, depth: drawerD, x: W/2 + drawerBoxW/2 - T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer' });
    parts.push({ id: `${prefix}-fondo`, name: `Contrafrente Cajón ${i+1}`, width: drawerBoxW - 2*T, height: drawerH * 0.7, depth: T, x: W/2, y: posY, z: D/2 - drawerD + T/2, type: 'drawer' });
    parts.push({ id: `${prefix}-piso`, name: `Piso Cajón ${i+1}`, width: drawerBoxW - 2*T, height: 3, depth: drawerD - T, x: W/2, y: posY - (drawerH * 0.7)/2 + 1.5, z: D/2 - drawerD/2 + T/2, type: 'drawer' });
    
    // Guías del cajón
    parts.push({ id: `${prefix}-guia`, name: 'Juego Guías Telescópicas', width: 0, height: 0, depth: drawerD, x: 0, y: 0, z: 0, type: 'hardware', isHardware: true });
  }

  return { parts, summary: 'Placard con tolerancias aplicadas para guías telescópicas y apertura realista.' };
}
