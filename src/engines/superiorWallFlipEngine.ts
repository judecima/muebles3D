import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Alacena Rebatible Red Arquimax v15.6 Industrial
 * - Estructura Sándwich: Base y Tapa de ancho completo (W).
 * - Laterales confinados: H - 2T.
 * - Sistema de Pistones a Gas cinemáticos.
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

  parts.push({ 
    id: 'door-flip', 
    name: 'Puerta Abatible', 
    width: doorW, height: doorH, depth: T, 
    x: W / 2, y: doorY, z: D / 2 + T / 2, 
    type: 'door-flip', 
    pivot: { x: W / 2, y: H, z: D / 2 },
    cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'horizontal'
  });

  // Cálculo Normativo de Bisagras 90°
  let hingeCount = doorW <= 600 ? 2 : doorW <= 1200 ? 3 : 4;
  for (let i = 0; i < hingeCount; i++) {
    const posX = i === 0 ? 100 : (i === 1 ? W - 100 : W/2);
    parts.push({
      id: `hinge-flip-${i}`, name: 'Bisagra Interna 90°', width: 35, height: 35, depth: 12,
      x: posX, y: H - 10, z: D/2 - 6, type: 'hardware', isHardware: true,
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
    });
  }

  // Pistones Neumáticos con Cinemática Real
  const pistonCount = W <= 800 ? 1 : 2;
  const sides: ('left' | 'right')[] = pistonCount === 2 ? ['left', 'right'] : ['right'];

  sides.forEach(side => {
    const sideX = side === 'left' ? T + 10 : W - T - 10;
    // Anclaje en el mueble (fijo)
    const anchorMueble = { x: sideX, y: H * 0.4, z: D * 0.2 };
    // Anclaje en la puerta (relativo al centro de la puerta para el render)
    // El punto de la puerta debe estar cerca de la bisagra pero lo suficiente para pivotear
    const anchorPuertaLocal = { 
      x: side === 'left' ? -doorW/2 + 40 : doorW/2 - 40, 
      y: doorH/2 - 120, 
      z: -T/2 
    };

    parts.push({
      id: `piston-${side}`,
      name: 'Pistón a Gas',
      width: 15, height: 15, depth: 220, 
      x: anchorMueble.x, y: anchorMueble.y, z: anchorMueble.z, 
      type: 'piston-body',
      isHardware: true,
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre',
      pistonConfig: {
        side,
        anchorMueble,
        anchorPuertaLocal,
        doorId: 'door-flip',
        lengthClosed: 220,
        lengthOpen: 340
      }
    });
  });

  return { parts, summary: `Alacena rebatible v15.6 Industrial: Cinemática de pistones y sándwich de apoyo.`, hasDoors: true, hasDrawers: false };
}
