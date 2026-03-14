import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function kitchenBaseEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T, hasBack, hasShelf } = dim;
  const innerW = Math.round(W - 2 * T);
  const sideH = Math.round(H - T); 

  const parts: Part[] = [
    { id: 'base', name: 'Base Inferior', width: W, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: Math.round(W), cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: sideH, depth: D, x: T/2, y: T + sideH/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-R', name: 'Lateral Derecho', width: T, height: sideH, depth: D, x: W - T/2, y: T + sideH/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: Math.round(D), cutEspesor: T, grainDirection: 'vertical' },
    { id: 'amarre-F', name: 'Amarre Frontal', width: innerW, height: T, depth: 60, x: W/2, y: H - T/2, z: D/2 - 30, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'amarre-B', name: 'Amarre Trasero', width: innerW, height: 60, depth: T, x: W/2, y: H - 30, z: -D/2 + T/2, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' },
  ];

  if (hasBack) {
    parts.push({ id: 'fondo', name: 'Fondo MDF 3mm', width: W - 2, height: H - 2, depth: 3, x: W/2, y: H/2, z: -D/2 - 1.5, type: 'static', cutLargo: Math.round(H - 2), cutAncho: Math.round(W - 2), cutEspesor: 3, grainDirection: 'libre' });
  }

  if (hasShelf) {
    parts.push({ id: 'shelf', name: 'Estante Interno', width: innerW - 2, height: T, depth: D * 0.9, x: W/2, y: H/2, z: 0, type: 'static', cutLargo: Math.round(innerW - 2), cutAncho: Math.round(D * 0.9), cutEspesor: T, grainDirection: 'horizontal' });
  }

  const doorH = Math.round(H - 3); 
  const doorW = Math.round((W - 3) / 2); 
  const doorY = doorH / 2;

  const addHinges = (doorId: string, h: number, w: number, pivotX: number, dY: number) => {
    const count = h <= 900 ? 2 : h <= 1500 ? 3 : h <= 2000 ? 4 : 5;
    for (let i = 0; i < count; i++) {
      let posY = (dY - h/2 + 100);
      if (count > 1) posY = (dY - h/2 + 100) + (i * (h - 200) / (count - 1));
      parts.push({
        id: `hinge-${doorId}-${i}`, name: 'Bisagra Euro 35mm', width: 35, height: 35, depth: 12,
        x: pivotX === 0 ? T : W - T, y: posY, z: D/2 - 10, type: 'hardware', isHardware: true,
        cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
      });
    }
  };

  parts.push({ id: 'door-L', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, x: 1.5 + doorW/2, y: doorY, z: D/2 + T/2, type: 'door-left', pivot: { x: 0, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
  addHinges('L', doorH, doorW, 0, doorY);
  parts.push({ id: 'door-R', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, x: W - 1.5 - doorW/2, y: doorY, z: D/2 + T/2, type: 'door-right', pivot: { x: W, y: doorY, z: D/2 }, cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
  addHinges('R', doorH, doorW, W, doorY);

  return { parts, summary: 'Bajo mesada paramétrico con puertas overlay y estructura sándwich.', hasDoors: true, hasDrawers: false };
}
