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

  // Cajones laterales (debajo de la tapa)
  const drawerW = (W - 2*T) / 3;
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
    // Laterales
    parts.push({ id: `${prefix}-lat-izq`, name: `Lat. Izq. Cajón ${pos.id}`, width: T, height: drawerH * 0.8, depth: drawerD, x: pos.x - drawerW/2 + T/2 + 5, y: posY, z: posZ_frente - drawerD/2, type: 'drawer' });
    parts.push({ id: `${prefix}-lat-der`, name: `Lat. Der. Cajón ${pos.id}`, width: T, height: drawerH * 0.8, depth: drawerD, x: pos.x + drawerW/2 - T/2 - 5, y: posY, z: posZ_frente - drawerD/2, type: 'drawer' });
    // Fondo
    parts.push({ id: `${prefix}-fondo`, name: `Contrafrente Cajón ${pos.id}`, width: drawerW - 2*T - 10, height: drawerH * 0.8, depth: T, x: pos.x, y: posY, z: posZ_frente - drawerD + T/2, type: 'drawer' });
    // Piso
    parts.push({ id: `${prefix}-piso`, name: `Piso Cajón ${pos.id}`, width: drawerW - 2*T - 10, height: 3, depth: drawerD - T, x: pos.x, y: posY - (drawerH * 0.8)/2 + 1.5, z: posZ_frente - drawerD/2 + T/2, type: 'drawer' });
  });

  return { parts, summary: `Escritorio ejecutivo con cajonera funcional.` };
}
