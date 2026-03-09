import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function deskEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  const effectiveH = Math.min(H, 1000);

  const parts: Part[] = [
    { id: 'top', name: 'Tapa Escritorio', width: W, height: T, depth: D, x: W/2, y: effectiveH - T/2, z: 0, type: 'static' },
    { id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: effectiveH - T, depth: D, x: T/2, y: (effectiveH - T)/2, z: 0, type: 'static' },
    { id: 'lat-R', name: 'Lateral Derecho', width: T, height: effectiveH - T, depth: D, x: W - T/2, y: (effectiveH - T)/2, z: 0, type: 'static' },
    { id: 'back', name: 'Panel Trasero', width: W - 2*T, height: effectiveH * 0.4, depth: T, x: W/2, y: effectiveH - T - (effectiveH * 0.4)/2, z: -D/4, type: 'static' },
  ];

  // Cajonera
  const drawerW = 400;
  const drawerH = 140;
  const drawerD = D * 0.7;
  const slideClearance = 26;

  for (let i = 0; i < 2; i++) {
    const posY = effectiveH - T - 180 - (i * 170);
    const posX = W - T - drawerW/2 - 20;
    const prefix = `desk-draw-${i}`;
    
    // Frente
    parts.push({ id: `${prefix}-front`, name: `Frente Cajón ${i+1}`, width: drawerW, height: 160, depth: T, x: posX, y: posY, z: D/2 - 10, type: 'drawer' });
    
    // Caja
    const boxW = drawerW - slideClearance;
    parts.push({ id: `${prefix}-lat-izq`, name: `Lat. Izq. Cajón ${i+1}`, width: T, height: drawerH, depth: drawerD, x: posX - boxW/2 + T/2, y: posY, z: D/2 - drawerD/2 - 10 - T, type: 'drawer' });
    parts.push({ id: `${prefix}-lat-der`, name: `Lat. Der. Cajón ${i+1}`, width: T, height: drawerH, depth: drawerD, x: posX + boxW/2 - T/2, y: posY, z: D/2 - drawerD/2 - 10 - T, type: 'drawer' });
    parts.push({ id: `${prefix}-trasera`, name: `Trasera Cajón ${i+1}`, width: boxW - 2*T, height: drawerH, depth: T, x: posX, y: posY, z: D/2 - drawerD - 10 - T/2, type: 'drawer' });
    parts.push({ id: `${prefix}-piso`, name: `Piso Cajón ${i+1}`, width: boxW - 2*T, height: 3, depth: drawerD - T, x: posX, y: posY - drawerH/2 + 1.5, z: D/2 - drawerD/2 - 10, type: 'drawer' });

    // Rieles
    parts.push({ id: `${prefix}-riel-L`, name: `Riel Izq. Cajón ${i+1}`, width: 12, height: 45, depth: drawerD, x: posX - boxW/2 - 6, y: posY, z: D/2 - drawerD/2 - 10, type: 'hardware', isHardware: true });
    parts.push({ id: `${prefix}-riel-R`, name: `Riel Der. Cajón ${i+1}`, width: 12, height: 45, depth: drawerD, x: posX + boxW/2 + 6, y: posY, z: D/2 - drawerD/2 - 10, type: 'hardware', isHardware: true });
  }

  return { parts, summary: 'Escritorio con cajonera técnica y rieles metálicos visibles.' };
}
