import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Escritorio Red Arquimax v14.0
 * Sistema constructivo: Sándwich para el módulo cajonero.
 */
export function deskEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, depth: D, thickness: T } = dim;
  const H = 750;

  const cabinetW = 400;
  const cabinetInnerW = cabinetW - 2 * T;
  const cabinetCenterX = W - cabinetW / 2;
  const cabinetH = H - T;
  const cabinetSideH = cabinetH - T; 

  const parts: Part[] = [
    { id: 'desk-top', name: 'Tapa Escritorio', width: W, height: T, depth: D, x: W / 2, y: H - T / 2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'desk-leg-L', name: 'Lateral Izquierdo Escritorio', width: T, height: H - T, depth: D, x: T / 2, y: (H - T) / 2, z: 0, type: 'static', cutLargo: H - T, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'desk-back', name: 'Panel Trasero Estructural', width: W - cabinetW - T, height: H * 0.4, depth: T, x: (W - cabinetW) / 2, y: H - T - (H * 0.4) / 2, z: -D / 4, type: 'static', cutLargo: W - cabinetW - T, cutAncho: H * 0.4, cutEspesor: T, grainDirection: 'horizontal' },

    // Módulo Cajonero Tipo Sándwich
    { id: 'mod-base', name: 'Base Inferior Módulo', width: cabinetW, height: T, depth: D, x: cabinetCenterX, y: T / 2, z: 0, type: 'static', cutLargo: cabinetW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'mod-lat-L', name: 'Lateral Izquierdo Módulo', width: T, height: cabinetSideH, depth: D, x: W - cabinetW + T / 2, y: cabinetH / 2, z: 0, type: 'static', cutLargo: cabinetSideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'mod-lat-R', name: 'Lateral Derecho Módulo', width: T, height: cabinetSideH, depth: D, x: W - T / 2, y: cabinetH / 2, z: 0, type: 'static', cutLargo: cabinetSideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'mod-back', name: 'Panel Trasero Módulo', width: cabinetW - 2, height: cabinetH - 2, depth: 3, x: cabinetCenterX, y: cabinetH / 2, z: -D / 2 + 1.5, type: 'static', cutLargo: cabinetH - 2, cutAncho: cabinetW - 2, cutEspesor: 3, grainDirection: 'libre' },
    { id: 'mod-rail-top', name: 'Travesaño Superior Módulo', width: cabinetInnerW, height: T, depth: 100, x: cabinetCenterX, y: cabinetH - T / 2, z: D / 2 - 50, type: 'static', cutLargo: cabinetInnerW, cutAncho: 100, cutEspesor: T, grainDirection: 'horizontal' },
  ];

  const drawerW = cabinetInnerW - 26;
  const drawerD = D - 40;
  const drawerBoxH = 140;
  const frontH = 190;
  const startY = cabinetH - 10; 

  for (let i = 0; i < 2; i++) {
    const posY = startY - (frontH / 2) - (i * (frontH + 10));
    const prefix = `desk-drawer-${i}`;
    
    // 1. Frente Estético
    parts.push({ id: `${prefix}-front-aesthetic`, groupId: prefix, name: `Frente Estético Cajón ${i + 1}`, width: cabinetW - 4, height: frontH, depth: T, x: cabinetCenterX, y: posY, z: D / 2 + T / 2, type: 'drawer', cutLargo: frontH, cutAncho: cabinetW - 4, cutEspesor: T, grainDirection: 'horizontal' });
    
    // 2. Frente Estructura de Caja
    parts.push({ id: `${prefix}-box-front`, groupId: prefix, name: `Frente Estruct. Caja ${i+1}`, width: drawerW - 2*T, height: drawerBoxH, depth: T, x: cabinetCenterX, y: posY, z: D/2 - T/2, type: 'drawer', cutLargo: drawerW - 2*T, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'horizontal' });

    // 3. Laterales de Caja
    parts.push({ id: `${prefix}-box-side-L`, groupId: prefix, name: `Lateral Izq. Caja ${i + 1}`, width: T, height: drawerBoxH, depth: drawerD, x: cabinetCenterX - drawerW / 2 + T / 2, y: posY, z: D / 2 - drawerD / 2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-side-R`, groupId: prefix, name: `Lateral Der. Caja ${i + 1}`, width: T, height: drawerBoxH, depth: drawerD, x: cabinetCenterX + drawerW / 2 - T / 2, y: posY, z: D / 2 - drawerD / 2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'vertical' });
    
    // 4. Trasera de Caja
    parts.push({ id: `${prefix}-box-back`, groupId: prefix, name: `Trasera Caja ${i + 1}`, width: drawerW - 2 * T, height: drawerBoxH, depth: T, x: cabinetCenterX, y: posY, z: D / 2 - drawerD + T / 2, type: 'drawer', cutLargo: drawerW - 2 * T, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'horizontal' });
    
    // 5. Piso de Caja
    parts.push({ id: `${prefix}-box-bottom`, groupId: prefix, name: `Base Caja ${i + 1}`, width: drawerW - 2 * T, height: 3, depth: drawerD, x: cabinetCenterX, y: posY - drawerBoxH / 2 + 1.5, z: D / 2 - drawerD / 2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerW - 2 * T, cutEspesor: 3, grainDirection: 'libre' });
  }

  return { parts, summary: 'Escritorio profesional. Estructura de apoyo sándwich en cajonera.', hasDoors: false, hasDrawers: true };
}
