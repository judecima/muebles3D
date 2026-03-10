import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Placard Red Arquimax v15.2 Industrial
 * Estructura Sándwich + Cajones de 6 piezas sincronizadas + Bisagras Normativas.
 */
export function closetEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  
  const drSectH = 500; 
  const doorSectH = H - drSectH;
  const sideH = H - 2 * T;
  const innerW = W - 2 * T;

  const parts: Part[] = [
    { id: 'base', name: 'Base Inferior', width: W, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'tapa', name: 'Tapa Superior', width: W, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: sideH, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-R', name: 'Lateral Derecho', width: T, height: sideH, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'div-H', name: 'Divisor Horizontal', width: innerW, height: T, depth: D, x: W/2, y: drSectH, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'fondo', name: 'Fondo MDF 3mm', width: W - 2, height: H - 2, depth: 3, x: W/2, y: H/2, z: -D/2 - 1.5, type: 'static', cutLargo: H - 2, cutAncho: W - 2, cutEspesor: 3, grainDirection: 'libre' },
  ];

  if (H > 1800) {
    parts.push({ id: 'bar', name: 'Barral', width: innerW, height: 25, depth: 25, x: W/2, y: 1700, z: 0, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  }

  // Puertas con Bisagras Normativas
  const doorW = (W - 4) / 2;
  const doorH = doorSectH - 5;
  const doorY = drSectH + (doorSectH / 2);

  const addHinges = (doorId: string, dH: number, dW: number, pivotX: number, dY: number) => {
    let count = dH <= 900 ? 2 : dH <= 1500 ? 3 : dH <= 2000 ? 4 : 5;
    if (dW > 600) count += 1;
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

  // Cajones sincronizados
  const gap = 3;
  const drFh = (drSectH - T - 10) / 2;
  const railCl = 13;
  const drBoxW = innerW - (railCl * 2);
  const drD = D - 50;

  for (let i = 0; i < 2; i++) {
    const pY = T + 5 + (i * (drFh + gap)) + drFh / 2;
    const prefix = `cl-dr-${i}`;
    const boxH = drFh * 0.7;
    const boxInnerW = drBoxW - 2 * T;

    parts.push({ id: `${prefix}-f`, groupId: prefix, name: `Frente Cajón`, width: W - 4, height: drFh - 2, depth: T, x: W/2, y: pY, z: D/2 + T/2, type: 'drawer', cutLargo: drFh - 2, cutAncho: W - 4, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-F`, groupId: prefix, name: `Frente Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: W/2, y: pY, z: D/2 - T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-B`, groupId: prefix, name: `Trasera Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: W/2, y: pY, z: D/2 - drD + T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-SL`, groupId: prefix, name: `Lateral Izq. Caja`, width: T, height: boxH, depth: drD, x: W/2 - drBoxW/2 + T/2, y: pY, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-SR`, groupId: prefix, name: `Lateral Der. Caja`, width: T, height: boxH, depth: drD, x: W/2 + drBoxW/2 - T/2, y: pY, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-bottom`, groupId: prefix, name: `Piso Cajón 3mm`, width: drBoxW, height: 3, depth: drD, x: W/2, y: pY - boxH/2 + 1.5, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: drBoxW, cutEspesor: 3, grainDirection: 'libre' });
    
    parts.push({ id: `${prefix}-rail-L`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drD, x: T + railCl/2, y: pY, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-R`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drD, x: W - T - railCl/2, y: pY, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  }

  return { parts, summary: 'Placard v15.2 Industrial: Estructura sándwich, cajones sincronizados y huelgo 3mm.', hasDoors: true, hasDrawers: true };
}