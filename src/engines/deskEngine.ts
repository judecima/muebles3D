import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Escritorio Red Arquimax v15.0
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
    { id: 'mod-base', name: 'Base Inferior Módulo', width: cabinetW, height: T, depth: D, x: cabinetCenterX, y: T / 2, z: 0, type: 'static', cutLargo: cabinetW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'mod-lat-L', name: 'Lateral Izquierdo Módulo', width: T, height: cabinetSideH, depth: D, x: W - cabinetW + T / 2, y: cabinetH / 2, z: 0, type: 'static', cutLargo: cabinetSideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'mod-lat-R', name: 'Lateral Derecho Módulo', width: T, height: cabinetSideH, depth: D, x: W - T / 2, y: cabinetH / 2, z: 0, type: 'static', cutLargo: cabinetSideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
  ];

  const drawerW = cabinetInnerW - 26;
  const drawerD = D - 40;
  const frontH = 190;
  const startY = cabinetH - 10; 

  for (let i = 0; i < 2; i++) {
    const posY = startY - (frontH / 2) - (i * (frontH + 10));
    const prefix = `desk-dr-${i}`;
    parts.push({ id: `${prefix}-front`, name: `Frente Cajón`, width: cabinetW - 4, height: frontH, depth: T, x: cabinetCenterX, y: posY, z: D / 2 + T / 2, type: 'drawer', cutLargo: frontH, cutAncho: cabinetW - 4, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-rail-L`, name: `Rieles Telescópicos (Juego)`, width: 13, height: 35, depth: drawerD, x: cabinetCenterX - drawerW/2 - 6.5, y: posY, z: D/2 - drawerD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-R`, name: `Rieles Telescópicos (Juego)`, width: 13, height: 35, depth: drawerD, x: cabinetCenterX + drawerW/2 + 6.5, y: posY, z: D/2 - drawerD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  }

  return { parts, summary: 'Escritorio v15.0: Apoyo estructural sándwich y rieles contabilizados por par.', hasDoors: false, hasDrawers: true };
}