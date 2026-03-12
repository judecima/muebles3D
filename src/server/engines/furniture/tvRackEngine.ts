
import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function tvRackEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, depth: D, thickness: T } = dim;
  const H = 500; 
  const sideH = Math.round(H - 2 * T);
  const innerW = Math.round(W - 2 * T);

  const parts: Part[] = [
    { id: 'base', name: 'Base Inferior', width: W, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: Math.round(W), cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'tapa', name: 'Tapa Superior', width: W, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static', cutLargo: Math.round(W), cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: sideH, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-R', name: 'Lateral Derecho', width: T, height: sideH, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'vertical' },
    { id: 'div', name: 'Divisor Central', width: T, height: sideH, depth: D * 0.9, x: W/2, y: H/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: Math.round(D * 0.9), cutEspesor: T, grainDirection: 'vertical' },
  ];

  const sectW = Math.round((W - 3 * T) / 2);
  const drD = Math.round(D - 50);
  const railCl = 13;
  const drBoxW = Math.round(sectW - (railCl * 2));
  const boxH = Math.round((sideH - 10) * 0.7);

  for (let i = 0; i < 2; i++) {
    const pX = i === 0 ? T + sectW / 2 : W - T - sectW / 2;
    const prefix = `rack-dr-${i}`;
    const boxInnerW = Math.round(drBoxW - 2 * T);

    parts.push({ id: `${prefix}-f`, groupId: prefix, name: `Frente Cajón`, width: sectW - 4, height: sideH - 4, depth: T, x: pX, y: H/2, z: D/2 + T/2, type: 'drawer', cutLargo: Math.round(sideH - 4), cutAncho: Math.round(sectW - 4), cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-F`, groupId: prefix, name: `Frente Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: pX, y: H/2, z: D/2 - T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-B`, groupId: prefix, name: `Trasera Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: pX, y: H/2, z: D/2 - drD + T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-SL`, groupId: prefix, name: `Lateral Izq. Caja`, width: T, height: boxH, depth: drD, x: pX - drBoxW/2 + T/2, y: H/2, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-SR`, groupId: prefix, name: `Lateral Der. Caja`, width: T, height: boxH, depth: drD, x: pX + drBoxW/2 - T/2, y: H/2, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-bottom`, groupId: prefix, name: `Piso Cajón 3mm`, width: drBoxW, height: 3, depth: drD, x: pX, y: H/2 - boxH/2 + 1.5, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: Math.round(drBoxW), cutEspesor: 3, grainDirection: 'libre' });

    parts.push({ id: `${prefix}-rail-L`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drD, x: pX - drBoxW/2 - 6.5, y: H/2, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-R`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drD, x: pX + drBoxW/2 + 6.5, y: H/2, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  }

  return { parts, summary: 'Rack TV JADSI Industrial.', hasDoors: false, hasDrawers: true };
}
