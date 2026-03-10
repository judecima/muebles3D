import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Bajo Mesada Cajonera (3 Cajones) v15.2
 * Estructura Sándwich + Cajones de 6 piezas + Rieles por Juego.
 */
export function kitchenDrawerEngine(dim: FurnitureDimensions): FurnitureModel {
  const T = dim.thickness || 18;
  const { width: W, height: H, depth: D, hasBack } = dim;
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

  const drawerGap = 3; 
  const drawerFrontH = (H - T - 4 - (2 * drawerGap)) / 3; 
  const railClearance = 13;
  const drawerBoxW = innerW - (railClearance * 2);
  const drawerD = D - 50;
  const boxH = drawerFrontH * 0.7;

  for (let i = 0; i < 3; i++) {
    const prefix = `k-drawer-${i}`;
    const posY = T + 2 + (i * (drawerFrontH + drawerGap)) + (drawerFrontH / 2);
    
    // 1. Frente Estético
    parts.push({ id: `${prefix}-aesthetic`, groupId: prefix, name: `Frente Estético Cajón`, width: W - 4, height: drawerFrontH - 2, depth: T, x: W/2, y: posY, z: D/2 + T/2, type: 'drawer', cutLargo: drawerFrontH - 2, cutAncho: W - 4, cutEspesor: T, grainDirection: 'horizontal' });
    
    // 2. Caja Estructural (4 partes + base)
    const boxInnerW = drawerBoxW - 2*T;
    parts.push({ id: `${prefix}-box-F`, groupId: prefix, name: `Frente Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: W/2, y: posY, z: D/2 - T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-B`, groupId: prefix, name: `Trasera Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: W/2, y: posY, z: D/2 - drawerD + T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-SL`, groupId: prefix, name: `Lateral Izq. Caja`, width: T, height: boxH, depth: drawerD, x: W/2 - drawerBoxW/2 + T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer', cutLargo: drawerD, cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-SR`, groupId: prefix, name: `Lateral Der. Caja`, width: T, height: boxH, depth: drawerD, x: W/2 + drawerBoxW/2 - T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer', cutLargo: drawerD, cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-bottom`, groupId: prefix, name: `Piso Cajón 3mm`, width: drawerBoxW, height: 3, depth: drawerD, x: W/2, y: posY - boxH/2 + 1.5, z: D/2 - drawerD/2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerBoxW, cutEspesor: 3, grainDirection: 'libre' });
    
    // 3. Rieles (Contabilizados por Juego)
    parts.push({ id: `${prefix}-rail-L`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drawerD, x: T + railClearance/2, y: posY, z: D/2 - drawerD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-R`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drawerD, x: W - T - railClearance/2, y: posY, z: D/2 - drawerD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  }

  return { parts, summary: 'Bajo mesada cajonera v15.2 Industrial.', hasDoors: false, hasDrawers: true };
}
