import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Alacena Rebatible Red Arquimax v15.7 Industrial
 * - Estructura Sándwich: Base y Tapa de ancho completo (W).
 * - Laterales confinados: H - 2T.
 * - Sistema de Pistones a Gas cinemáticos internos (v15.7).
 */
export function superiorWallFlipEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T, hasBack } = dim;
  const sideH = H - 2 * T;
  const innerW = W - 2 * T;

  const parts: Part[] = [
    // Estructura Sándwich (Base y Tapa W)
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

  // Puerta Rebatible Overlay (Luz superior 3mm, laterales 2mm)
  const doorW = W - 4; 
  const doorH = H - 3; 
  const doorY = doorH / 2;

  // Pivotaje en la parte superior del mueble (H), centrado en profundidad (D/2) para alinearse con los laterales
  parts.push({ 
    id: 'door-flip', 
    name: 'Puerta Abatible', 
    width: doorW, height: doorH, depth: T, 
    x: W / 2, y: doorY, z: D / 2 + T / 2, 
    type: 'door-flip', 
    pivot: { x: W / 2, y: H, z: D / 2 },
    cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'horizontal'
  });

  // Cálculo Normativo de Bisagras 90° (Mínimo 2)
  let hingeCount = doorW <= 600 ? 2 : doorW <= 1200 ? 3 : 4;
  for (let i = 0; i < hingeCount; i++) {
    const posX = i === 0 ? 100 : (i === 1 ? W - 100 : W/2);
    parts.push({
      id: `hinge-flip-${i}`, name: 'Bisagra Interna 90°', width: 35, height: 35, depth: 12,
      x: posX, y: H - 10, z: D/2 - 6, type: 'hardware', isHardware: true,
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
    });
  }

  // Pistones Neumáticos con Cinemática Real v15.7 (Internos)
  const pistonCount = W <= 800 ? 1 : 2;
  const sides: ('left' | 'right')[] = pistonCount === 2 ? ['left', 'right'] : ['right'];

  sides.forEach(side => {
    const sideX = side === 'left' ? T + 10 : W - T - 10;
    
    // Punto de anclaje en el lateral del mueble (Fijo)
    const anchorMueble = { x: sideX, y: H * 0.4, z: -D / 2 + 50 };
    
    // Punto de anclaje en la puerta (Fijo en la puerta a la altura de las bisagras)
    // doorH/2 es el borde superior de la puerta en su espacio local.
    // Lo situamos a la altura de las bisagras (aprox 10mm del borde superior)
    const anchorPuertaLocal = { 
      x: side === 'left' ? -doorW/2 + 30 : doorW/2 - 30, 
      y: doorH/2 - 10, 
      z: -T/2 
    };

    const lengthClosed = 190; 

    parts.push({
      id: `piston-${side}`,
      name: 'Pistón a Gas',
      width: 14, height: 14, depth: lengthClosed, 
      x: anchorMueble.x, y: anchorMueble.y, z: anchorMueble.z, 
      type: 'piston-body',
      isHardware: true,
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre',
      pistonConfig: {
        side,
        anchorMueble,
        anchorPuertaLocal,
        doorId: 'door-flip',
        lengthClosed: lengthClosed,
        lengthOpen: 290
      }
    });
  });

  return { parts, summary: `Alacena rebatible v15.7 Industrial: Mecanismo de pistón interno y estructura sándwich.`, hasDoors: true, hasDrawers: false };
}
