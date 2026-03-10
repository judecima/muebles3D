import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Alacena Rebatible Red Arquimax v15.3 Industrial
 * - Estructura Sándwich: Base y Tapa de ancho completo (W).
 * - Sistema de Pistones a Gas sincronizados.
 * - Cálculo normativo de bisagras 90°.
 */
export function superiorWallFlipEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T, hasBack } = dim;
  const sideH = H - 2 * T; // Confinados entre base y tapa
  const innerW = W - 2 * T;

  const parts: Part[] = [
    // Estructura Sándwich
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

  // Puerta Rebatible Overlay
  const doorW = W - 4; // 2mm luz por lado
  const doorH = H - 3; // 3mm luz superior
  const doorY = doorH / 2;

  // Cálculo de bisagras 90°
  let hingeCount = doorW <= 600 ? 2 : doorW <= 1200 ? 3 : 4;
  
  parts.push({ 
    id: 'door-flip', 
    name: 'Puerta Abatible', 
    width: doorW, height: doorH, depth: T, 
    x: W / 2, y: doorY, z: D / 2 + T / 2, 
    type: 'door-flip', 
    pivot: { x: W / 2, y: H, z: D / 2 },
    cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'horizontal'
  });

  // Renderizado de Bisagras
  for (let i = 0; i < hingeCount; i++) {
    const posX = i === 0 ? 100 : (i === 1 ? W - 100 : W/2);
    parts.push({
      id: `hinge-flip-${i}`, name: 'Bisagra Interna 90°', width: 35, height: 35, depth: 12,
      x: posX, y: H - 10, z: D/2 - 6, type: 'hardware', isHardware: true,
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
    });
  }

  // Pistones Neumáticos
  const pistonCount = W <= 800 ? 1 : 2;
  const sides: ('left' | 'right')[] = pistonCount === 2 ? ['left', 'right'] : ['right'];

  sides.forEach(side => {
    const sideX = side === 'left' ? T + 10 : W - T - 10;
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
        anchorPuertaLocal: { x: side === 'left' ? -W/2 + 40 : W/2 - 40, y: H/2 - 30, z: -T/2 },
        doorId: 'door-flip',
        lengthClosed: 220,
        lengthOpen: 340
      }
    });
  });

  return { parts, summary: `Alacena rebatible v15.3 Industrial con sistema de pistones a gas.`, hasDoors: true, hasDrawers: false };
}
