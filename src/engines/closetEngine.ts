import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Placard Red Arquimax
 * Sistema constructivo: Caja de 5 piezas + Frente estético independiente.
 */
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

  const doorTypes: ('door-left' | 'door-right')[] = ['door-left', 'door-right'];
  doorTypes.forEach((type) => {
    const isLeft = type === 'door-left';
    parts.push({ 
      id: `closet-door-${isLeft ? 'L' : 'R'}`, 
      name: `Puerta ${isLeft ? 'Izquierda' : 'Derecha'}`, 
      width: doorW, height: doorH, depth: T, 
      x: isLeft ? doorW / 2 : W - doorW / 2, 
      y: doorY, z: D / 2 + T / 2, 
      type: type,
      pivot: { x: isLeft ? 0 : W, y: doorY, z: D / 2 },
      cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical'
    });
  });

  const drawerFrontH = (drawerSectionH - T - 20) / 2;
  const drawerGap = 10;
  const railSpace = 26; 
  const drawerW = innerW - railSpace;
  const drawerD = D - 50;
  const drawerBoxH = drawerFrontH * 0.7;

  for (let i = 0; i < 2; i++) {
    const prefix = `closet-drawer-${i}`;
    const posY = T + 10 + (i * (drawerFrontH + drawerGap)) + (drawerFrontH / 2);
    
    // 1. Frente Estético
    parts.push({ id: `${prefix}-front-aesthetic`, name: `Frente Estético Cajón ${i+1}`, width: W - 4, height: drawerFrontH, depth: T, x: W/2, y: posY, z: D/2 + T/2, type: 'drawer', cutLargo: drawerFrontH, cutAncho: W - 4, cutEspesor: T, grainDirection: 'horizontal' });
    
    // 2. Frente Estructura Caja
    parts.push({ id: `${prefix}-box-front`, name: `Frente Estruct. Caja ${i+1}`, width: drawerW - 2*T, height: drawerBoxH, depth: T, x: W/2, y: posY, z: D/2 - T/2, type: 'drawer', cutLargo: drawerW - 2*T, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'libre' });

    // 3. Laterales Caja
    parts.push({ id: `${prefix}-box-side-L`, name: `Lat. Izq. Caja ${i+1}`, width: T, height: drawerBoxH, depth: drawerD, x: W/2 - drawerW/2 + T/2, y: posY, z: D/2 - drawerD/2 - T, type: 'drawer', cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-box-side-R`, name: `Lat. Der. Caja ${i+1}`, width: T, height: drawerBoxH, depth: drawerD, x: W/2 + drawerW/2 - T/2, y: posY, z: D/2 - drawerD/2 - T, type: 'drawer', cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'libre' });
    
    // 4. Trasera Caja
    parts.push({ id: `${prefix}-box-back`, name: `Trasera Caja ${i+1}`, width: drawerW - 2*T, height: drawerBoxH, depth: T, x: W/2, y: posY, z: D/2 - drawerD - T + T/2, type: 'drawer', cutLargo: drawerW - 2*T, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'libre' });
    
    // 5. Piso Caja
    parts.push({ id: `${prefix}-box-bottom`, name: `Piso Caja ${i+1}`, width: drawerW - 2*T, height: 3, depth: drawerD, x: W/2, y: posY - drawerBoxH/2 + 1.5, z: D/2 - drawerD/2 - T, type: 'drawer', cutLargo: drawerD, cutAncho: drawerW - 2*T, cutEspesor: 3, grainDirection: 'libre' });
  }

  return { parts, summary: 'Placard con sistema de cajonera industrial independiente.', hasDoors: true, hasDrawers: true };
}
