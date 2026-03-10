import { Part, FurnitureDimensions, FurnitureModel, FurnitureType } from '@/lib/types';

/**
 * Motor de Catálogo Red Arquimax v15.2 Industrial
 * - Estructura Sándwich: Tapas W, Laterales H-2T.
 * - Lógica de Bisagras de Copa 35mm según altura/ancho.
 * - Rieles Telescópicos simétricos (13mm/13mm) contabilizados por Juego.
 * - Separación de frentes: 2mm lateral, 3mm superior.
 * - Cajones de 6 piezas sincronizados por groupId.
 */
export function kitchenCatalogEngine(type: FurnitureType, dim: FurnitureDimensions): FurnitureModel {
  const T = dim.thickness || 18;
  const { width: W, height: H, depth: D, hasBack, hasShelf, hasShelf2 } = dim;
  
  const isTower = type.includes('pantry') || type.includes('microwave');
  const isBase = type.includes('base') && !isTower;
  const isWall = type.includes('wall');

  const sideH = isBase ? (H - T) : (H - 2 * T);
  const innerW = W - 2 * T;
  const parts: Part[] = [];

  const sideGap = 2; 
  const topGap = 3;  
  const midGap = 2;  

  // 1. Estructura de Base (Ancho completo W)
  parts.push({ id: 'base', name: 'Base Inferior', width: W, height: T, depth: D, x: W / 2, y: T / 2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' });

  // 2. Estructura Superior
  if (isBase) {
    // Amarres internos para bajo mesada (posicionados entre laterales)
    parts.push({ id: 'amarre-F', name: 'Amarre Frontal', width: innerW, height: T, depth: 60, x: W / 2, y: H - T / 2, z: D / 2 - 30, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: 'amarre-B', name: 'Amarre Trasero', width: innerW, height: 60, depth: T, x: W / 2, y: H - 30, z: -D / 2 + T / 2, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' });
  } else {
    // Tapa completa para alacenas y torres (Ancho completo W)
    parts.push({ id: 'tapa', name: 'Tapa Superior', width: W, height: T, depth: D, x: W / 2, y: H - T / 2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' });
  }

  // 3. Laterales (Confinados entre tapas)
  const lateralY = isBase ? (T + sideH / 2) : H/2;
  const finalSideH = isBase ? sideH : (H - 2 * T);
  parts.push({ id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: finalSideH, depth: D, x: T / 2, y: lateralY, z: 0, type: 'static', cutLargo: finalSideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' });
  parts.push({ id: 'lat-R', name: 'Lateral Derecho', width: T, height: finalSideH, depth: D, x: W - T / 2, y: lateralY, z: 0, type: 'static', cutLargo: finalSideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' });

  if (hasBack || isTower || isWall) {
    parts.push({ id: 'fondo', name: 'Fondo MDF 3mm', width: W - 2, height: H - 2, depth: 3, x: W / 2, y: H / 2, z: -D / 2 - 1.5, type: 'static', cutLargo: H - 2, cutAncho: W - 2, cutEspesor: 3, grainDirection: 'libre' });
  }

  let hasDoors = false;
  let hasDrawers = false;

  const addHinges = (doorId: string, doorH: number, doorW: number, pivotX: number, doorY: number) => {
    let hingeCount = doorH <= 900 ? 2 : doorH <= 1500 ? 3 : doorH <= 2000 ? 4 : 5;
    if (doorW > 600) hingeCount += 1;

    for (let i = 0; i < hingeCount; i++) {
      let posY = doorY - doorH/2 + 100;
      if (hingeCount > 1) {
        posY = (doorY - doorH/2 + 100) + (i * (doorH - 200) / (hingeCount - 1));
      }
      parts.push({
        id: `hinge-${doorId}-${i}`,
        name: 'Bisagra Euro 35mm',
        width: 35, height: 35, depth: 12,
        x: pivotX === 0 ? T : (pivotX >= W - T ? W - T : pivotX),
        y: posY, z: D / 2 - 10,
        type: 'hardware', isHardware: true,
        cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
      });
    }
  };

  const createDrawer = (prefix: string, x: number, y: number, sectW: number, frontH: number, drawerDepth: number) => {
    const railClearance = 13; 
    const drawerBoxW = (sectW - 2*T) - (railClearance * 2);
    const boxH = (frontH - topGap) * 0.7;
    const aestheticW = sectW - (sideGap * 2);
    const aestheticH = frontH - topGap;

    // 1. Frente Estético (Tapa)
    parts.push({ id: `${prefix}-aesthetic`, groupId: prefix, name: `Frente Cajón`, width: aestheticW, height: aestheticH, depth: T, x: x, y: y, z: D / 2 + T / 2, type: 'drawer', cutLargo: aestheticH, cutAncho: aestheticW, cutEspesor: T, grainDirection: 'horizontal' });
    
    // 2. Caja Estructural (4 piezas + base)
    // Frente y Trasera de la caja (confinados entre laterales de caja)
    const boxInnerW = drawerBoxW - 2*T;
    parts.push({ id: `${prefix}-box-F`, groupId: prefix, name: `Frente Estructura Cajón`, width: boxInnerW, height: boxH, depth: T, x: x, y: y, z: D/2 - T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-box-B`, groupId: prefix, name: `Trasera Estructura Cajón`, width: boxInnerW, height: boxH, depth: T, x: x, y: y, z: D/2 - drawerDepth + T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'libre' });
    
    // Laterales de la caja
    parts.push({ id: `${prefix}-box-SL`, groupId: prefix, name: `Lateral Izq. Cajón`, width: T, height: boxH, depth: drawerDepth, x: x - drawerBoxW/2 + T/2, y: y, z: D/2 - drawerDepth/2, type: 'drawer', cutLargo: drawerDepth, cutAncho: boxH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-box-SR`, groupId: prefix, name: `Lateral Der. Cajón`, width: T, height: boxH, depth: drawerDepth, x: x + drawerBoxW/2 - T/2, y: y, z: D/2 - drawerDepth/2, type: 'drawer', cutLargo: drawerDepth, cutAncho: boxH, cutEspesor: T, grainDirection: 'libre' });
    
    // Piso de 3mm
    parts.push({ id: `${prefix}-box-bottom`, groupId: prefix, name: `Piso Cajón 3mm`, width: drawerBoxW, height: 3, depth: drawerDepth, x: x, y: y - boxH/2 + 1.5, z: D/2 - drawerDepth/2, type: 'drawer', cutLargo: drawerDepth, cutAncho: drawerBoxW, cutEspesor: 3, grainDirection: 'libre' });

    // 3. Rieles (Sincronizados)
    parts.push({ id: `${prefix}-rail-L`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drawerDepth, x: x - drawerBoxW/2 - 6.5, y: y, z: D/2 - drawerDepth/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-R`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drawerDepth, x: x + drawerBoxW/2 + 6.5, y: y, z: D/2 - drawerDepth/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  };

  switch (type) {
    case 'cabinet_base_120_2p3c':
    case 'cabinet_base_140_3p3c': {
      hasDoors = true; hasDrawers = true;
      const drawerSectW = 400;
      const doorAreaW = W - drawerSectW;
      const divX = doorAreaW;
      const divH = H - T; 
      parts.push({ id: 'div-drawer', name: 'Divisor Cajonera', width: T, height: divH - 20, depth: D * 0.9, x: divX - T / 2, y: T + (divH - 20) / 2, z: 0, type: 'static', cutLargo: divH - 20, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'vertical' });
      const drH = (H - T - 10) / 3;
      for (let i = 0; i < 3; i++) createDrawer(`dr-${i}`, W - drawerSectW / 2, T + 5 + (i * drH) + drH / 2, drawerSectW, drH, D - 50);
      const doorW = (doorAreaW - sideGap*2 - midGap) / 2;
      const doorH = H - topGap;
      const doorY = H / 2;
      parts.push({ id: 'door-1', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, x: sideGap + doorW/2, y: doorY, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('door-1', doorH, doorW, 0, doorY);
      parts.push({ id: 'door-2', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, x: divX - sideGap - doorW/2, y: doorY, z: D/2 + T/2, type: 'door-right', pivot: { x: divX, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('door-2', doorH, doorW, divX, doorY);
      if (hasShelf) parts.push({ id: 'shelf', name: 'Estante Interno', width: doorAreaW - T, height: T, depth: D * 0.9, x: doorAreaW / 2, y: H / 2, z: 0, type: 'static', cutLargo: doorAreaW - T, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'horizontal' });
      break;
    }
    case 'cabinet_wall_120_3p':
    case 'cabinet_wall_140_3p': {
      hasDoors = true;
      const doorW = (W - sideGap*2 - midGap*2) / 3;
      const doorH = H - topGap;
      const doorY = H / 2;
      const divX = (W / 3) * 2; 
      const divH = H - 2 * T;
      parts.push({ id: 'div-structural', name: 'Divisor Estructural', width: T, height: divH, depth: D * 0.9, x: divX, y: H / 2, z: 0, type: 'static', cutLargo: divH, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'vertical' });
      parts.push({ id: 'door-1', name: 'Puerta 1', width: doorW, height: doorH, depth: T, x: sideGap + doorW/2, y: doorY, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('door-1', doorH, doorW, 0, doorY);
      parts.push({ id: 'door-2', name: 'Puerta 2', width: doorW, height: doorH, depth: T, x: sideGap + doorW*1.5 + midGap, y: doorY, z: D/2 + T/2, type: 'door-right', pivot: { x: divX, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('door-2', doorH, doorW, divX, doorY);
      parts.push({ id: 'door-3', name: 'Puerta 3', width: doorW, height: doorH, depth: T, x: W - sideGap - doorW/2, y: doorY, z: D/2 + T/2, type: 'door-right', pivot: { x: W, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('door-3', doorH, doorW, W, doorY);
      if (hasShelf) parts.push({ id: 'shelf-lg', name: 'Estante Grande', width: divX - T, height: T, depth: D*0.9, x: divX/2, y: H/2, z: 0, type: 'static', cutLargo: divX - T, cutAncho: D*0.9, cutEspesor: T, grainDirection: 'horizontal' });
      if (hasShelf2) parts.push({ id: 'shelf-sm', name: 'Estante Pequeño', width: (W - divX) - T, height: T, depth: D*0.9, x: (divX + W)/2, y: H/2, z: 0, type: 'static', cutLargo: (W - divX) - T, cutAncho: D*0.9, cutEspesor: T, grainDirection: 'horizontal' });
      break;
    }
    default: {
      hasDoors = isWall || type.includes('pantry') || type.includes('microwave');
      if (hasDoors) {
        const doorW = W - sideGap*2;
        const doorH = H - topGap;
        const doorY = H / 2;
        parts.push({ id: 'door', name: 'Puerta', width: doorW, height: doorH, depth: T, x: W / 2, y: doorY, z: D / 2 + T / 2, type: 'door-left', pivot: { x: 0, y: doorY, z: D / 2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
        addHinges('door', doorH, doorW, 0, doorY);
      }
      if (hasShelf && !isTower) {
        parts.push({ id: 'shelf', name: 'Estante Interno', width: innerW, height: T, depth: D * 0.9, x: W / 2, y: H / 2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'horizontal' });
      }
    }
  }

  return { parts, summary: `Catálogo v15.2 Industrial. Sándwich de tapas W.`, hasDoors, hasDrawers };
}
