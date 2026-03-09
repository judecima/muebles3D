import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor Alacena Horizontal Compacta con Pistón a Gas - Red Arquimax
 * Diseño basado en parámetros reales de carpintería: 500x300x320mm, 18mm espesor.
 */
export function superiorWallFlipEngine(dim: FurnitureDimensions): FurnitureModel {
  // Ajuste forzado a 18mm para este modelo específico si viene por defecto
  const T = 18; 
  const { width: W, height: H, depth: D, hasBack } = dim;
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

  // Puerta Abatible (Flip-up) - Rotación sobre eje X superior
  const doorW = W;
  const doorH = H;
  const doorY = H / 2;

  // Lógica de Bisagras Global
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

  // Agregar bisagras al listado de herrajes
  for(let i=0; i<hingeCount; i++) {
    parts.push({
      id: `hinge-flip-${i}`, name: 'Bisagra Cazoleta 35mm (Superior)', width: 30, height: 15, depth: 45,
      x: i === 0 ? 70 : (i === 1 ? W - 70 : W/2), y: H - 20, z: D/2, type: 'hardware', isHardware: true,
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
    });
  }

  // Soportes Regulables para Colgar (Traseros superiores)
  const supportPositions = [
    { x: T + 30, y: H - 30 },
    { x: W - T - 30, y: H - 30 }
  ];
  supportPositions.forEach((pos, i) => {
    parts.push({
      id: `hang-support-${i}`, name: 'Soporte Regulable Blanco', width: 40, height: 40, depth: 20, 
      x: pos.x, y: pos.y, z: -D/2 + 10, type: 'hardware', isHardware: true, 
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
    });
  });

  // PISTONES A GAS - Lógica paramétrica ajustada a referencia visual
  // Fijación Inferior (Lateral): X=20mm (desde frente), Y=60mm (desde base)
  // Fijación Superior (Puerta): X=40mm (desde lateral), Y=30mm (desde borde superior)
  const anchorLatZ = D/2 - 20; 
  const anchorLatY = 60;

  const anchorDoorY = H - 30;
  const anchorDoorZ = D/2 + T;

  const pistonCount = W > 800 ? 2 : 1;
  const sides: ('left' | 'right')[] = pistonCount === 2 ? ['left', 'right'] : ['right'];

  const L_closed = 220;
  const L_open = 340;

  sides.forEach(side => {
    const sideX = side === 'left' ? T + 2 : W - T - 2;
    const doorX = side === 'left' ? 40 : W - 40;

    parts.push({
      id: `piston-${side}`,
      name: 'Pistón a Gas 100N',
      width: 15, height: 15, depth: L_closed,
      x: sideX, y: anchorLatY, z: anchorLatZ,
      type: 'piston-body',
      isHardware: true,
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre',
      pistonConfig: {
        side,
        anchorMueble: { x: sideX, y: anchorLatY, z: anchorLatZ },
        anchorPuerta: { x: doorX, y: anchorDoorY, z: anchorDoorZ },
        lengthClosed: L_closed,
        lengthOpen: L_open
      }
    });

    // Soportes de pistón
    parts.push({
      id: `piston-sup-support-${side}`, name: 'Soporte Superior Pistón', width: 20, height: 20, depth: 10,
      x: doorX, y: anchorDoorY, z: anchorDoorZ, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
    });
    parts.push({
      id: `piston-inf-support-${side}`, name: 'Soporte Inferior Pistón', width: 20, height: 20, depth: 10,
      x: sideX, y: anchorLatY, z: anchorLatZ, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
    });
  });

  return { 
    parts, 
    summary: `Alacena horizontal compacta Red Arquimax con pistón a gas.`, 
    hasDoors: true, 
    hasDrawers: false 
  };
}
