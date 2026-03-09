import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Porta-Anafe
 * 1 Cajón superior + 2 Puertas inferiores. Sin tapa superior.
 */
export function kitchenCooktopEngine(dim: FurnitureDimensions): FurnitureModel {
  const T = 18;
  const { width: W, height: H, depth: D, hasBack, hasShelf } = dim;
  const innerW = W - 2 * T;

  const parts: Part[] = [
    { id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-R', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'base', name: 'Base Inferior', width: innerW, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    // Refuerzos
    { id: 'ref-front', name: 'Refuerzo Superior Frontal', width: innerW, height: T, depth: 60, x: W/2, y: H - T/2, z: D/2 - 30, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'ref-back', name: 'Refuerzo Superior Trasero', width: innerW, height: 60, depth: T, x: W/2, y: H - 30, z: -D/2 + T/2, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' },
  ];

  if (hasBack) {
    parts.push({ id: 'fondo', name: 'Fondo MDF 3mm', width: W, height: H, depth: 3, x: W/2, y: H/2, z: -D/2 - 1.5, type: 'static', cutLargo: H, cutAncho: W, cutEspesor: 3, grainDirection: 'libre' });
  }

  const drawerFrontH = 180;
  const drawerW = innerW - 26;
  const drawerD = D - 50;
  const drawerBoxH = 120;
  const drawerY = H - drawerFrontH / 2 - 10;

  // Piezas del Cajón Único Superior
  const prefix = 'cooktop-drawer';
  parts.push({ id: `${prefix}-front`, name: 'Frente Cajón Superior', width: W - 4, height: drawerFrontH - 4, depth: T, x: W/2, y: drawerY, z: D/2 + T/2, type: 'drawer', cutLargo: drawerFrontH - 4, cutAncho: W - 4, cutEspesor: T, grainDirection: 'horizontal' });
  parts.push({ id: `${prefix}-side-L`, name: 'Lat. Izq. Cajón', width: T, height: drawerBoxH, depth: drawerD, x: W/2 - drawerW/2 + T/2, y: drawerY, z: D/2 - drawerD/2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'libre' });
  parts.push({ id: `${prefix}-side-R`, name: 'Lat. Der. Cajón', width: T, height: drawerBoxH, depth: drawerD, x: W/2 + drawerW/2 - T/2, y: drawerY, z: D/2 - drawerD/2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'libre' });
  parts.push({ id: `${prefix}-back`, name: 'Trasera Cajón', width: drawerW - 2*T, height: drawerBoxH, depth: T, x: W/2, y: drawerY, z: D/2 - drawerD + T/2, type: 'drawer', cutLargo: drawerW - 2*T, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'libre' });
  parts.push({ id: `${prefix}-bottom`, name: 'Piso Cajón', width: drawerW - 2*T, height: 3, depth: drawerD - T, x: W/2, y: drawerY - drawerBoxH/2 + 1.5, z: D/2 - drawerD/2 + T/2, type: 'drawer', cutLargo: drawerD - T, cutAncho: drawerW - 2*T, cutEspesor: 3, grainDirection: 'libre' });
  
  // Rieles
  parts.push({ id: `${prefix}-rail-L`, name: `Riel Telescópico ${drawerD}mm`, width: 13, height: 35, depth: drawerD, x: T + 6.5, y: drawerY, z: D/2 - drawerD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  parts.push({ id: `${prefix}-rail-R`, name: `Riel Telescópico ${drawerD}mm`, width: 13, height: 35, depth: drawerD, x: W - T - 6.5, y: drawerY, z: D/2 - drawerD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });

  // Puertas Inferiores
  const doorH = H - drawerFrontH - T - 15;
  const doorW = W / 2 - 2;
  const doorY = T + doorH / 2 + 5;
  const hingesPerDoor = doorH <= 600 ? 2 : doorH <= 1200 ? 3 : 4;

  const doorTypes: ('door-left' | 'door-right')[] = ['door-left', 'door-right'];
  doorTypes.forEach((type, idx) => {
    const isLeft = type === 'door-left';
    parts.push({ 
      id: `cook-door-${isLeft ? 'L' : 'R'}`, name: `Puerta ${isLeft ? 'Izquierda' : 'Derecha'}`, 
      width: doorW, height: doorH, depth: T, x: isLeft ? doorW / 2 : W - doorW / 2, y: doorY, z: D / 2 + T / 2, 
      type: type, pivot: { x: isLeft ? 0 : W, y: doorY, z: D / 2 },
      cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical',
      hingeCount: hingesPerDoor
    });

    for (let i = 0; i < hingesPerDoor; i++) {
      let posY = doorY - doorH/2 + 70 + (i * (doorH - 140) / (hingesPerDoor - 1 || 1));
      parts.push({
        id: `cook-hinge-${isLeft ? 'L' : 'R'}-${i}`, name: 'Bisagra Interna 90°', width: 35, height: 35, depth: 12,
        x: isLeft ? T : W - T, y: posY, z: D/2 - 10, type: 'hardware', isHardware: true,
        cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
      });
    }
  });

  if (hasShelf) {
    parts.push({ id: 'shelf', name: 'Estante Interno', width: innerW - 2, height: T, depth: D * 0.9, x: W/2, y: doorY, z: 0, type: 'static', cutLargo: innerW - 2, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'horizontal' });
  }

  return { parts, summary: 'Porta-anafe con cajón superior y dos puertas.', hasDoors: true, hasDrawers: true };
}
