import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Bajo Mesada Cajonera (3 Cajones) v15.1
 * Estructura sándwich (Base W). Incluye Rieles Telescópicos por Juego.
 * Espacio entre cajones estandarizado a 3mm.
 */
export function kitchenDrawerEngine(dim: FurnitureDimensions): FurnitureModel {
  const T = 18; 
  const { width: W, height: H, depth: D, hasBack } = dim;
  const sideH = H - T;
  const innerW = W - 2 * T;

  const parts: Part[] = [
    { id: 'base', name: 'Base Inferior', width: W, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: sideH, depth: D, x: T/2, y: T + sideH/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-R', name: 'Lateral Derecho', width: T, height: sideH, depth: D, x: W - T/2, y: T + sideH/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    
    // Amarres superiores internos
    { id: 'ref-front', name: 'Refuerzo Superior Frontal', width: innerW, height: T, depth: 60, x: W/2, y: H - T/2, z: D/2 - 30, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'ref-back', name: 'Refuerzo Superior Trasero', width: innerW, height: 60, depth: T, x: W/2, y: H - 30, z: -D/2 + T/2, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' },
  ];

  if (hasBack) {
    parts.push({ 
      id: 'fondo', name: 'Fondo MDF 3mm', width: W, height: H, depth: 3, 
      x: W/2, y: H/2, z: -D/2 - 1.5, 
      type: 'static', cutLargo: H, cutAncho: W, cutEspesor: 3, grainDirection: 'libre' 
    });
  }

  const usableH = H - T - 4; 
  const drawerGap = 3; // Luz técnica 3mm entre cajones
  const drawerFrontH = (usableH - (2 * drawerGap)) / 3; 
  const drawerW = innerW - 26; 
  const drawerD = D - 50;
  const drawerBoxH = Math.round(drawerFrontH * 0.75);

  for (let i = 0; i < 3; i++) {
    const prefix = `k-drawer-${i}`;
    const posY = T + 2 + (i * (drawerFrontH + drawerGap)) + (drawerFrontH / 2);
    
    parts.push({ id: `${prefix}-front-aesthetic`, groupId: prefix, name: `Frente Estético Cajón ${i+1}`, width: W - 4, height: drawerFrontH - 2, depth: T, x: W/2, y: posY, z: D/2 + T/2, type: 'drawer', cutLargo: drawerFrontH - 2, cutAncho: W - 4, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-front`, groupId: prefix, name: `Frente Estruct. Caja ${i+1}`, width: drawerW - 2*T, height: drawerBoxH, depth: T, x: W/2, y: posY, z: D/2 - T/2, type: 'drawer', cutLargo: drawerW - 2*T, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-side-L`, groupId: prefix, name: `Lat. Izq. Caja ${i+1}`, width: T, height: drawerBoxH, depth: drawerD, x: W/2 - drawerW/2 + T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-side-R`, groupId: prefix, name: `Lat. Der. Caja ${i+1}`, width: T, height: drawerBoxH, depth: drawerD, x: W/2 + drawerW/2 - T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-back`, groupId: prefix, name: `Trasera Caja ${i+1}`, width: drawerW - 2*T, height: drawerBoxH, depth: T, x: W/2, y: posY, z: D/2 - drawerD + T/2, type: 'drawer', cutLargo: drawerW - 2*T, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-bottom`, groupId: prefix, name: `Piso Caja ${i+1}`, width: drawerW - 2*T, height: 3, depth: drawerD, x: W/2, y: posY - drawerBoxH/2 + 1.5, z: D/2 - drawerD/2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerW - 2*T, cutEspesor: 3, grainDirection: 'libre' });
    
    // Rieles (Contabilizados por Juego)
    parts.push({ id: `${prefix}-rail-L`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drawerD, x: T + 6.5, y: posY, z: D/2 - drawerD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-R`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drawerD, x: W - T - 6.5, y: posY, z: D/2 - drawerD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  }

  return { parts, summary: 'Bajo mesada cajonera v15.1: Estructura sándwich, gap 3mm.', hasDoors: false, hasDrawers: true };
}
