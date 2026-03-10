import { Part, FurnitureDimensions, FurnitureModel, FurnitureType } from '@/lib/types';

/**
 * Motor de Catálogo Red Arquimax v13.4 Industrial
 * - Estructura Sándwich: Tapas superior/inferior de ancho completo (W).
 * - Laterales y Divisores apoyados entre tapas (H - 2T).
 * - Bisagras visuales y funcionales calculadas por puerta.
 * - Descuento simétrico de rieles (13mm/13mm).
 */
export function kitchenCatalogEngine(type: FurnitureType, dim: FurnitureDimensions): FurnitureModel {
  const T = dim.thickness || 18;
  const { width: W, height: H, depth: D, hasBack, hasShelf, hasShelf2 } = dim;
  
  // Altura neta de laterales y divisores (apoyados entre tapas)
  const sideH = H - 2 * T;
  const innerW = W - 2 * T;
  const parts: Part[] = [];

  // Constantes de Huelgo (Gaps) Industriales v13.4
  const sideGap = 2; // 2mm exterior
  const topGap = 3;  // 3mm superior
  const midGap = 2;  // 2mm entre piezas

  // 1. Estructura Sándwich (Tapas Externas)
  // Base Inferior (Ancho completo)
  parts.push({ id: 'base', name: 'Base Inferior', width: W, height: T, depth: D, x: W / 2, y: T / 2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' });

  const isTower = type.includes('pantry') || type.includes('microwave');
  const isBase = type.includes('base') && !isTower;

  if (isBase) {
    // Bajos llevan amarres superiores que apoyan sobre los laterales
    parts.push({ id: 'amarre-F', name: 'Amarre Frontal', width: W, height: T, depth: 60, x: W / 2, y: H - T / 2, z: D / 2 - 30, type: 'static', cutLargo: W, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: 'amarre-B', name: 'Amarre Trasero', width: W, height: 60, depth: T, x: W / 2, y: H - 30, z: -D / 2 + T / 2, type: 'static', cutLargo: W, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' });
  } else {
    // Alacenas y Torres llevan tapa superior sólida (Ancho completo)
    parts.push({ id: 'tapa', name: 'Tapa Superior', width: W, height: T, depth: D, x: W / 2, y: H - T / 2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' });
  }

  // Laterales apoyados entre tapas
  parts.push({ id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: sideH, depth: D, x: T / 2, y: H / 2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' });
  parts.push({ id: 'lat-R', name: 'Lateral Derecho', width: T, height: sideH, depth: D, x: W - T / 2, y: H / 2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' });

  // Fondo (MDF 3mm)
  if (hasBack || type.includes('pantry') || type.includes('wall')) {
    parts.push({ id: 'fondo', name: 'Fondo MDF 3mm', width: W - 2, height: H - 2, depth: 3, x: W / 2, y: H / 2, z: -D / 2 - 1.5, type: 'static', cutLargo: H - 2, cutAncho: W - 2, cutEspesor: 3, grainDirection: 'libre' });
  }

  let hasDoors = false;
  let hasDrawers = false;

  // Helper para crear bisagras visuales
  const addHinges = (doorId: string, doorH: number, pivotX: number, doorY: number) => {
    const hingeCount = doorH <= 600 ? 2 : doorH <= 1200 ? 3 : 4;
    for (let i = 0; i < hingeCount; i++) {
      let relativeY = 70;
      if (hingeCount > 2) {
        relativeY = 70 + (i * (doorH - 140) / (hingeCount - 1));
      } else {
        relativeY = i === 0 ? 70 : doorH - 70;
      }
      
      const globalY = (doorY - doorH / 2) + relativeY;

      parts.push({
        id: `hinge-${doorId}-${i}`,
        name: 'Bisagra Interna 90°',
        width: 35, height: 35, depth: 12,
        x: pivotX === 0 ? T : (pivotX >= W - T ? W - T : pivotX),
        y: globalY,
        z: D / 2 - 10,
        type: 'hardware',
        isHardware: true,
        cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
      });
    }
  };

  // Helper de Cajón Simétrico Industrial (13mm/13mm)
  const createDrawer = (prefix: string, x: number, y: number, sectW: number, frontH: number, drawerDepth: number) => {
    const railClearance = 13; 
    const drawerBoxW = (sectW - 2*T) - (railClearance * 2);
    const boxH = (frontH - topGap) * 0.7;
    
    const aestheticW = sectW - (sideGap * 2);
    const aestheticH = frontH - topGap;

    // Frente Estético (Overlay)
    parts.push({ 
      id: `${prefix}-aesthetic`, groupId: prefix, name: `Frente Cajón Estético`, 
      width: aestheticW, height: aestheticH, depth: T, 
      x: x, y: y, z: D / 2 + T / 2, 
      type: 'drawer', cutLargo: aestheticH, cutAncho: aestheticW, cutEspesor: T, grainDirection: 'horizontal' 
    });

    // Estructura de Caja
    parts.push({ id: `${prefix}-box-F`, groupId: prefix, name: `Frente Estructura Cajón`, width: drawerBoxW - 2*T, height: boxH, depth: T, x: x, y: y, z: D/2 - T/2, type: 'drawer', cutLargo: drawerBoxW - 2*T, cutAncho: boxH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-box-B`, groupId: prefix, name: `Trasera Estructura Cajón`, width: drawerBoxW - 2*T, height: boxH, depth: T, x: x, y: y, z: D/2 - drawerDepth + T/2, type: 'drawer', cutLargo: drawerBoxW - 2*T, cutAncho: boxH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-box-SL`, groupId: prefix, name: `Lateral Izq. Cajón`, width: T, height: boxH, depth: drawerDepth, x: x - drawerBoxW/2 + T/2, y: y, z: D/2 - drawerDepth/2, type: 'drawer', cutLargo: drawerDepth, cutAncho: boxH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-box-SR`, groupId: prefix, name: `Lateral Der. Cajón`, width: T, height: boxH, depth: drawerDepth, x: x + drawerBoxW/2 - T/2, y: y, z: D/2 - drawerDepth/2, type: 'drawer', cutLargo: drawerDepth, cutAncho: boxH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-box-bottom`, groupId: prefix, name: `Piso Cajón 3mm`, width: drawerBoxW - 2*T, height: 3, depth: drawerDepth, x: x, y: y - boxH/2 + 1.5, z: D/2 - drawerDepth/2, type: 'drawer', cutLargo: drawerDepth, cutAncho: drawerBoxW - 2*T, cutEspesor: 3, grainDirection: 'libre' });

    // Herrajes: Rieles Telescópicos
    parts.push({ id: `${prefix}-rail-L`, groupId: prefix, name: `Riel Telescópico ${drawerDepth}mm`, width: 13, height: 35, depth: drawerDepth, x: x - drawerBoxW/2 - 6.5, y: y, z: D/2 - drawerDepth/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-R`, groupId: prefix, name: `Riel Telescópico ${drawerDepth}mm`, width: 13, height: 35, depth: drawerDepth, x: x + drawerBoxW/2 + 6.5, y: y, z: D/2 - drawerDepth/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  };

  switch (type) {
    case 'cabinet_base_120_2p3c':
    case 'cabinet_base_140_3p3c': {
      hasDoors = true;
      hasDrawers = true;
      const drawerSectW = 400;
      const doorAreaW = W - drawerSectW;
      const divDrawerX = doorAreaW;
      
      // Divisor apoyado entre tapas
      parts.push({ id: 'div-drawer', name: 'Divisor Cajonera', width: T, height: sideH, depth: D * 0.9, x: divDrawerX - T / 2, y: H / 2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'vertical' });

      const drH = (H - T - 10) / 3;
      for (let i = 0; i < 3; i++) {
        createDrawer(`dr-${i}`, W - drawerSectW / 2, T + 5 + (i * drH) + drH / 2, drawerSectW, drH, D - 50);
      }

      const doorW = (doorAreaW - sideGap*2 - midGap) / 2;
      const doorH = H - topGap;
      const doorY = H / 2;
      
      parts.push({ id: 'door-1', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, x: sideGap + doorW/2, y: doorY, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('door-1', doorH, 0, doorY);
      
      parts.push({ id: 'door-2', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, x: doorAreaW - sideGap - doorW/2, y: doorY, z: D/2 + T/2, type: 'door-right', pivot: { x: divDrawerX, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('door-2', doorH, divDrawerX, doorY);
      
      if (hasShelf) {
        parts.push({ id: 'shelf', name: 'Estante Interno', width: doorAreaW - T, height: T, depth: D * 0.9, x: doorAreaW / 2, y: H / 2, z: 0, type: 'static', cutLargo: doorAreaW - T, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'horizontal' });
      }
      break;
    }

    case 'cabinet_wall_120_3p':
    case 'cabinet_wall_140_3p': {
      hasDoors = true;
      const doorW = (W - sideGap*2 - midGap*2) / 3;
      const doorH = H - topGap;
      const doorY = H / 2;
      const divX = (W / 3) * 2; 
      
      // Divisor apoyado entre tapas
      parts.push({ id: 'div-structural', name: 'Divisor Estructural', width: T, height: sideH, depth: D * 0.9, x: divX, y: H / 2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'vertical' });

      // Pivotaje L-R-R
      parts.push({ id: 'door-1', name: 'Puerta 1', width: doorW, height: doorH, depth: T, x: sideGap + doorW/2, y: doorY, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('door-1', doorH, 0, doorY);

      parts.push({ id: 'door-2', name: 'Puerta 2', width: doorW, height: doorH, depth: T, x: sideGap + doorW*1.5 + midGap, y: doorY, z: D/2 + T/2, type: 'door-right', pivot: { x: divX, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('door-2', doorH, divX, doorY);

      parts.push({ id: 'door-3', name: 'Puerta 3', width: doorW, height: doorH, depth: T, x: W - sideGap - doorW/2, y: doorY, z: D/2 + T/2, type: 'door-right', pivot: { x: W, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('door-3', doorH, W, doorY);

      if (hasShelf) parts.push({ id: 'shelf-lg', name: 'Estante Grande', width: divX - T, height: T, depth: D*0.9, x: divX/2, y: H/2, z: 0, type: 'static', cutLargo: divX - T, cutAncho: D*0.9, cutEspesor: T, grainDirection: 'horizontal' });
      if (hasShelf2) parts.push({ id: 'shelf-sm', name: 'Estante Pequeño', width: (W - divX) - T, height: T, depth: D*0.9, x: (divX + W)/2, y: H/2, z: 0, type: 'static', cutLargo: (W - divX) - T, cutAncho: D*0.9, cutEspesor: T, grainDirection: 'horizontal' });
      break;
    }

    case 'cabinet_base_single_60_1p':
    case 'cabinet_wall_60_1p': {
      hasDoors = true;
      const doorW = W - sideGap*2;
      const doorH = H - topGap;
      const doorY = H / 2;
      parts.push({ id: 'door', name: 'Puerta', width: doorW, height: doorH, depth: T, x: W / 2, y: doorY, z: D / 2 + T / 2, type: 'door-left', pivot: { x: 0, y: doorY, z: D / 2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('door', doorH, 0, doorY);
      
      if (hasShelf) parts.push({ id: 'shelf', name: 'Estante Interno', width: innerW, height: T, depth: D * 0.9, x: W / 2, y: H / 2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'horizontal' });
      break;
    }

    case 'cabinet_pantry_60_2p': {
      hasDoors = true;
      const doorAreaH = H - topGap;
      const doorH = (doorAreaH - midGap) / 2;
      const doorW = W - sideGap*2;
      
      const doorY_U = H - doorH/2 - topGap;
      const doorY_D = doorH/2;

      parts.push({ id: 'door-U', name: 'Puerta Superior', width: doorW, height: doorH, depth: T, x: W/2, y: doorY_U, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: doorY_U, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('door-U', doorH, 0, doorY_U);

      parts.push({ id: 'door-D', name: 'Puerta Inferior', width: doorW, height: doorH, depth: T, x: W/2, y: doorY_D, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: doorY_D, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('door-D', doorH, 0, doorY_D);

      for (let i = 1; i <= 4; i++) {
        parts.push({ id: `fixed-shelf-${i}`, name: `Estante Fijo ${i}`, width: innerW, height: T, depth: D * 0.95, x: W / 2, y: (H / 5) * i, z: 0, type: 'static', cutLargo: innerW, cutAncho: D * 0.95, cutEspesor: T, grainDirection: 'horizontal' });
      }
      break;
    }

    case 'cabinet_microwave_60': {
      hasDoors = true;
      const lowerSectH = H * 0.4;
      const doorW = W - sideGap*2;
      const doorH = lowerSectH - topGap;
      const doorY = lowerSectH / 2;

      parts.push({ id: 'door-low', name: 'Puerta Inferior', width: doorW, height: doorH, depth: T, x: W/2, y: doorY, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('door-low', doorH, 0, doorY);

      parts.push({ id: 'shelf-micro', name: 'Base Microondas', width: innerW, height: T, depth: D, x: W/2, y: lowerSectH, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' });
      parts.push({ id: 'shelf-top', name: 'Techo Microondas', width: innerW, height: T, depth: D, x: W/2, y: lowerSectH + 500, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' });
      break;
    }

    case 'cabinet_base_double_80_2p': {
      hasDoors = true;
      const doorW = (W - sideGap*2 - midGap) / 2;
      const doorH = H - topGap;
      const doorY = H / 2;
      parts.push({ id: 'door-L', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, x: sideGap + doorW / 2, y: doorY, z: D / 2 + T / 2, type: 'door-left', pivot: { x: 0, y: doorY, z: D / 2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('door-L', doorH, 0, doorY);

      parts.push({ id: 'door-R', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, x: W - sideGap - doorW / 2, y: doorY, z: D / 2 + T / 2, type: 'door-right', pivot: { x: W, y: doorY, z: D / 2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      addHinges('door-R', doorH, W, doorY);

      if (hasShelf) parts.push({ id: 'shelf', name: 'Estante Interno', width: innerW, height: T, depth: D * 0.9, x: W / 2, y: H / 2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'horizontal' });
      break;
    }
  }

  return { 
    parts, 
    summary: `Módulo v13.4 Industrial. Estructura sándwich (tapas full-width) con bisagras visuales.`, 
    hasDoors, 
    hasDrawers 
  };
}
