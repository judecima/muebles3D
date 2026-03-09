import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function deskEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, depth: D, thickness: T } = dim;
  const H = 750;

  const cabinetW = 400;
  const cabinetInnerW = cabinetW - 2 * T;
  const cabinetCenterX = W - cabinetW / 2;
  const cabinetTopY = H - T;

  const parts: Part[] = [
    { id: 'desk-top', name: 'Tapa Escritorio', width: W, height: T, depth: D, x: W / 2, y: H - T / 2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T },
    { id: 'desk-leg-L', name: 'Lateral Izquierdo Escritorio', width: T, height: H - T, depth: D, x: T / 2, y: (H - T) / 2, z: 0, type: 'static', cutLargo: H - T, cutAncho: D, cutEspesor: T },
    { id: 'desk-back', name: 'Panel Trasero Estructural', width: W - cabinetW - T, height: H * 0.4, depth: T, x: (W - cabinetW) / 2, y: H - T - (H * 0.4) / 2, z: -D / 4, type: 'static', cutLargo: W - cabinetW - T, cutAncho: H * 0.4, cutEspesor: T },

    { id: 'mod-lat-L', name: 'Lateral Izquierdo Módulo', width: T, height: H - T, depth: D, x: W - cabinetW + T / 2, y: (H - T) / 2, z: 0, type: 'static', cutLargo: H - T, cutAncho: D, cutEspesor: T },
    { id: 'mod-lat-R', name: 'Lateral Derecho Módulo', width: T, height: H - T, depth: D, x: W - T / 2, y: (H - T) / 2, z: 0, type: 'static', cutLargo: H - T, cutAncho: D, cutEspesor: T },
    { id: 'mod-base', name: 'Base Inferior Módulo', width: cabinetInnerW, height: T, depth: D, x: cabinetCenterX, y: T / 2, z: 0, type: 'static', cutLargo: cabinetInnerW, cutAncho: D, cutEspesor: T },
    { id: 'mod-back', name: 'Panel Trasero Módulo', width: cabinetInnerW, height: H - 2 * T, depth: 3, x: cabinetCenterX, y: H / 2, z: -D / 2 + 1.5, type: 'static', cutLargo: H - 2 * T, cutAncho: cabinetInnerW, cutEspesor: 3 },
    { id: 'mod-rail-top', name: 'Travesaño Superior Módulo', width: cabinetInnerW, height: T, depth: 100, x: cabinetCenterX, y: cabinetTopY - T / 2, z: D / 2 - 50, type: 'static', cutLargo: cabinetInnerW, cutAncho: 100, cutEspesor: T },
  ];

  const drawerW = cabinetInnerW - 26;
  const drawerD = D - 40;
  const drawerBoxH = 140;
  const frontH = 190;
  const startY = H - T - 10; 

  for (let i = 0; i < 2; i++) {
    const posY = startY - (frontH / 2) - (i * (frontH + 10));
    const prefix = `desk-drawer-${i}`;
    
    parts.push({ id: `${prefix}-front`, name: `Frente Cajón ${i + 1}`, width: cabinetW - 4, height: frontH, depth: T, x: cabinetCenterX, y: posY, z: D / 2 + T / 2, type: 'drawer', cutLargo: frontH, cutAncho: cabinetW - 4, cutEspesor: T });
    parts.push({ id: `${prefix}-side-L`, name: `Lateral Izq. Cajón ${i + 1}`, width: T, height: drawerBoxH, depth: drawerD, x: cabinetCenterX - drawerW / 2 + T / 2, y: posY, z: D / 2 - drawerD / 2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T });
    parts.push({ id: `${prefix}-side-R`, name: `Lateral Der. Cajón ${i + 1}`, width: T, height: drawerBoxH, depth: drawerD, x: cabinetCenterX + drawerW / 2 - T / 2, y: posY, z: D / 2 - drawerD / 2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T });
    parts.push({ id: `${prefix}-back`, name: `Trasera Cajón ${i + 1}`, width: drawerW - 2 * T, height: drawerBoxH, depth: T, x: cabinetCenterX, y: posY, z: D / 2 - drawerD + T / 2, type: 'drawer', cutLargo: drawerW - 2 * T, cutAncho: drawerBoxH, cutEspesor: T });
    parts.push({ id: `${prefix}-bottom`, name: `Base Cajón ${i + 1}`, width: drawerW - 2 * T, height: 3, depth: drawerD - T, x: cabinetCenterX, y: posY - drawerBoxH / 2 + 1.5, z: D / 2 - drawerD / 2 + T / 2, type: 'drawer', cutLargo: drawerD - T, cutAncho: drawerW - 2 * T, cutEspesor: 3 });

    parts.push({ id: `${prefix}-rail-L`, name: `Riel Telescópico ${drawerD}mm`, width: 13, height: 35, depth: drawerD, x: W - cabinetW + T + 6.5, y: posY, z: D / 2 - drawerD / 2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0 });
    parts.push({ id: `${prefix}-rail-R`, name: `Riel Telescópico ${drawerD}mm`, width: 13, height: 35, depth: drawerD, x: W - T - 6.5, y: posY, z: D / 2 - drawerD / 2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0 });
  }

  return { parts, summary: 'Escritorio profesional Red Arquimax con módulo de cajonera estructural.' };
}
