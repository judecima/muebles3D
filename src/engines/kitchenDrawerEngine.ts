import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Bajo Mesada Cajonera (3 Cajones)
 * Estructura sin tapa superior, con refuerzos de 60mm.
 */
export function kitchenDrawerEngine(dim: FurnitureDimensions): FurnitureModel {
  const T = 18; 
  const { width: W, height: H, depth: D, hasBack } = dim;
  const innerW = W - 2 * T;

  const parts: Part[] = [
    { id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-R', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'base', name: 'Base Inferior', width: innerW, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    // Refuerzo Frontal Horizontal
    { id: 'ref-front', name: 'Refuerzo Superior Frontal', width: innerW, height: T, depth: 60, x: W/2, y: H - T/2, z: D/2 - 30, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' },
    // Refuerzo Trasero Vertical
    { id: 'ref-back', name: 'Refuerzo Superior Trasero', width: innerW, height: 60, depth: T, x: W/2, y: H - 30, z: -D/2 + T/2, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' },
  ];

  if (hasBack) {
    parts.push({ 
      id: 'fondo', name: 'Fondo MDF 3mm', width: W, height: H, depth: 3, 
      x: W/2, y: H/2, z: -D/2 - 1.5, 
      type: 'static', cutLargo: H, cutAncho: W, cutEspesor: 3, grainDirection: 'libre' 
    });
  }

  const usableH = H - T;
  const drawerFrontH = (usableH - 12) / 3;
  const drawerGap = 4;
  const drawerW = innerW - 26; // Espacio para rieles telescópicos
  const drawerD = D - 50;
  const drawerBoxH = drawerFrontH * 0.7;

  for (let i = 0; i < 3; i++) {
    const prefix = `k-drawer-${i}`;
    const posY = T + (i * (drawerFrontH + drawerGap)) + (drawerFrontH / 2);
    
    // Frente
    parts.push({ id: `${prefix}-front`, name: `Frente Cajón ${i+1}`, width: W - 4, height: drawerFrontH - 2, depth: T, x: W/2, y: posY, z: D/2 + T/2, type: 'drawer', cutLargo: drawerFrontH - 2, cutAncho: W - 4, cutEspesor: T, grainDirection: 'horizontal' });
    // Laterales
    parts.push({ id: `${prefix}-side-L`, name: `Lat. Izq. Cajón ${i+1}`, width: T, height: drawerBoxH, depth: drawerD, x: W/2 - drawerW/2 + T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-side-R`, name: `Lat. Der. Cajón ${i+1}`, width: T, height: drawerBoxH, depth: drawerD, x: W/2 + drawerW/2 - T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'libre' });
    // Trasera
    parts.push({ id: `${prefix}-back`, name: `Trasera Cajón ${i+1}`, width: drawerW - 2*T, height: drawerBoxH, depth: T, x: W/2, y: posY, z: D/2 - drawerD + T/2, type: 'drawer', cutLargo: drawerW - 2*T, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'libre' });
    // Piso
    parts.push({ id: `${prefix}-bottom`, name: `Piso Cajón ${i+1}`, width: drawerW - 2*T, height: 3, depth: drawerD - T, x: W/2, y: posY - drawerBoxH/2 + 1.5, z: D/2 - drawerD/2 + T/2, type: 'drawer', cutLargo: drawerD - T, cutAncho: drawerW - 2*T, cutEspesor: 3, grainDirection: 'libre' });
    
    // Herrajes: Rieles
    parts.push({ id: `${prefix}-rail-L`, name: `Riel Telescópico ${drawerD}mm`, width: 13, height: 35, depth: drawerD, x: T + 6.5, y: posY, z: D/2 - drawerD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-R`, name: `Riel Telescópico ${drawerD}mm`, width: 13, height: 35, depth: drawerD, x: W - T - 6.5, y: posY, z: D/2 - drawerD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  }

  return { parts, summary: 'Bajo mesada cajonera con 3 cajones y refuerzos estructurales.', hasDoors: false, hasDrawers: true };
}
