
import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function deskEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, depth: D, thickness: T } = dim;
  const H = 750;

  const cabW = 400; 
  const innerW = Math.round(cabW - 2 * T);
  const sideH_leg = Math.round(H - T);    
  const sideH_cab = Math.round(H - 2 * T); 
  const cabCenterX = Math.round(W - cabW / 2);

  const parts: Part[] = [
    { id: 'top', name: 'Tapa Escritorio', width: W, height: T, depth: D, x: W / 2, y: H - T / 2, z: 0, type: 'static', cutLargo: Math.round(W), cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'cab-base', name: 'Base Cajonera', width: cabW, height: T, depth: D, x: cabCenterX, y: T / 2, z: 0, type: 'static', cutLargo: Math.round(cabW), cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'leg-L', name: 'Lateral Izquierdo', width: T, height: sideH_leg, depth: D, x: T / 2, y: sideH_leg / 2, z: 0, type: 'static', cutLargo: sideH_leg, cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'vertical' },
    { id: 'leg-R', name: 'Lateral Derecho', width: T, height: sideH_cab, depth: D, x: W - T / 2, y: T + sideH_cab / 2, z: 0, type: 'static', cutLargo: sideH_cab, cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'vertical' },
    { id: 'div-L', name: 'Divisor Módulo', width: T, height: sideH_cab, depth: D, x: W - cabW + T / 2, y: T + sideH_cab / 2, z: 0, type: 'static', cutLargo: sideH_cab, cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'vertical' },
    { id: 'mod-back', name: 'Respaldo Estructural', width: Math.round(W - cabW - T), height: Math.round(H * 0.4), depth: T, x: (W - cabW) / 2, y: H - T - (H * 0.2), z: -D/4, type: 'static', cutLargo: Math.round(W - cabW - T), cutAncho: Math.round(H * 0.4), cutEspesor: T, grainDirection: 'horizontal' },
  ];

  const railCl = 13; 
  const drawerBoxW = Math.round(innerW - (railCl * 2));
  const drD = Math.round(D - 40);
  const numDrawers = 3;
  const gap = 3; 
  const availH = H - 2 * T; 
  const frontH = Math.round((availH - (numDrawers * gap)) / numDrawers);

  for (let i = 0; i < numDrawers; i++) {
    const pY = (H - T) - gap - (frontH / 2) - (i * (frontH + gap));
    const prefix = `desk-dr-${i}`;
    const boxH = Math.round(frontH * 0.7);
    const boxInnerW = Math.round(drawerBoxW - 2 * T);
    
    parts.push({ id: `${prefix}-f`, groupId: prefix, name: `Frente Cajón`, width: cabW - 4, height: frontH, depth: T, x: cabCenterX, y: pY, z: D / 2 + T / 2, type: 'drawer', cutLargo: frontH, cutAncho: Math.round(cabW - 4), cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-F`, groupId: prefix, name: `Frente Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: cabCenterX, y: pY, z: D/2 - T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-B`, groupId: prefix, name: `Trasera Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: cabCenterX, y: pY, z: D/2 - drD + T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-SL`, groupId: prefix, name: `Lateral Izq. Caja`, width: T, height: boxH, depth: drD, x: cabCenterX - drawerBoxW/2 + T/2, y: pY, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-SR`, groupId: prefix, name: `Lateral Der. Caja`, width: T, height: boxH, depth: drD, x: cabCenterX + drawerBoxW/2 - T/2, y: pY, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-bottom`, groupId: prefix, name: `Piso Cajón 3mm`, width: drawerBoxW, height: 3, depth: drD, x: cabCenterX, y: pY - boxH/2 + 1.5, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: Math.round(drawerBoxW), cutEspesor: 3, grainDirection: 'libre' });

    parts.push({ id: `${prefix}-rail-L`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drD, x: cabCenterX - drawerBoxW/2 - 6.5, y: pY, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-R`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drD, x: cabCenterX + drawerBoxW/2 + 6.5, y: pY, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  }

  return { parts, summary: 'Escritorio JADSI Industrial.', hasDoors: false, hasDrawers: true };
}
