import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function superiorWallFlipEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T, hasBack, hasShelf } = dim;
  const innerW = W - 2 * T;

  const parts: Part[] = [
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'base', name: 'Base Inferior', width: innerW, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'tapa', name: 'Tapa Superior', width: innerW, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
  ];

  if (hasBack) {
    parts.push({ 
      id: 'fondo', 
      name: 'Fondo Mueble', 
      width: W, height: H, depth: 3, 
      x: W/2, y: H/2, z: -D/2 - 1.5, 
      type: 'static', cutLargo: H, cutAncho: W, cutEspesor: 3, grainDirection: 'libre' 
    });
  }

  if (hasShelf) {
    parts.push({
      id: 'estante',
      name: 'Estante Interior',
      width: innerW - 2,
      height: T,
      depth: D * 0.85,
      x: W/2,
      y: H/2,
      z: 0,
      type: 'static',
      cutLargo: innerW - 2,
      cutAncho: D * 0.85,
      cutEspesor: T,
      grainDirection: 'horizontal'
    });
  }

  // Puerta Abatible (Flip-up)
  const doorW = W;
  const doorH = H;
  const doorY = H / 2;

  parts.push({ 
    id: 'door-flip', 
    name: 'Puerta Abatible', 
    width: doorW, height: doorH, depth: T, 
    x: W / 2, y: doorY, z: D / 2 + T / 2, 
    type: 'door-flip', 
    pivot: { x: W / 2, y: H, z: D / 2 },
    cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'horizontal'
  });

  // Herrajes
  parts.push({ 
    id: 'hinge-1', name: 'Bisagra Superior', width: 40, height: 20, depth: 40, x: 50, y: H - 10, z: D/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' 
  });
  parts.push({ 
    id: 'hinge-2', name: 'Bisagra Superior', width: 40, height: 20, depth: 40, x: W - 50, y: H - 10, z: D/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' 
  });

  // Cálculo de Pistones
  const pistonCount = W >= 600 ? 2 : 1;
  const pistonSides: ('left' | 'right')[] = pistonCount === 2 ? ['left', 'right'] : ['right'];

  pistonSides.forEach(side => {
    const sideX = side === 'left' ? T + 10 : W - T - 10;
    
    // El pistón se compone de cuerpo y vástago para la animación 3D
    parts.push({
      id: `piston-${side}`,
      name: `Pistón Neumático ${side === 'left' ? 'Izquierdo' : 'Derecho'}`,
      width: 15, height: 15, depth: 240,
      x: sideX, y: 80, z: 60 - D/2,
      type: 'piston-body',
      isHardware: true,
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre',
      pistonConfig: {
        side,
        anchorMueble: { x: sideX, y: 80, z: 60 - D/2 },
        anchorPuerta: { x: sideX, y: H - 120, z: D/2 + T }
      }
    });
  });

  return { 
    parts, 
    summary: `Alacena superior con puerta abatible hacia arriba y ${pistonCount} pistón(es) neumático(s).`, 
    hasDoors: true, 
    hasDrawers: false 
  };
}
