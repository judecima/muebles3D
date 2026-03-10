import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Porta-Anafe v14.1
 * Estructura sándwich (Base W). Incluye Bisagras y Rieles.
 */
export function kitchenCooktopEngine(dim: FurnitureDimensions): FurnitureModel {
  const T = 18;
  const { width: W, height: H, depth: D, hasBack, hasShelf } = dim;
  const sideH = H - T;
  const innerW = W - 2 * T;

  const parts: Part[] = [
    { id: 'base', name: 'Base Inferior', width: W, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: sideH, depth: D, x: T/2, y: T + sideH/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-R', name: 'Lateral Derecho', width: T, height: sideH, depth: D, x: W - T/2, y: T + sideH/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'ref-front', name: 'Refuerzo Superior Frontal', width: innerW, height: T, depth: 60, x: W/2, y: H - T/2, z: D/2 - 30, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'ref-back', name: 'Refuerzo Superior Trasero', width: innerW, height: 60, depth: T, x: W/2, y: H - 30, z: -D/2 + T/2, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' },
  ];

  if (hasBack) {
    parts.push({ id: 'fondo', name: 'Fondo MDF 3mm', width: W, height: H, depth: 3, x: W/2, y: H/2, z: -D/2 - 1.5, type: 'static', cutLargo: H, cutAncho: W, cutEspesor: 3, grainDirection: 'libre' });
  }

  const drawerFrontH = 180;
  const drawerFrontW = W - 4;
  const drawerY_Front = H - drawerFrontH / 2 - 2;
  const drawerBoxH = Math.round(drawerFrontH * 0.45); 
  const drawerW = innerW - 26;
  const drawerD = D - 50;
  const drawerY_Box = (drawerY_Front - drawerFrontH / 2) + drawerBoxH / 2 + 5;
  const prefix = 'cooktop-drawer';
  
  parts.push({ id: `${prefix}-front-aesthetic`, groupId: prefix, name: 'Frente Estético Anafe', width: drawerFrontW, height: drawerFrontH - 2, depth: T, x: W/2, y: drawerY_Front, z: D/2 + T/2, type: 'drawer', cutLargo: drawerFrontH - 2, cutAncho: drawerFrontW, cutEspesor: T, grainDirection: 'horizontal' });
  parts.push({ id: `${prefix}-box-front`, groupId: prefix, name: 'Frente Estruct. Caja', width: drawerW - 2*T, height: drawerBoxH, depth: T, x: W/2, y: drawerY_Box, z: D/2 - T/2, type: 'drawer', cutLargo: drawerW - 2*T, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'horizontal' });
  parts.push({ id: `${prefix}-box-side-L`, groupId: prefix, name: 'Lat. Izq. Caja', width: T, height: drawerBoxH, depth: drawerD, x: W/2 - drawerW/2 + T/2, y: drawerY_Box, z: D/2 - drawerD/2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'vertical' });
  parts.push({ id: `${prefix}-box-side-R`, groupId: prefix, name: 'Lat. Der. Caja', width: T, height: drawerBoxH, depth: drawerD, x: W/2 + drawerW/2 - T/2, y: drawerY_Box, z: D/2 - drawerD/2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'vertical' });
  parts.push({ id: `${prefix}-box-back`, groupId: prefix, name: 'Trasera Caja', width: drawerW - 2*T, height: drawerBoxH, depth: T, x: W/2, y: drawerY_Box, z: D/2 - drawerD + T/2, type: 'drawer', cutLargo: drawerW - 2*T, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'horizontal' });
  parts.push({ id: `${prefix}-box-bottom`, groupId: prefix, name: 'Piso Caja', width: drawerW - 2*T, height: 3, depth: drawerD, x: W/2, y: drawerY_Box - drawerBoxH/2 + 1.5, z: D/2 - drawerD/2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerW - 2*T, cutEspesor: 3, grainDirection: 'libre' });
  
  // Rieles
  parts.push({ id: `${prefix}-rail-L`, groupId: prefix, name: `Riel Telescópico ${drawerD}mm`, width: 13, height: 35, depth: drawerD, x: T + 6.5, y: drawerY_Box, z: D/2 - drawerD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  parts.push({ id: `${prefix}-rail-R`, groupId: prefix, name: `Riel Telescópico ${drawerD}mm`, width: 13, height: 35, depth: drawerD, x: W - T - 6.5, y: drawerY_Box, z: D/2 - drawerD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });

  const doorH = H - drawerFrontH - T - 8;
  const doorW = W / 2 - 2;
  const doorY = T + doorH / 2 + 4;
  const hingesPerDoor = doorH <= 600 ? 2 : doorH <= 1200 ? 3 : 4;

  const doorTypes: ('door-left' | 'door-right')[] = ['door-left', 'door-right'];
  doorTypes.forEach((type) => {
    const isLeft = type === 'door-left';
    const dId = `cook-door-${isLeft ? 'L' : 'R'}`;
    parts.push({ 
      id: dId, 
      groupId: dId,
      name: `Puerta ${isLeft ? 'Izquierda' : 'Derecha'}`, 
      width: doorW, height: doorH, depth: T, x: isLeft ? doorW / 2 : W - doorW / 2, y: doorY, z: D / 2 + T / 2, 
      type: type, pivot: { x: isLeft ? 0 : W, y: doorY, z: D / 2 },
      cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical',
      hingeCount: hingesPerDoor
    });

    // Bisagras
    for (let i = 0; i < hingesPerDoor; i++) {
      let posY = doorY - doorH/2 + 70;
      if (hingesPerDoor > 2) posY = (doorY - doorH/2) + 70 + (i * (doorH - 140) / (hingesPerDoor - 1));
      else posY = (i === 0) ? (doorY - doorH/2 + 70) : (doorY + doorH/2 - 70);

      parts.push({
        id: `hinge-${dId}-${i}`, name: 'Bisagra Interna 90°', width: 35, height: 35, depth: 12,
        x: isLeft ? T : W - T, y: posY, z: D/2 - 10, type: 'hardware', isHardware: true,
        cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
      });
    }
  });

  if (hasShelf) {
    parts.push({ id: 'shelf', name: 'Estante Interno', width: innerW - 2, height: T, depth: D * 0.9, x: W/2, y: doorY, z: 0, type: 'static', cutLargo: innerW - 2, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'horizontal' });
  }

  return { parts, summary: 'Porta-anafe v14.1: Estructura sándwich, cajón técnico y puertas overlay.', hasDoors: true, hasDrawers: true };
}
