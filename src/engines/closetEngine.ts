import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function closetEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  
  const drawerSectionH = 500; 
  const doorSectionH = H - drawerSectionH;
  const innerW = W - 2 * T;

  const parts: Part[] = [
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'base-inf', name: 'Base Inferior', width: innerW, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'tapa-sup', name: 'Tapa Superior', width: innerW, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'divisor-hor', name: 'Estante Divisor', width: innerW, height: T, depth: D, x: W/2, y: drawerSectionH, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
  ];

  parts.push({ 
    id: 'fondo', name: 'Fondo MDF 3mm', width: W, height: H, depth: 3, 
    x: W/2, y: H/2, z: -D/2 - 1.5, 
    type: 'static', cutLargo: H, cutAncho: W, cutEspesor: 3, grainDirection: 'libre' 
  });

  const barHeight = 1700;
  if (H > barHeight + 100) {
    parts.push({ 
      id: 'hanger-bar', name: 'Barral de Colgar', width: innerW, height: 25, depth: 25, 
      x: W/2, y: barHeight, z: 0, type: 'hardware', isHardware: true, 
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
    });
  }

  const doorW = W / 2 - 2;
  const doorH = doorSectionH - 5;
  const doorY = drawerSectionH + (doorSectionH / 2);
  const hingesPerDoor = doorH <= 600 ? 2 : doorH <= 1200 ? 3 : 4;

  const doorTypes: ('door-left' | 'door-right')[] = ['door-left', 'door-right'];
  doorTypes.forEach((type, idx) => {
    const isLeft = type === 'door-left';
    parts.push({ 
      id: `closet-door-${isLeft ? 'L' : 'R'}`, 
      name: `Puerta ${isLeft ? 'Izquierda' : 'Derecha'}`, 
      width: doorW, height: doorH, depth: T, 
      x: isLeft ? doorW / 2 : W - doorW / 2, 
      y: doorY, z: D / 2 + T / 2, 
      type: type,
      pivot: { x: isLeft ? 0 : W, y: doorY, z: D / 2 },
      cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical',
      hingeCount: hingesPerDoor
    });

    for (let i = 0; i < hingesPerDoor; i++) {
      let posY = drawerSectionH + 70;
      if (hingesPerDoor > 2) {
        posY = drawerSectionH + 70 + (i * (doorH - 140) / (hingesPerDoor - 1));
      } else {
        posY = i === 0 ? drawerSectionH + 70 : drawerSectionH + doorH - 70;
      }

      parts.push({
        id: `hinge-closet-${isLeft ? 'L' : 'R'}-${i}`, name: 'Bisagra Interna 90°', width: 30, height: 15, depth: 45,
        x: isLeft ? 10 : W - 10, y: posY, z: D/2 - 20, type: 'hardware', isHardware: true,
        cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
      });
    }
  });

  const drawerFrontH = (drawerSectionH - T - 20) / 2;
  const drawerGap = 10;
  const railSpace = 25; 
  const drawerW = innerW - railSpace;
  const drawerD = D - 50;
  const drawerBoxH = drawerFrontH * 0.7;

  for (let i = 0; i < 2; i++) {
    const prefix = `closet-drawer-${i}`;
    const posY = T + 10 + (i * (drawerFrontH + drawerGap)) + (drawerFrontH / 2);
    
    parts.push({ id: `${prefix}-front`, name: `Frente Cajón ${i+1}`, width: W - 4, height: drawerFrontH, depth: T, x: W/2, y: posY, z: D/2 + T/2, type: 'drawer', cutLargo: drawerFrontH, cutAncho: W - 4, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-side-L`, name: `Lat. Izq. Cajón ${i+1}`, width: T, height: drawerBoxH, depth: drawerD, x: W/2 - drawerW/2 + T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-side-R`, name: `Lat. Der. Cajón ${i+1}`, width: T, height: drawerBoxH, depth: drawerD, x: W/2 + drawerW/2 - T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-back`, name: `Trasera Cajón ${i+1}`, width: drawerW - 2*T, height: drawerBoxH, depth: T, x: W/2, y: posY, z: D/2 - drawerD + T/2, type: 'drawer', cutLargo: drawerW - 2*T, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-bottom`, name: `Piso Cajón ${i+1}`, width: drawerW - 2*T, height: 3, depth: drawerD - T, x: W/2, y: posY - drawerBoxH/2 + 1.5, z: D/2 - drawerD/2 + T/2, type: 'drawer', cutLargo: drawerD - T, cutAncho: drawerW - 2*T, cutEspesor: 3, grainDirection: 'libre' });
  }

  return { parts, summary: 'Placard Red Arquimax con bisagras automáticas y cajonera.', hasDoors: true, hasDrawers: true };
}
