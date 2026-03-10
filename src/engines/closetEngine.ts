import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Placard Red Arquimax v15.1
 * Estructura sándwich reforzada y huelgo de cajones de 3mm.
 */
export function closetEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  
  const drawerSectionH = 500; 
  const doorSectionH = H - drawerSectionH;
  const sideH = H - 2 * T;
  const innerW = W - 2 * T;

  const parts: Part[] = [
    { id: 'base-inf', name: 'Base Inferior', width: W, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'tapa-sup', name: 'Tapa Superior', width: W, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: sideH, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: sideH, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'divisor-hor', name: 'Estante Divisor', width: innerW, height: T, depth: D, x: W/2, y: drawerSectionH, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
  ];

  parts.push({ id: 'fondo', name: 'Fondo MDF 3mm', width: W, height: H, depth: 3, x: W/2, y: H/2, z: -D/2 - 1.5, type: 'static', cutLargo: H, cutAncho: W, cutEspesor: 3, grainDirection: 'libre' });

  if (H > 1800) {
    parts.push({ id: 'hanger-bar', name: 'Barral de Colgar', width: innerW, height: 25, depth: 25, x: W/2, y: 1700, z: 0, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  }

  const doorW = W / 2 - 2;
  const doorH = doorSectionH - 5;
  const doorY = drawerSectionH + (doorSectionH / 2);

  const addHinges = (doorId: string, h: number, w: number, pivotX: number, dY: number) => {
    let count = h <= 900 ? 2 : h <= 1500 ? 3 : h <= 2000 ? 4 : 5;
    if (w > 600) count += 1;

    for (let i = 0; i < count; i++) {
      const posY = (dY - h/2 + 100) + (i * (h - 200) / (count - 1));
      parts.push({
        id: `hinge-${doorId}-${i}`, name: 'Bisagra Euro 35mm', width: 35, height: 35, depth: 12,
        x: pivotX === 0 ? T : W - T, y: posY, z: D/2 - 10, type: 'hardware', isHardware: true,
        cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
      });
    }
  };

  parts.push({ id: 'closet-door-L', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, x: doorW / 2, y: doorY, z: D / 2 + T / 2, type: 'door-left', pivot: { x: 0, y: doorY, z: D / 2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
  addHinges('L', doorH, doorW, 0, doorY);
  parts.push({ id: 'closet-door-R', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, x: W - doorW / 2, y: doorY, z: D / 2 + T / 2, type: 'door-right', pivot: { x: W, y: doorY, z: D / 2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
  addHinges('R', doorH, doorW, W, doorY);

  const drawerGap = 3; // Gap estandarizado
  const drFrontH = (drawerSectionH - T - (2 * drawerGap)) / 2;
  const drW = innerW - 26;
  const drD = D - 50;

  for (let i = 0; i < 2; i++) {
    const pY = T + 5 + (i * (drFrontH + drawerGap)) + (drFrontH / 2);
    const prefix = `closet-dr-${i}`;
    parts.push({ id: `${prefix}-front`, name: `Frente Cajón`, width: W - 4, height: drFrontH, depth: T, x: W/2, y: pY, z: D/2 + T/2, type: 'drawer', cutLargo: drFrontH, cutAncho: W-4, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-rail-L`, name: `Rieles Telescópicos (Juego)`, width: 13, height: 35, depth: drD, x: T + 6.5, y: pY, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-R`, name: `Rieles Telescópicos (Juego)`, width: 13, height: 35, depth: drD, x: W - T - 6.5, y: pY, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  }

  return { parts, summary: 'Placard v15.1: Estructura sándwich, gap 3mm.', hasDoors: true, hasDrawers: true };
}
