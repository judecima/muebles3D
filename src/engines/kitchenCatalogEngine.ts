import { Part, FurnitureDimensions, FurnitureModel, FurnitureType } from '@/lib/types';

/**
 * Motor de Catálogo Red Arquimax v15.8 Industrial
 * - Estructura Sándwich (Base/Tapa ancho W).
 * - Cajones de 6 piezas sincronizadas con huelgo 3mm.
 * - Descuento simétrico de 13mm para rieles.
 * - Restauración de estantes para Torres (Despensero/Horno).
 */
export function kitchenCatalogEngine(type: FurnitureType, dim: FurnitureDimensions): FurnitureModel {
  const T = dim.thickness || 18;
  const { width: W, height: H, depth: D, hasBack, hasShelf, hasShelf2 } = dim;
  
  const isTower = type.includes('pantry') || type.includes('microwave');
  const isBase = type.includes('base') && !isTower;
  const isWall = type.includes('wall');

  const sideGap = 2; // Luz lateral industrial
  const topGap = 3;  // Luz superior industrial
  const midGap = 2;  // Luz entre frentes

  // Estructura Sándwich: Tapas de ancho completo W
  const sideH = isBase ? (H - T) : (H - 2 * T);
  const innerW = W - 2 * T;
  const parts: Part[] = [];

  // 1. Paneles Horizontales Estructurales (Sándwich)
  parts.push({ id: 'base', name: 'Base Inferior', width: W, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' });
  
  if (isBase) {
    // Para bajos, los refuerzos van entre los laterales (W-2T) y al ras de la altura
    parts.push({ id: 'ref-F', name: 'Amarre Frontal', width: innerW, height: T, depth: 60, x: W/2, y: H - T/2, z: D/2 - 30, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: 'ref-B', name: 'Amarre Trasero', width: innerW, height: 60, depth: T, x: W/2, y: H - 30, z: -D/2 + T/2, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' });
  } else {
    parts.push({ id: 'tapa', name: 'Tapa Superior', width: W, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' });
  }

  // 2. Paneles Verticales (Confinados)
  const lateralY = isBase ? (T + sideH/2) : H/2;
  parts.push({ id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: sideH, depth: D, x: T/2, y: lateralY, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' });
  parts.push({ id: 'lat-R', name: 'Lateral Derecho', width: T, height: sideH, depth: D, x: W - T/2, y: lateralY, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' });

  if (hasBack || isTower || isWall) {
    parts.push({ id: 'fondo', name: 'Fondo MDF 3mm', width: W - 2, height: H - 2, depth: 3, x: W/2, y: H/2, z: -D/2 - 1.5, type: 'static', cutLargo: H - 2, cutAncho: W - 2, cutEspesor: 3, grainDirection: 'libre' });
  }

  let hasDoors = false;
  let hasDrawers = false;

  const calculateHinges = (doorH: number, doorW: number) => {
    let count = doorH <= 900 ? 2 : doorH <= 1500 ? 3 : doorH <= 2000 ? 4 : 5;
    if (doorW > 600) count += 1;
    return count;
  };

  const addHinges = (doorId: string, dH: number, dW: number, pivotX: number, dY: number) => {
    const count = calculateHinges(dH, dW);
    for (let i = 0; i < count; i++) {
      let posY = (dY - dH/2 + 100);
      if (count > 1) posY = (dY - dH/2 + 100) + (i * (dH - 200) / (count - 1));
      parts.push({
        id: `hinge-${doorId}-${i}`, name: 'Bisagra Euro 35mm', width: 35, height: 35, depth: 12,
        x: pivotX === 0 ? T : (pivotX >= W - T ? W - T : pivotX), y: posY, z: D/2 - 10,
        type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
      });
    }
  };

  const createDrawer = (prefix: string, x: number, y: number, sectW: number, fH: number, drD: number) => {
    const railCl = 13;
    const boxW = (sectW - 2 * T) - (railCl * 2);
    const boxH = (fH - topGap) * 0.7;
    const aesW = sectW - (sideGap * 2);
    const aesH = fH - topGap;
    const boxInnerW = boxW - 2 * T;

    // Cajón de 6 piezas sincronizadas
    parts.push({ id: `${prefix}-aes`, groupId: prefix, name: `Frente Cajón`, width: aesW, height: aesH, depth: T, x: x, y: y, z: D/2 + T/2, type: 'drawer', cutLargo: aesH, cutAncho: aesW, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-F`, groupId: prefix, name: `Frente Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: x, y: y, z: D/2 - T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-B`, groupId: prefix, name: `Trasera Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: x, y: y, z: D/2 - drD + T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-SL`, groupId: prefix, name: `Lateral Izq. Caja`, width: T, height: boxH, depth: drD, x: x - boxW/2 + T/2, y: y, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-SR`, groupId: prefix, name: `Lateral Der. Caja`, width: T, height: boxH, depth: drD, x: x + boxW/2 - T/2, y: y, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-bottom`, groupId: prefix, name: `Piso Cajón 3mm`, width: boxW, height: 3, depth: drD, x: x, y: y - boxH/2 + 1.5, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: boxW, cutEspesor: 3, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-L`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drD, x: x - boxW/2 - 6.5, y: y, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-R`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drD, x: x + boxW/2 + 6.5, y: y, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  };

  switch (type) {
    case 'cabinet_base_140_3p3c':
    case 'cabinet_base_120_2p3c': {
      hasDoors = true; hasDrawers = true;
      const drSectW = 400;
      const doorAreaW = W - drSectW;
      const divX = doorAreaW;
      // Divisor interno canalizado para refuerzo (H-2T)
      parts.push({ id: 'div-dr', name: 'Divisor Cajonera', width: T, height: sideH - T, depth: D * 0.9, x: divX - T/2, y: T + (sideH-T)/2, z: 0, type: 'static', cutLargo: sideH - T, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'vertical' });
      const drH = (H - T - 10) / 3;
      for (let i = 0; i < 3; i++) createDrawer(`dr-${i}`, W - drSectW/2, T + 5 + (i * drH) + drH/2, drSectW, drH, D - 50);
      const doorW = (doorAreaW - sideGap*2 - midGap) / 2;
      const doorH = H - topGap;
      const doorY = H / 2;
      parts.push({ id: 'd-1', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, x: sideGap + doorW/2, y: doorY, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('d-1', doorH, doorW, 0, doorY);
      parts.push({ id: 'd-2', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, x: divX - sideGap - doorW/2, y: doorY, z: D/2 + T/2, type: 'door-right', pivot: { x: divX, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('d-2', doorH, doorW, divX, doorY);
      if (hasShelf) parts.push({ id: 'sh', name: 'Estante Interno', width: doorAreaW - T, height: T, depth: D * 0.9, x: doorAreaW / 2, y: H / 2, z: 0, type: 'static', cutLargo: doorAreaW - T, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'horizontal' });
      break;
    }
    case 'cabinet_wall_120_3p':
    case 'cabinet_wall_140_3p': {
      hasDoors = true;
      const divX = (W / 3) * 2;
      const doorW = (W - sideGap*2 - midGap*2) / 3;
      const doorH = H - topGap;
      const doorY = H / 2;
      parts.push({ id: 'div', name: 'Divisor Estructural', width: T, height: sideH, depth: D * 0.9, x: divX, y: H/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'vertical' });
      parts.push({ id: 'd-1', name: 'Puerta 1 (L)', width: doorW, height: doorH, depth: T, x: sideGap + doorW/2, y: doorY, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('d-1', doorH, doorW, 0, doorY);
      parts.push({ id: 'd-2', name: 'Puerta 2 (R)', width: doorW, height: doorH, depth: T, x: W/2, y: doorY, z: D/2 + T/2, type: 'door-right', pivot: { x: divX, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('d-2', doorH, doorW, divX, doorY);
      parts.push({ id: 'd-3', name: 'Puerta 3 (R)', width: doorW, height: doorH, depth: T, x: W - sideGap - doorW/2, y: doorY, z: D/2 + T/2, type: 'door-right', pivot: { x: W, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('d-3', doorH, doorW, W, doorY);
      if (hasShelf) parts.push({ id: 'sh-lg', name: 'Estante Grande', width: divX - T, height: T, depth: D*0.9, x: divX/2, y: H/2, z: 0, type: 'static', cutLargo: divX - T, cutAncho: D*0.9, cutEspesor: T, grainDirection: 'horizontal' });
      if (hasShelf2) parts.push({ id: 'sh-sm', name: 'Estante Pequeño', width: (W - divX) - T, height: T, depth: D*0.9, x: (divX + W)/2, y: H/2, z: 0, type: 'static', cutLargo: (W - divX) - T, cutAncho: D*0.9, cutEspesor: T, grainDirection: 'horizontal' });
      break;
    }
    default: {
      hasDoors = isWall || isTower || type.includes('60_1p') || type.includes('80_2p');
      if (hasDoors) {
        const dW = type.includes('80_2p') ? (W - sideGap*2 - midGap)/2 : (W - sideGap*2);
        const dH = H - topGap;
        const dY = H / 2;
        if (type.includes('80_2p')) {
          parts.push({ id: 'door-L', name: 'Puerta Izquierda', width: dW, height: dH, depth: T, x: sideGap + dW/2, y: dY, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: dY, z: D/2 }, cutLargo: dH, cutAncho: dW, cutEspesor: T, grainDirection: 'vertical' });
          addHinges('door-L', dH, dW, 0, dY);
          parts.push({ id: 'door-R', name: 'Puerta Derecha', width: dW, height: dH, depth: T, x: W - sideGap - dW/2, y: dY, z: D/2 + T/2, type: 'door-right', pivot: { x: W, y: dY, z: D/2 }, cutLargo: dH, cutAncho: dW, cutEspesor: T, grainDirection: 'vertical' });
          addHinges('door-R', dH, dW, W, dY);
        } else {
          parts.push({ id: 'door', name: 'Puerta', width: dW, height: dH, depth: T, x: W/2, y: dY, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: dY, z: D/2 }, cutLargo: dH, cutAncho: dW, cutEspesor: T, grainDirection: 'vertical' });
          addHinges('door', dH, dW, 0, dY);
        }
      }
      // Estantes para Torres (Despensero y Microondas)
      if (hasShelf) {
        if (isTower) {
          const numShelves = 4;
          for (let i = 1; i <= numShelves; i++) {
            parts.push({
              id: `sh-${i}`, name: 'Estante Interno', width: innerW, height: T, depth: D * 0.9,
              x: W/2, y: (H / (numShelves + 1)) * i, z: 0, type: 'static',
              cutLargo: innerW, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'horizontal'
            });
          }
        } else {
          parts.push({ id: 'sh', name: 'Estante Interno', width: innerW, height: T, depth: D * 0.9, x: W/2, y: H/2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'horizontal' });
        }
      }
    }
  }

  return { parts, summary: `Catálogo v15.8 Industrial: Estructura sándwich de apoyo real.`, hasDoors, hasDrawers };
}
