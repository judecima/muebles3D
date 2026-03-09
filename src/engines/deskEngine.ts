import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function deskEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  
  // Límite de altura para escritorio
  const effectiveH = Math.min(H, 1000);

  const parts: Part[] = [
    { id: 'top', name: 'Tapa Escritorio', width: W, height: T, depth: D, x: W/2, y: effectiveH - T/2, z: 0, type: 'static' },
    { id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: effectiveH - T, depth: D, x: T/2, y: (effectiveH - T)/2, z: 0, type: 'static' },
    { id: 'lat-R', name: 'Lateral Derecho', width: T, height: effectiveH - T, depth: D, x: W - T/2, y: (effectiveH - T)/2, z: 0, type: 'static' },
    { id: 'back', name: 'Panel Trasero (Refuerzo)', width: W - 2*T, height: effectiveH * 0.4, depth: T, x: W/2, y: effectiveH - T - (effectiveH * 0.4)/2, z: -D/4, type: 'static' },
  ];

  // Cajones
  const slideClearance = 26;
  const drawerW = 400;
  const drawerH = 150;
  const drawerD = D * 0.7;

  // Cajonera lateral
  for (let i = 0; i < 2; i++) {
    const posY = effectiveH - T - 180 - (i * 170);
    const posX = W - T - drawerW/2 - 20;
    
    parts.push({ id: `desk-draw-${i}-front`, name: `Frente Cajón ${i+1}`, width: drawerW, height: drawerH, depth: T, x: posX, y: posY, z: D/2 - 10, type: 'drawer' });
    parts.push({ id: `desk-draw-${i}-box`, name: `Caja Cajón ${i+1}`, width: drawerW - slideClearance, height: drawerH * 0.7, depth: drawerD, x: posX, y: posY, z: D/2 - drawerD/2 - 10, type: 'drawer' });
    parts.push({ id: `rail-${i}`, name: 'Guía Telescópica', width: 0, height: 0, depth: drawerD, x: 0, y: 0, z: 0, type: 'hardware', isHardware: true });
  }

  return { parts, summary: 'Escritorio ejecutivo con cajonera derecha y descuentos para guías.' };
}
