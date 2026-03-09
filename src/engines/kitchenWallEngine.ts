import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function kitchenWallEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T, hasBack } = dim;

  const parts: Part[] = [
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'base', name: 'Base Inferior', width: W - 2*T, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: W - 2*T, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'tapa', name: 'Tapa Superior', width: W - 2*T, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static', cutLargo: W - 2*T, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
  ];

  if (hasBack) {
    parts.push({ 
      id: 'fondo', 
      name: 'Fondo MDF 3mm', 
      width: W, height: H, depth: 3, 
      x: W/2, y: H/2, z: -D/2 - 1.5, 
      type: 'static', cutLargo: H, cutAncho: W, cutEspesor: 3, grainDirection: 'libre' 
    });
  }

  const doorH = H - 4;
  const doorW = W / 2 - 2;
  const doorY = H / 2;
  const hingesPerDoor = doorH <= 600 ? 2 : doorH <= 1200 ? 3 : 4;

  const doorTypes: ('door-left' | 'door-right')[] = ['door-left', 'door-right'];

  doorTypes.forEach((type, idx) => {
    const isLeft = type === 'door-left';
    parts.push({ 
      id: `wall-door-${isLeft ? 'L' : 'R'}`, 
      name: `Puerta ${isLeft ? 'Izquierda' : 'Derecha'}`, 
      width: doorW, height: doorH, depth: T, 
      x: isLeft ? doorW / 2 : W - doorW / 2, 
      y: doorY, z: D / 2 + T / 2, 
      type: type, 
      pivot: { x: isLeft ? 0 : W, y: doorY, z: D / 2 },
      cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical',
      hingeCount: hingesPerDoor
    });

    for (let i = 0; i < hingesPerDoor; i++) {
      let posY = 70;
      if (hingesPerDoor > 2) {
        posY = 70 + (i * (doorH - 140) / (hingesPerDoor - 1));
      } else {
        posY = i === 0 ? 70 : doorH - 70;
      }

      parts.push({
        id: `hinge-wall-${isLeft ? 'L' : 'R'}-${i}`, name: 'Bisagra Interna 90°', width: 30, height: 15, depth: 45,
        x: isLeft ? 10 : W - 10, y: posY, z: D/2 - 20, type: 'hardware', isHardware: true,
        cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
      });
    }
  });

  return { parts, summary: 'Alacena superior con bisagras automáticas por puerta.', hasDoors: true, hasDrawers: false };
}
