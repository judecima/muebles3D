import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function kitchenWallEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T, hasBack, hasShelf } = dim;
  const sideH = Math.round(H - 2 * T);
  const innerW = Math.round(W - 2 * T);

  const parts: Part[] = [
    { id: 'base', name: 'Base Inferior', width: W, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: Math.round(W), cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'tapa', name: 'Tapa Superior', width: W, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static', cutLargo: Math.round(W), cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: sideH, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: sideH, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'vertical' },
  ];

  if (hasBack) {
    parts.push({ id: 'fondo', name: 'Fondo MDF 3mm', width: W - 2, height: H - 2, depth: 3, x: W/2, y: H/2, z: -D/2 - 1.5, type: 'static', cutLargo: Math.round(H - 2), cutAncho: Math.round(W - 2), cutEspesor: 3, grainDirection: 'libre' });
  }

  if (hasShelf) {
    parts.push({ id: 'estante-interno', name: 'Estante Interno', width: innerW - 2, height: T, depth: D * 0.9, x: W/2, y: H/2, z: 0, type: 'static', cutLargo: Math.round(innerW - 2), cutAncho: Math.round(D * 0.9), cutEspesor: T, grainDirection: 'horizontal' });
  }

  const doorH = Math.round(H - 3); 
  const doorW = Math.round((W - 3) / 2); 
  const doorY = doorH / 2;
  
  const addHinges = (doorId: string, h: number, w: number, pivotX: number, dY: number) => {
    let count = 2;
    if (h > 900 && h <= 1500) count = 3;
    else if (h > 1500 && h <= 2000) count = 4;
    else if (h > 2000 && h <= 2400) count = 5;
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

  parts.push({ id: `wall-door-L`, name: `Puerta Izquierda`, width: doorW, height: doorH, depth: T, x: 1.5 + doorW/2, y: doorY, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
  addHinges('L', doorH, doorW, 0, doorY);
  parts.push({ id: `wall-door-R`, name: `Puerta Derecha`, width: doorW, height: doorH, depth: T, x: W - 1.5 - doorW/2, y: doorY, z: D/2 + T/2, type: 'door-right', pivot: { x: W, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
  addHinges('R', doorH, doorW, W, doorY);

  return { parts, summary: 'Alacena estructural con sándwich de tapas y bisagras calculadas.', hasDoors: true, hasDrawers: false };
}
