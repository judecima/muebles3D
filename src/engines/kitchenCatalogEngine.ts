import { Part, FurnitureDimensions, FurnitureModel, FurnitureType } from '@/lib/types';

/**
 * Motor de Catálogo Red Arquimax v13.1 Industrial
 * Genera módulos con huelgos de precisión: 2mm laterales y 3mm superior.
 * Lógica de Pivotaje: Izquierda-Derecha-Derecha.
 * Estantes Independientes para módulos de 3 puertas.
 */
export function kitchenCatalogEngine(type: FurnitureType, dim: FurnitureDimensions): FurnitureModel {
  const T = dim.thickness || 18;
  const { width: W, height: H, depth: D, hasBack, hasShelf, hasShelf2 } = dim;
  const innerW = W - 2 * T;
  const parts: Part[] = [];

  // Constantes de Huelgo (Gaps) Industriales
  const sideGap = 2; // 2mm exterior
  const topGap = 3;  // 3mm superior
  const midGap = 2;  // 2mm entre piezas

  // 1. Estructura Básica (Laterales)
  parts.push({ id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: T / 2, y: H / 2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' });
  parts.push({ id: 'lat-R', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T / 2, y: H / 2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' });

  const isBase = type.includes('base') || type.includes('pantry') || type.includes('microwave');
  
  if (isBase) {
    parts.push({ id: 'base', name: 'Base Inferior', width: innerW, height: T, depth: D, x: W / 2, y: T / 2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: 'amarre-F', name: 'Amarre Frontal', width: innerW, height: T, depth: 60, x: W / 2, y: H - T / 2, z: D / 2 - 30, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: 'amarre-B', name: 'Amarre Trasero', width: innerW, height: 60, depth: T, x: W / 2, y: H - 30, z: -D / 2 + T / 2, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' });
  } else {
    parts.push({ id: 'base', name: 'Base Inferior', width: innerW, height: T, depth: D, x: W / 2, y: T / 2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: 'tapa', name: 'Tapa Superior', width: innerW, height: T, depth: D, x: W / 2, y: H - T / 2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' });
  }

  // Fondo (MDF 3mm)
  if (hasBack || type.includes('pantry') || type.includes('wall')) {
    parts.push({ id: 'fondo', name: 'Fondo MDF 3mm', width: W - 2, height: H - 2, depth: 3, x: W / 2, y: H / 2, z: -D / 2 - 1.5, type: 'static', cutLargo: H - 2, cutAncho: W - 2, cutEspesor: 3, grainDirection: 'libre' });
  }

  let hasDoors = false;
  let hasDrawers = false;

  // Helper de Cajón Simétrico (13mm/13mm)
  const createDrawer = (prefix: string, x: number, y: number, sectW: number, frontH: number, drawerDepth: number) => {
    const railClearance = 13; 
    const drawerBoxW = (sectW - 2*T) - (railClearance * 2);
    const boxH = (frontH - topGap) * 0.7;
    
    const aestheticW = sectW - (sideGap * 2);
    const aestheticH = frontH - topGap;

    parts.push({ 
      id: `${prefix}-aesthetic`, groupId: prefix, name: `Frente Cajón Estético`, 
      width: aestheticW, height: aestheticH, depth: T, 
      x: x, y: y, z: D / 2 + T / 2, 
      type: 'drawer', cutLargo: aestheticH, cutAncho: aestheticW, cutEspesor: T, grainDirection: 'horizontal' 
    });

    parts.push({ id: `${prefix}-box-F`, groupId: prefix, name: `Frente Estructura Cajón`, width: drawerBoxW - 2*T, height: boxH, depth: T, x: x, y: y, z: D/2 - T/2, type: 'drawer', cutLargo: drawerBoxW - 2*T, cutAncho: boxH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-box-B`, groupId: prefix, name: `Trasera Estructura Cajón`, width: drawerBoxW - 2*T, height: boxH, depth: T, x: x, y: y, z: D/2 - drawerDepth + T/2, type: 'drawer', cutLargo: drawerBoxW - 2*T, cutAncho: boxH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-box-SL`, groupId: prefix, name: `Lateral Izq. Cajón`, width: T, height: boxH, depth: drawerDepth, x: x - drawerBoxW/2 + T/2, y: y, z: D/2 - drawerDepth/2, type: 'drawer', cutLargo: drawerDepth, cutAncho: boxH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-box-SR`, groupId: prefix, name: `Lateral Der. Cajón`, width: T, height: boxH, depth: drawerDepth, x: x + drawerBoxW/2 - T/2, y: y, z: D/2 - drawerDepth/2, type: 'drawer', cutLargo: drawerDepth, cutAncho: boxH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-box-bottom`, groupId: prefix, name: `Piso Cajón 3mm`, width: drawerBoxW - 2*T, height: 3, depth: drawerDepth, x: x, y: y - boxH/2 + 1.5, z: D/2 - drawerDepth/2, type: 'drawer', cutLargo: drawerDepth, cutAncho: drawerBoxW - 2*T, cutEspesor: 3, grainDirection: 'libre' });

    // Rieles posicionado en el centro del huelgo de 13mm
    parts.push({ id: `${prefix}-rail-L`, groupId: prefix, name: `Riel Telescópico ${drawerDepth}mm`, width: 13, height: 35, depth: drawerDepth, x: x - drawerBoxW/2 - 6.5, y: y, z: D/2 - drawerDepth/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-R`, groupId: prefix, name: `Riel Telescópico ${drawerDepth}mm`, width: 13, height: 35, depth: drawerDepth, x: x + drawerBoxW/2 + 6.5, y: y, z: D/2 - drawerDepth/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  };

  switch (type) {
    case 'cabinet_base_120_2p3c':
    case 'cabinet_base_140_3p3c': {
      hasDoors = true;
      hasDrawers = true;
      const isLarge = type.includes('140');
      const drawerSectW = 400;
      const doorAreaW = W - drawerSectW;
      
      const divDrawerX = doorAreaW;
      parts.push({ id: 'div-drawer', name: 'Divisor Cajonera', width: T, height: H - T, depth: D * 0.9, x: divDrawerX - T / 2, y: H / 2 + T / 2, z: 0, type: 'static', cutLargo: H - T, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'vertical' });

      const drH = (H - T - 10) / 3;
      for (let i = 0; i < 3; i++) {
        createDrawer(`dr-${i}`, W - drawerSectW / 2, T + 5 + (i * drH) + drH / 2, drawerSectW, drH, D - 50);
      }

      if (isLarge) {
        const doorW = (doorAreaW - 4 - 4) / 3;
        const doorH = H - topGap;
        const divHingeX = (doorAreaW / 3) * 2; // Solo 1 divisor para bisagras de P2

        parts.push({ id: 'div-hinge', name: 'Divisor Estructural', width: T, height: H - T, depth: D * 0.9, x: divHingeX, y: H / 2 + T / 2, z: 0, type: 'static', cutLargo: H - T, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'vertical' });

        // Pivotaje L-R-R
        parts.push({ id: 'door-1', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, x: sideGap + doorW/2, y: H/2, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: H/2, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
        parts.push({ id: 'door-2', name: 'Puerta Central', width: doorW, height: doorH, depth: T, x: sideGap + doorW*1.5 + midGap, y: H/2, z: D/2 + T/2, type: 'door-right', pivot: { x: divHingeX, y: H/2, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
        parts.push({ id: 'door-3', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, x: sideGap + doorW*2.5 + midGap*2, y: H/2, z: D/2 + T/2, type: 'door-right', pivot: { x: divDrawerX, y: H/2, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
        
        if (hasShelf) parts.push({ id: 'shelf-lg', name: 'Estante Grande', width: divHingeX - T, height: T, depth: D*0.9, x: divHingeX/2, y: H/2, z: 0, type: 'static', cutLargo: divHingeX - T, cutAncho: D*0.9, cutEspesor: T, grainDirection: 'horizontal' });
        if (hasShelf2) parts.push({ id: 'shelf-sm', name: 'Estante Pequeño', width: (divDrawerX - divHingeX) - T, height: T, depth: D*0.9, x: (divHingeX + divDrawerX)/2, y: H/2, z: 0, type: 'static', cutLargo: (divDrawerX - divHingeX) - T, cutAncho: D*0.9, cutEspesor: T, grainDirection: 'horizontal' });
      } else {
        const doorW = (doorAreaW - 4 - 2) / 2;
        const doorH = H - topGap;
        parts.push({ id: 'door-1', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, x: sideGap + doorW/2, y: H/2, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: H/2, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
        parts.push({ id: 'door-2', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, x: doorAreaW - sideGap - doorW/2, y: H/2, z: D/2 + T/2, type: 'door-right', pivot: { x: divDrawerX, y: H/2, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
        if (hasShelf) parts.push({ id: 'shelf', name: 'Estante Interno', width: doorAreaW - T, height: T, depth: D * 0.9, x: doorAreaW / 2, y: H / 2, z: 0, type: 'static', cutLargo: doorAreaW - T, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'horizontal' });
      }
      break;
    }

    case 'cabinet_wall_120_3p':
    case 'cabinet_wall_140_3p': {
      hasDoors = true;
      const doorW = (W - 4 - 4) / 3;
      const doorH = H - topGap;
      const divX = (W / 3) * 2; // Solo 1 divisor estructural para P2
      
      parts.push({ id: 'div-hinge', name: 'Divisor Estructural', width: T, height: H - 2*T, depth: D * 0.9, x: divX, y: H / 2, z: 0, type: 'static', cutLargo: H - 2*T, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'vertical' });

      // Pivotaje L-R-R
      parts.push({ id: 'door-1', name: 'Puerta 1', width: doorW, height: doorH, depth: T, x: sideGap + doorW/2, y: H/2, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: H/2, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      parts.push({ id: 'door-2', name: 'Puerta 2', width: doorW, height: doorH, depth: T, x: sideGap + doorW*1.5 + midGap, y: H/2, z: D/2 + T/2, type: 'door-right', pivot: { x: divX, y: H/2, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      parts.push({ id: 'door-3', name: 'Puerta 3', width: doorW, height: doorH, depth: T, x: W - sideGap - doorW/2, y: H/2, z: D/2 + T/2, type: 'door-right', pivot: { x: W, y: H/2, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });

      if (hasShelf) parts.push({ id: 'shelf-lg', name: 'Estante Grande', width: divX - T, height: T, depth: D*0.9, x: divX/2, y: H/2, z: 0, type: 'static', cutLargo: divX - T, cutAncho: D*0.9, cutEspesor: T, grainDirection: 'horizontal' });
      if (hasShelf2) parts.push({ id: 'shelf-sm', name: 'Estante Pequeño', width: (W - divX) - T, height: T, depth: D*0.9, x: (divX + W)/2, y: H/2, z: 0, type: 'static', cutLargo: (W - divX) - T, cutAncho: D*0.9, cutEspesor: T, grainDirection: 'horizontal' });
      break;
    }

    case 'cabinet_base_single_60_1p':
    case 'cabinet_wall_60_1p': {
      hasDoors = true;
      const doorW = W - sideGap*2;
      const doorH = H - topGap;
      parts.push({ id: 'door', name: 'Puerta', width: doorW, height: doorH, depth: T, x: W / 2, y: H / 2, z: D / 2 + T / 2, type: 'door-left', pivot: { x: 0, y: H / 2, z: D / 2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      if (hasShelf) parts.push({ id: 'shelf', name: 'Estante Interno', width: innerW - 2, height: T, depth: D * 0.9, x: W / 2, y: H / 2, z: 0, type: 'static', cutLargo: innerW - 2, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'horizontal' });
      break;
    }

    case 'cabinet_pantry_60_2p': {
      hasDoors = true;
      const doorH = (H - topGap - midGap) / 2;
      const doorW = W - sideGap*2;
      parts.push({ id: 'door-U', name: 'Puerta Superior', width: doorW, height: doorH, depth: T, x: W/2, y: H - doorH/2 - topGap, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: H - doorH/2, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      parts.push({ id: 'door-D', name: 'Puerta Inferior', width: doorW, height: doorH, depth: T, x: W/2, y: doorH/2, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: doorH/2, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
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
      parts.push({ id: 'door-low', name: 'Puerta Inferior', width: doorW, height: doorH, depth: T, x: W/2, y: lowerSectH/2, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: lowerSectH/2, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      parts.push({ id: 'shelf-micro', name: 'Base Microondas', width: innerW, height: T, depth: D, x: W/2, y: lowerSectH, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' });
      parts.push({ id: 'shelf-top', name: 'Techo Microondas', width: innerW, height: T, depth: D, x: W/2, y: lowerSectH + 500, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' });
      break;
    }

    case 'cabinet_base_double_80_2p': {
      hasDoors = true;
      const doorW = (W - sideGap*2 - midGap) / 2;
      const doorH = H - topGap;
      parts.push({ id: 'door-L', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, x: sideGap + doorW / 2, y: H / 2, z: D / 2 + T / 2, type: 'door-left', pivot: { x: 0, y: H / 2, z: D / 2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      parts.push({ id: 'door-R', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, x: W - sideGap - doorW / 2, y: H / 2, z: D / 2 + T / 2, type: 'door-right', pivot: { x: W, y: H / 2, z: D / 2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      if (hasShelf) parts.push({ id: 'shelf', name: 'Estante Interno', width: innerW - 2, height: T, depth: D * 0.9, x: W / 2, y: H / 2, z: 0, type: 'static', cutLargo: innerW - 2, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'horizontal' });
      break;
    }

    case 'cabinet_hood_60': {
      hasDoors = true;
      const doorW = W - sideGap*2;
      const doorH = H - topGap;
      parts.push({ id: 'door-flip', name: 'Puerta Rebatible', width: doorW, height: doorH, depth: T, x: W / 2, y: H / 2, z: D / 2 + T / 2, type: 'door-flip', pivot: { x: W/2, y: H, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'horizontal' });
      break;
    }
  }

  return { 
    parts, 
    summary: `Módulo v13.1 Industrial. Doble control de estantes habilitado. Pivotaje L-R-R.`, 
    hasDoors, 
    hasDrawers 
  };
}
