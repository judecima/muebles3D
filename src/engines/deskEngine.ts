import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Escritorio Red Arquimax v15.2
 * Estructura Sándwich con cajones de 6 piezas y huelgo de 3mm.
 */
export function deskEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, depth: D, thickness: T } = dim;
  const H = 750;

  const cabW = 400;
  const innerW = cabW - 2 * T;
  const sideH = H - 2 * T;
  const cabCenterX = W - cabW / 2;

  const parts: Part[] = [
    { id: 'top', name: 'Tapa Escritorio', width: W, height: T, depth: D, x: W / 2, y: H - T / 2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'base', name: 'Base Inferior', width: W, height: T, depth: D, x: W / 2, y: T / 2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'leg-L', name: 'Lateral Izquierdo', width: T, height: sideH, depth: D, x: T / 2, y: H / 2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'leg-R', name: 'Lateral Derecho', width: T, height: sideH, depth: D, x: W - T / 2, y: H / 2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'div-L', name: 'Divisor Módulo', width: T, height: sideH, depth: D, x: W - cabW + T / 2, y: H / 2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'mod-back', name: 'Respaldo Estructural', width: W - cabW - T, height: H * 0.4, depth: T, x: (W - cabW) / 2, y: H - T - (H * 0.2), z: -D/4, type: 'static', cutLargo: W - cabW - T, cutAncho: H * 0.4, cutEspesor: T, grainDirection: 'horizontal' },
  ];

  const railCl = 13;
  const drawerBoxW = innerW - (railCl * 2);
  const drD = D - 40;
  const frontH = 190;
  const gap = 3;
  const startY = H - T - 10;

  for (let i = 0; i < 2; i++) {
    const pY = startY - (frontH / 2) - (i * (frontH + gap));
    const prefix = `desk-dr-${i}`;
    
    // 1. Frente Estético
    parts.push({ id: `${prefix}-f`, groupId: prefix, name: `Frente Cajón`, width: cabW - 4, height: frontH - 2, depth: T, x: cabCenterX, y: pY, z: D / 2 + T / 2, type: 'drawer', cutLargo: frontH - 2, cutAncho: cabW - 4, cutEspesor: T, grainDirection: 'horizontal' });
    
    // 2. Caja Estructural (5 piezas)
    const boxInnerW = drawerBoxW - 2 * T;
    const boxH = frontH * 0.7;
    parts.push({ id: `${prefix}-box-F`, groupId: prefix, name: `Frente Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: cabCenterX, y: pY, z: D/2 - T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-B`, groupId: prefix, name: `Trasera Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: cabCenterX, y: pY, z: D/2 - drD + T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-SL`, groupId: prefix, name: `Lateral Izq. Caja`, width: T, height: boxH, depth: drD, x: cabCenterX - drawerBoxW/2 + T/2, y: pY, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-SR`, groupId: prefix, name: `Lateral Der. Caja`, width: T, height: boxH, depth: drD, x: cabCenterX + drawerBoxW/2 - T/2, y: pY, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-bottom`, groupId: prefix, name: `Piso Cajón 3mm`, width: drawerBoxW, height: 3, depth: drD, x: cabCenterX, y: pY - boxH/2 + 1.5, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: drawerBoxW, cutEspesor: 3, grainDirection: 'libre' });

    // 3. Rieles
    parts.push({ id: `${prefix}-rail-L`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drD, x: cabCenterX - drawerBoxW/2 - 6.5, y: pY, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-R`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drD, x: cabCenterX + drawerBoxW/2 + 6.5, y: pY, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  }

  return { parts, summary: 'Escritorio v15.2 Industrial: Estructura sándwich y cajones sincronizados.', hasDoors: false, hasDrawers: true };
}