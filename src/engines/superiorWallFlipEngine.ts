import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function superiorWallFlipEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T, hasBack } = dim;
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
      name: 'Fondo MDF 3mm', 
      width: W, height: H, depth: 3, 
      x: W/2, y: H/2, z: -D/2 - 1.5, 
      type: 'static', cutLargo: H, cutAncho: W, cutEspesor: 3, grainDirection: 'libre' 
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

  // Herrajes: Soportes regulables blancos
  parts.push({
    id: 'hang-L', name: 'Soporte Regulable Blanco', width: 40, height: 40, depth: 20, 
    x: T + 30, y: H - 30, z: -D/2 + 10, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
  });
  parts.push({
    id: 'hang-R', name: 'Soporte Regulable Blanco', width: 40, height: 40, depth: 20, 
    x: W - T - 30, y: H - 30, z: -D/2 + 10, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
  });

  // CÁLCULO PARAMÉTRICO DEL PISTÓN
  // Anclaje Lateral: X=30% Prof, Y=25% Alto
  const anchorLatZ = D/2 - (D * 0.30);
  const anchorLatY = H * 0.25;

  // Anclaje Puerta (Cerrada): X=16% Ancho (desde lateral), Y=22% Alto (desde arriba)
  const anchorDoorXRel = W * 0.16;
  const anchorDoorY = H - (H * 0.22);
  const anchorDoorZ = D/2 + T;

  // Cálculo de longitud base (distancia entre anclajes con puerta cerrada)
  // Como están en el mismo plano lateral (aprox), usamos Pitágoras en Y y Z
  const distY = Math.abs(anchorDoorY - anchorLatY);
  const distZ = Math.abs(anchorDoorZ - anchorLatZ);
  const lengthBase = Math.sqrt(distY * distY + distZ * distZ);

  // Longitudes paramétricas
  let lengthClosed = lengthBase * 0.90;
  const lengthOpen = lengthBase * 1.35;

  // Regla de seguridad: no exceder 90% de profundidad
  const maxLength = D * 0.9;
  if (lengthClosed > maxLength) {
    lengthClosed = maxLength;
  }

  const pistonCount = W >= 600 ? 2 : 1;
  const sides: ('left' | 'right')[] = pistonCount === 2 ? ['left', 'right'] : ['right'];

  sides.forEach(side => {
    const sideX = side === 'left' ? T + 2 : W - T - 2;
    const doorX = side === 'left' ? anchorDoorXRel : W - anchorDoorXRel;

    parts.push({
      id: `piston-${side}`,
      name: `Pistón Paramétrico ${side === 'left' ? 'Izq' : 'Der'}`,
      width: 15, height: 15, depth: lengthClosed,
      x: sideX, y: anchorLatY, z: anchorLatZ,
      type: 'piston-body',
      isHardware: true,
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre',
      pistonConfig: {
        side,
        anchorMueble: { x: sideX, y: anchorLatY, z: anchorLatZ },
        anchorPuerta: { x: doorX, y: anchorDoorY, z: anchorDoorZ },
        lengthClosed,
        lengthOpen
      }
    });
  });

  return { 
    parts, 
    summary: `Alacena horizontal con pistón paramétrico auto-ajustable.`, 
    hasDoors: true, 
    hasDrawers: false 
  };
}
