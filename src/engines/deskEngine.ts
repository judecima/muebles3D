import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function deskEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  const effectiveH = Math.min(H, 1000);

  const parts: Part[] = [
    { id: 'tapa', name: 'Tapa Escritorio', width: W, height: T, depth: D, x: W/2, y: effectiveH - T/2, z: 0, type: 'static' },
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: effectiveH - T, depth: D, x: T/2, y: (effectiveH - T)/2, z: 0, type: 'static' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: effectiveH - T, depth: D, x: W - T/2, y: (effectiveH - T)/2, z: 0, type: 'static' },
    { id: 'trasero', name: 'Panel Trasero', width: W - 2*T, height: effectiveH * 0.4, depth: T, x: W/2, y: effectiveH - T - (effectiveH * 0.4)/2, z: -D/4, type: 'static' },
  ];

  // Cajones (Descuento herraje: 26mm)
  const slideClearance = 26;
  const drawerW = (W - 2*T) / 3;
  const drawerBoxW = drawerW - slideClearance;
  const drawerH = 150;
  const drawerD = D * 0.7;

  const drawerPositions = [
    { x: T + drawerW/2 + 10, id: 'izq' },
    { x: W - T - drawerW/2 - 10, id: 'der' }
  ];

  drawerPositions.forEach((pos) => {
    const prefix = `cajon-${pos.id}`;
    const posY = effectiveH - T - drawerH/2 - 10;
    const posZ_frente = D/2 - 50;

    // Frente
    parts.push({ id: `${prefix}-frente`, name: `Frente Cajón ${pos.id}`, width: drawerW, height: drawerH, depth: T, x: pos.x, y: posY, z: posZ_frente, type: 'drawer' });
    // Laterales internos
    parts.push({ id: `${prefix}-lat-izq`, name: `Lat. Izq. Cajón ${pos.id}`, width: T, height: drawerH * 0.8, depth: drawerD, x: pos.x - drawerBoxW/2 + T/2, y: posY, z: posZ_frente - drawerD/2, type: 'drawer' });
    parts.push({ id: `${prefix}-lat-der`, name: `Lat. Der. Cajón ${pos.id}`, width: T, height: drawerH * 0.8, depth: drawerD, x: pos.x + drawerBoxW/2 - T/2, y: posY, z: posZ_frente - drawerD/2, type: 'drawer' });
    // Fondo y piso
    parts.push({ id: `${prefix}-fondo`, name: `Contrafrente Cajón ${pos.id}`, width: drawerBoxW - 2*T, height: drawerH * 0.8, depth: T, x: pos.x, y: posY, z: posZ_frente - drawerD + T/2, type: 'drawer' });
    parts.push({ id: `${prefix}-piso`, name: `Piso Cajón ${pos.id}`, width: drawerBoxW - 2*T, height: 3, depth: drawerD - T, x: pos.x, y: posY - (drawerH * 0.8)/2 + 1.5, z: posZ_frente - drawerD/2 + T/2, type: 'drawer' });
    
    // Herrajes
    parts.push({ id: `${prefix}-guia`, name: 'Juego Guías Telescópicas', width: 0, height: 0, depth: drawerD, x: 0, y: 0, z: 0, type: 'hardware', isHardware: true });
  });

  return { parts, summary: `Escritorio ejecutivo con tolerancias para guías de cajón.` };
}
