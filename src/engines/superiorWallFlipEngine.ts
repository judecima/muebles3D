import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Alacena Rebatible v14.0
 * Construcción sándwich (Base/Tapa W).
 */
export function superiorWallFlipEngine(dim: FurnitureDimensions): FurnitureModel {
  const T = 18;
  const { width: W, height: H, depth: D, hasBack } = dim;
  const sideH = H - 2 * T;
  const innerW = W - 2 * T;

  const parts: Part[] = [
    { id: 'base', name: 'Base Inferior', width: W, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'tapa', name: 'Tapa Superior', width: W, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: sideH, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: sideH, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
  ];

  if (hasBack) {
    parts.push({ 
      id: 'fondo', 
      name: 'Fondo MDF 3mm', 
      width: W - 2, height: H - 2, depth: 3, 
      x: W/2, y: H/2, z: -D/2 - 1.5, 
      type: 'static', cutLargo: H - 2, cutAncho: W - 2, cutEspesor: 3, grainDirection: 'libre' 
    });
  }

  const doorW = W - 3;
  const doorH = H - 3;
  const doorY = doorH / 2;

  const hingeCount = doorH <= 600 ? 2 : doorH <= 1200 ? 3 : 4;

  parts.push({ 
    id: 'door-flip', 
    name: 'Puerta Abatible', 
    width: doorW, height: doorH, depth: T, 
    x: W / 2, y: doorY, z: D / 2 + T / 2, 
    type: 'door-flip', 
    pivot: { x: W / 2, y: H, z: D / 2 },
    cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'horizontal',
    hingeCount
  });

  for (let i = 0; i < hingeCount; i++) {
    const posX = i === 0 ? 100 : (i === 1 ? W - 100 : W/2);
    parts.push({
      id: `hinge-flip-${i}`, name: 'Bisagra Interna 90°', width: 35, height: 35, depth: 12,
      x: posX, y: H - 10, z: D/2 - 6, type: 'hardware', isHardware: true,
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
    });
  }

  [40, W - 40].forEach((posX, i) => {
    parts.push({
      id: `hang-support-${i}`, name: 'Soporte Regulable Blanco', width: 40, height: 40, depth: 20, 
      x: posX, y: H - 30, z: -D/2 + 10, type: 'hardware', isHardware: true, 
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
    });
  });

  const pistonCount = W <= 800 ? 1 : 2;
  const sides: ('left' | 'right')[] = pistonCount === 2 ? ['left', 'right'] : ['right'];

  sides.forEach(side => {
    const sideX = side === 'left' ? T + 5 : W - T - 5;
    parts.push({
      id: `piston-${side}`,
      name: 'Pistón a Gas',
      width: 15, height: 15, depth: 220, 
      x: sideX, y: 60, z: D/2 - 20, 
      type: 'piston-body',
      isHardware: true,
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre',
      pistonConfig: {
        side,
        anchorMueble: { x: sideX, y: 60, z: D/2 - 20 },
        anchorPuertaLocal: { 
          x: side === 'left' ? -W/2 + 40 : W/2 - 40, 
          y: H/2 - 30, 
          z: -T/2 
        },
        doorId: 'door-flip',
        lengthClosed: 220,
        lengthOpen: 340
      }
    });
  });

  return { parts, summary: `Alacena horizontal con estructura sándwich.`, hasDoors: true, hasDrawers: false };
}
