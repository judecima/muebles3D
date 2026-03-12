
import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function kitchenCooktopEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T, hasBack, hasShelf } = dim;
  const sideH = Math.round(H - T);
  const innerW = Math.round(W - 2 * T);

  const parts: Part[] = [
    { id: 'base', name: 'Base Inferior', width: W, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: Math.round(W), cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: sideH, depth: D, x: T/2, y: T + sideH/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-R', name: 'Lateral Derecho', width: T, height: sideH, depth: D, x: W - T/2, y: T + sideH/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'vertical' },
    { id: 'ref-F', name: 'Refuerzo Frontal', width: innerW, height: T, depth: 60, x: W/2, y: H - T/2, z: D/2 - 30, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'ref-B', name: 'Refuerzo Trasero', width: innerW, height: 60, depth: T, x: W/2, y: H - 30, z: -D/2 + T/2, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' },
  ];

  if (hasBack) {
    parts.push({ id: 'fondo', name: 'Fondo MDF 3mm', width: W - 2, height: H - 2, depth: 3, x: W/2, y: H/2, z: -D/2 - 1.5, type: 'static', cutLargo: Math.round(H - 2), cutAncho: Math.round(W - 2), cutEspesor: 3, grainDirection: 'libre' });
  }

  const drFh = 180;
  const drW = innerW - 26;
  const drD = Math.round(D - 50);
  const pY = H - drFh / 2 - 2;
  const prefix = 'cook-dr';
  const boxH = Math.round(drFh * 0.45);
  const boxInnerW = Math.round(drW - 2 * T);

  parts.push({ id: `${prefix}-f`, groupId: prefix, name: 'Frente Estético Anafe', width: W - 4, height: drFh - 2, depth: T, x: W/2, y: pY, z: D/2 + T/2, type: 'drawer', cutLargo: Math.round(drFh - 2), cutAncho: Math.round(W - 4), cutEspesor: T, grainDirection: 'horizontal' });
  parts.push({ id: `${prefix}-box-F`, groupId: prefix, name: `Frente Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: W/2, y: pY, z: D/2 - T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
  parts.push({ id: `${prefix}-box-B`, groupId: prefix, name: `Trasera Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: W/2, y: pY, z: D/2 - drD + T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
  parts.push({ id: `${prefix}-box-SL`, groupId: prefix, name: `Lateral Izq. Caja`, width: T, height: boxH, depth: drD, x: W/2 - drW/2 + T/2, y: pY, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
  parts.push({ id: `${prefix}-box-SR`, groupId: prefix, name: `Lateral Der. Caja`, width: T, height: boxH, depth: drD, x: W/2 + drW/2 - T/2, y: pY, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
  parts.push({ id: `${prefix}-box-bottom`, groupId: prefix, name: `Piso Cajón 3mm`, width: drW, height: 3, depth: drD, x: W/2, y: pY - boxH/2 + 1.5, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: Math.round(drW), cutEspesor: 3, grainDirection: 'libre' });
  
  parts.push({ id: `${prefix}-rail-L`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drD, x: T + 6.5, y: pY, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  parts.push({ id: `${prefix}-rail-R`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drD, x: W - T - 6.5, y: pY, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });

  const doorH = Math.round(H - drFh - T - 8);
  const doorW = Math.round((W - 4) / 2);
  const doorY = T + doorH / 2 + 4;

  const addHinges = (doorId: string, dH: number, dW: number, pivotX: number, dY: number) => {
    let count = dH <= 900 ? 2 : 3;
    for (let i = 0; i < count; i++) {
      let posY = (dY - dH/2 + 100);
      if (count > 1) posY = (dY - dH/2 + 100) + (i * (dH - 200) / (count - 1));
      parts.push({
        id: `hinge-${doorId}-${i}`, name: 'Bisagra Euro 35mm', width: 35, height: 35, depth: 12,
        x: pivotX === 0 ? T : W - T, y: posY, z: D/2 - 10, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
      });
    }
  };

  parts.push({ id: 'door-L', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, x: doorW/2, y: doorY, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
  addHinges('L', doorH, doorW, 0, doorY);
  parts.push({ id: 'door-R', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, x: W - doorW/2, y: doorY, z: D/2 + T/2, type: 'door-right', pivot: { x: W, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
  addHinges('R', doorH, doorW, W, doorY);

  return { parts, summary: 'Porta-anafe JADSI Industrial.', hasDoors: true, hasDrawers: true };
}
