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

  // Cajonera Técnica
  const cabinetW = 400;
  const innerCabinetW = cabinetW - 2*T;
  const drawerW = innerCabinetW - 26; // Espacio rieles
  const drawerD = D - 40;
  const drawerH = 140;

  for (let i = 0; i < 2; i++) {
    const posY = effectiveH - T - 180 - (i * 170);
    const posX = W - T - cabinetW/2 - 20;
    const prefix = `desk-draw-${i}`;
    
    // Frente
    parts.push({ id: `${prefix}-front`, name: `Frente Cajón ${i+1}`, width: cabinetW, height: 160, depth: T, x: posX, y: posY, z: D/2 - 10, type: 'drawer' });
    
    // Caja
    parts.push({ id: `${prefix}-lat-izq`, name: `Lateral Izq. Cajón ${i+1}`, width: T, height: drawerH, depth: drawerD, x: posX - drawerW/2 + T/2, y: posY, z: D/2 - drawerD/2 - 10 - T, type: 'drawer' });
    parts.push({ id: `${prefix}-lat-der`, name: `Lateral Der. Cajón ${i+1}`, width: T, height: drawerH, depth: drawerD, x: posX + drawerW/2 - T/2, y: posY, z: D/2 - drawerD/2 - 10 - T, type: 'drawer' });
    parts.push({ id: `${prefix}-trasera`, name: `Trasera Cajón ${i+1}`, width: drawerW - 2*T, height: drawerH, depth: T, x: posX, y: posY, z: D/2 - drawerD - 10 - T/2, type: 'drawer' });
    parts.push({ id: `${prefix}-piso`, name: `Piso Cajón ${i+1}`, width: drawerW - 2*T, height: 3, depth: drawerD - T, x: posX, y: posY - drawerH/2 + 1.5, z: D/2 - drawerD/2 - 10, type: 'drawer' });

    // Rieles
    parts.push({ 
      id: `${prefix}-riel-L`, name: `Riel Telescópico ${drawerD}mm`, 
      width: 13, height: 35, depth: drawerD, 
      x: posX - drawerW/2 - 6.5, y: posY, z: D/2 - drawerD/2 - 10, 
      type: 'hardware', isHardware: true 
    });
    parts.push({ 
      id: `${prefix}-riel-R`, name: `Riel Telescópico ${drawerD}mm`, 
      width: 13, height: 35, depth: drawerD, 
      x: posX + drawerW/2 + 6.5, y: posY, z: D/2 - drawerD/2 - 10, 
      type: 'hardware', isHardware: true 
    });
  }

  return { parts, summary: 'Escritorio ejecutivo con cajonera técnica y descuento de rieles de 26mm.' };
}