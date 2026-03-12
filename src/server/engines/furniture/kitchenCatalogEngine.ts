
import { Part, FurnitureDimensions, FurnitureModel, FurnitureType } from '@/lib/types';

export function kitchenCatalogEngine(type: FurnitureType, dim: FurnitureDimensions): FurnitureModel {
  const T = dim.thickness || 18;
  const { width: W, height: H, depth: D, hasBack, hasShelf, hasShelf2 } = dim;
  
  const isTower = type.includes('pantry') || type.includes('microwave');
  const isBase = type.includes('base') && !isTower;
  const isWall = type.includes('wall');

  const sideGap = 2; 
  const topGap = 3;  
  const midGap = 2;  

  const sideH = Math.round(isBase ? (H - T) : (H - 2 * T));
  const innerW = Math.round(W - 2 * T);
  const parts: Part[] = [];

  parts.push({ id: 'base', name: 'Base Inferior', width: W, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: Math.round(W), cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'horizontal' });
  
  if (isBase) {
    parts.push({ id: 'ref-F', name: 'Amarre Frontal', width: innerW, height: T, depth: 60, x: W/2, y: H - T/2, z: D/2 - 30, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: 'ref-B', name: 'Amarre Trasero', width: innerW, height: 60, depth: T, x: W/2, y: H - 30, z: -D/2 + T/2, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' });
  } else {
    parts.push({ id: 'tapa', name: 'Tapa Superior', width: W, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static', cutLargo: Math.round(W), cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'horizontal' });
  }

  const lateralY = isBase ? (T + sideH/2) : H/2;
  parts.push({ id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: sideH, depth: D, x: T/2, y: lateralY, z: 0, type: 'static', cutLargo: sideH, cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'vertical' });
  parts.push({ id: 'lat-R', name: 'Lateral Derecho', width: T, height: sideH, depth: D, x: W - T/2, y: lateralY, z: 0, type: 'static', cutLargo: sideH, cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'vertical' });

  if (hasBack || isTower || isWall) {
    parts.push({ id: 'fondo', name: 'Fondo MDF 3mm', width: W - 2, height: H - 2, depth: 3, x: W/2, y: H/2, z: -D/2 - 1.5, type: 'static', cutLargo: Math.round(H - 2), cutAncho: Math.round(W - 2), cutEspesor: 3, grainDirection: 'libre' });
  }

  let hasDoors = false;
  let hasDrawers = false;

  const addHinges = (doorId: string, dH: number, dW: number, pivotX: number, dY: number) => {
    let count = dH <= 900 ? 2 : dH <= 1500 ? 3 : dH <= 2000 ? 4 : 5;
    if (dW > 600) count += 1;
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
    const boxW = Math.round((sectW - 2 * T) - (railCl * 2));
    const boxH = Math.round((fH - topGap) * 0.7);
    const aesW = Math.round(sectW - (sideGap * 2));
    const aesH = Math.round(fH - topGap);
    const boxInnerW = Math.round(boxW - 2 * T);

    parts.push({ id: `${prefix}-aes`, groupId: prefix, name: `Frente Cajón`, width: aesW, height: aesH, depth: T, x: x, y: y, z: D/2 + T/2, type: 'drawer', cutLargo: aesH, cutAncho: aesW, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-F`, groupId: prefix, name: `Frente Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: x, y: y, z: D/2 - T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-B`, groupId: prefix, name: `Trasera Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: x, y: y, z: D/2 - drD + T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-SL`, groupId: prefix, name: `Lateral Izq. Caja`, width: T, height: boxH, depth: drD, x: x - boxW/2 + T/2, y: y, z: D/2 - drD/2, type: 'drawer', cutLargo: Math.round(drD), cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-SR`, groupId: prefix, name: `Lateral Der. Caja`, width: T, height: boxH, depth: drD, x: x + boxW/2 - T/2, y: y, z: D/2 - drD/2, type: 'drawer', cutLargo: Math.round(drD), cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-bottom`, groupId: prefix, name: `Piso Cajón 3mm`, width: boxW, height: 3, depth: drD, x: x, y: y - boxH/2 + 1.5, z: D/2 - drD/2, type: 'drawer', cutLargo: Math.round(drD), cutAncho: Math.round(boxW), cutEspesor: 3, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-L`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drD, x: x - boxW/2 - 6.5, y: y, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-R`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drD, x: x + boxW/2 + 6.5, y: y, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  };

  switch (type) {
    case 'cabinet_pantry_60_2p': {
      hasDoors = true;
      const doorW = Math.round(W - sideGap * 2);
      const doorH = Math.round(H - topGap);
      const doorY = H / 2;
      parts.push({ id: 'door-main', name: 'Puerta Despensero Única', width: doorW, height: doorH, depth: T, x: W/2, y: doorY, z: D/2 + T/2, type: 'door-right', pivot: { x: W, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('door-main', doorH, doorW, W, doorY);
      for (let i = 1; i <= 4; i++) {
        parts.push({ id: `sh-${i}`, name: 'Estante Despensero', width: innerW, height: T, depth: D * 0.9, x: W/2, y: (H / 5) * i, z: 0, type: 'static', cutLargo: innerW, cutAncho: Math.round(D * 0.9), cutEspesor: T, grainDirection: 'horizontal' });
      }
      break;
    }
    case 'cabinet_microwave_60': {
      hasDoors = true;
      const bottomH = 750;
      const nicheH = 450;
      parts.push({ id: 'div-niche-B', name: 'Base Nicho Horno', width: innerW, height: T, depth: D, x: W/2, y: bottomH, z: 0, type: 'static', cutLargo: innerW, cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'horizontal' });
      parts.push({ id: 'div-niche-T', name: 'Techo Nicho Horno', width: innerW, height: T, depth: D, x: W/2, y: bottomH + nicheH, z: 0, type: 'static', cutLargo: innerW, cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'horizontal' });
      const dW_inf = Math.round(W - sideGap * 2);
      const dH_inf = Math.round(bottomH - T - topGap);
      const dY_inf = (bottomH + T) / 2;
      parts.push({ id: 'd-inf', name: 'Puerta Inferior Única', width: dW_inf, height: dH_inf, depth: T, x: W/2, y: dY_inf, z: D/2 + T/2, type: 'door-right', pivot: { x: W, y: dY_inf, z: D/2 }, cutLargo: dH_inf, cutAncho: dW_inf, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('d-inf', dH_inf, dW_inf, W, dY_inf);
      const dW_sup = Math.round(W - sideGap*2);
      const dH_sup = Math.round(H - (bottomH + nicheH + T) - topGap);
      const dY_sup = (H - T + (bottomH + nicheH + T)) / 2;
      parts.push({ id: 'd-sup', name: 'Puerta Superior Torre', width: dW_sup, height: dH_sup, depth: T, x: W/2, y: dY_sup, z: D/2 + T/2, type: 'door-right', pivot: { x: W, y: dY_sup, z: D/2 }, cutLargo: dH_sup, cutAncho: dW_sup, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('d-sup', dH_sup, dW_sup, W, dY_sup);
      parts.push({ id: 'sh-inf', name: 'Estante Inferior', width: innerW, height: T, depth: D*0.9, x: W/2, y: bottomH/2, z: 0, type: 'static', cutLargo: innerW, cutAncho: Math.round(D*0.9), cutEspesor: T, grainDirection: 'horizontal' });
      break;
    }
    case 'cabinet_base_140_3p3c':
    case 'cabinet_base_120_2p3c': {
      hasDoors = true; hasDrawers = true;
      const drSectW = 400;
      const doorAreaW = W - drSectW;
      const divX = doorAreaW;
      parts.push({ id: 'div-dr', name: 'Divisor Cajonera', width: T, height: sideH - T, depth: D * 0.9, x: divX - T/2, y: T + (sideH-T)/2, z: 0, type: 'static', cutLargo: Math.round(sideH - T), cutAncho: Math.round(D * 0.9), cutEspesor: T, grainDirection: 'vertical' });
      const drH = (H - T - 10) / 3;
      for (let i = 0; i < 3; i++) createDrawer(`dr-${i}`, W - drSectW/2, T + 5 + (i * drH) + drH/2, drSectW, drH, D - 50);
      const doorW = Math.round((doorAreaW - sideGap*2 - midGap) / 2);
      const doorH = Math.round(H - topGap);
      const doorY = H / 2;
      parts.push({ id: 'd-1', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, x: sideGap + doorW/2, y: doorY, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('d-1', doorH, doorW, 0, doorY);
      parts.push({ id: 'd-2', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, x: divX - sideGap - doorW/2, y: doorY, z: D/2 + T/2, type: 'door-right', pivot: { x: divX, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('d-2', doorH, doorW, divX, doorY);
      if (hasShelf) parts.push({ id: 'sh', name: 'Estante Interno', width: doorAreaW - T, height: T, depth: D * 0.9, x: doorAreaW / 2, y: H / 2, z: 0, type: 'static', cutLargo: Math.round(doorAreaW - T), cutAncho: Math.round(D * 0.9), cutEspesor: T, grainDirection: 'horizontal' });
      break;
    }
    case 'cabinet_wall_120_3p':
    case 'cabinet_wall_140_3p': {
      hasDoors = true;
      const divX = (W / 3) * 2;
      const doorW = Math.round((W - sideGap*2 - midGap*2) / 3);
      const doorH = Math.round(H - topGap);
      const doorY = H / 2;
      parts.push({ id: 'div', name: 'Divisor Estructural', width: T, height: sideH, depth: D * 0.9, x: divX, y: H/2, z: 0, type: 'static', cutLargo: Math.round(sideH), cutAncho: Math.round(D * 0.9), cutEspesor: T, grainDirection: 'vertical' });
      parts.push({ id: 'd-1', name: 'Puerta 1 (L)', width: doorW, height: doorH, depth: T, x: sideGap + doorW/2, y: doorY, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('d-1', doorH, doorW, 0, doorY);
      parts.push({ id: 'd-2', name: 'Puerta 2 (R)', width: doorW, height: doorH, depth: T, x: W/2, y: doorY, z: D/2 + T/2, type: 'door-right', pivot: { x: divX, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('d-2', doorH, doorW, divX, doorY);
      parts.push({ id: 'd-3', name: 'Puerta 3 (R)', width: doorW, height: doorH, depth: T, x: W - sideGap - doorW/2, y: doorY, z: D/2 + T/2, type: 'door-right', pivot: { x: W, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('d-3', doorH, doorW, W, doorY);
      if (hasShelf) parts.push({ id: 'sh-lg', name: 'Estante Grande', width: Math.round(divX - T), height: T, depth: D*0.9, x: divX/2, y: H/2, z: 0, type: 'static', cutLargo: Math.round(divX - T), cutAncho: Math.round(D*0.9), cutEspesor: T, grainDirection: 'horizontal' });
      if (hasShelf2) parts.push({ id: 'sh-sm', name: 'Estante Pequeño', width: Math.round((W - divX) - T), height: T, depth: D*0.9, x: (divX + W)/2, y: H/2, z: 0, type: 'static', cutLargo: Math.round((W - divX) - T), cutAncho: Math.round(D*0.9), cutEspesor: T, grainDirection: 'horizontal' });
      break;
    }
    default: {
      hasDoors = isWall || isTower || type.includes('60_1p') || type.includes('80_2p') || type.includes('2p');
      if (hasDoors) {
        const is2P = type.includes('80_2p') || type.includes('2p');
        const dW = Math.round(is2P ? (W - sideGap*2 - midGap)/2 : (W - sideGap*2));
        const dH = Math.round(H - topGap);
        const dY = H / 2;
        if (is2P) {
          parts.push({ id: 'door-L', name: 'Puerta Izquierda', width: dW, height: dH, depth: T, x: sideGap + dW/2, y: dY, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: dY, z: D/2 }, cutLargo: dH, cutAncho: dW, cutEspesor: T, grainDirection: 'vertical' });
          addHinges('door-L', dH, dW, 0, dY);
          parts.push({ id: 'door-R', name: 'Puerta Derecha', width: dW, height: dH, depth: T, x: W - sideGap - dW/2, y: dY, z: D/2 + T/2, type: 'door-right', pivot: { x: W, y: dY, z: D/2 }, cutLargo: dH, cutAncho: dW, cutEspesor: T, grainDirection: 'vertical' });
          addHinges('door-R', dH, dW, W, dY);
        } else {
          parts.push({ id: 'door', name: 'Puerta', width: dW, height: dH, depth: T, x: W/2, y: dY, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: dY, z: D/2 }, cutLargo: dH, cutAncho: dW, cutEspesor: T, grainDirection: 'vertical' });
          addHinges('door', dH, dW, 0, dY);
        }
      }
      if (hasShelf) {
        parts.push({ id: 'sh', name: 'Estante Interno', width: innerW, height: T, depth: D * 0.9, x: W/2, y: H/2, z: 0, type: 'static', cutLargo: innerW, cutAncho: Math.round(D * 0.9), cutEspesor: T, grainDirection: 'horizontal' });
      }
    }
  }

  return { parts, summary: `Catálogo JADSI Industrial.`, hasDoors, hasDrawers };
}
