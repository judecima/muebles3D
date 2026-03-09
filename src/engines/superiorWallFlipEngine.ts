import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function superiorWallFlipEngine(dim: FurnitureDimensions): FurnitureModel {
  // Ajuste a dimensiones compactas solicitadas o las del usuario
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

  // Puerta Abatible (Flip-up) que cubre todo el frente
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

  // Herrajes: Soportes regulables blancos para colgar
  parts.push({
    id: 'hang-L', name: 'Soporte Regulable Blanco', width: 40, height: 40, depth: 20, 
    x: T + 30, y: H - 30, z: -D/2 + 10, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
  });
  parts.push({
    id: 'hang-R', name: 'Soporte Regulable Blanco', width: 40, height: 40, depth: 20, 
    x: W - T - 30, y: H - 30, z: -D/2 + 10, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
  });

  // Cálculo de Pistones (Referencia: X=95 desde frente, Y=70 desde base)
  const pistonCount = W >= 600 ? 2 : 1;
  const pistonSides: ('left' | 'right')[] = pistonCount === 2 ? ['left', 'right'] : ['right'];

  pistonSides.forEach(side => {
    const sideX = side === 'left' ? T + 2 : W - T - 2;
    
    parts.push({
      id: `piston-${side}`,
      name: `Pistón a Gas ${side === 'left' ? 'Izquierdo' : 'Derecho'}`,
      width: 15, height: 15, depth: 220, // Longitud cerrada base
      x: sideX, y: 70, z: D/2 - 95,
      type: 'piston-body',
      isHardware: true,
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre',
      pistonConfig: {
        side,
        // Anclaje Mueble: 95mm desde el frente, 70mm desde la base
        anchorMueble: { x: sideX, y: 70, z: D/2 - 95 },
        // Anclaje Puerta: 80mm desde lateral, 65mm desde borde superior
        anchorPuerta: { 
          x: side === 'left' ? 80 : W - 80, 
          y: H - 65, 
          z: D/2 + T 
        }
      }
    });
  });

  return { 
    parts, 
    summary: `Alacena horizontal compacta de 50x30x32cm con puerta abatible de 100° y pistón a gas.`, 
    hasDoors: true, 
    hasDrawers: false 
  };
}
