import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Alacena Rebatible Red Arquimax v15.8
 * Estructura Sándwich (Tapas W) + Cinemática de Pistones Restaurada.
 */
export function superiorWallFlipEngine(dim: FurnitureDimensions): FurnitureModel {
  const T = dim.thickness || 18;
  const { width: W, height: H, depth: D, hasBack } = dim;
  const sideH = H - 2 * T;
  const innerW = W - 2 * T;

  // Estructura Sándwich: Tapas de ancho completo W, laterales confinados
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

  const doorW = W;
  const doorH = H - 3; // Luz superior de 3mm
  const doorY = doorH / 2;

  const hingeCount = doorH <= 600 ? 2 : doorH <= 1200 ? 3 : 4;

  // Puerta Abatible con Pivot superior
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

  // Bisagras de 90°
  for (let i = 0; i < hingeCount; i++) {
    const posX = i === 0 ? 100 : (i === 1 ? W - 100 : W/2);
    parts.push({
      id: `hinge-flip-${i}`, name: 'Bisagra Interna 90°', width: 35, height: 35, depth: 12,
      x: posX, y: H - 10, z: D/2 - 6, type: 'hardware', isHardware: true,
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
    });
  }

  // Pistones a Gas Sincronizados (Configuración Original Restaurada)
  const pistonCount = W <= 800 ? 1 : 2;
  const sides: ('left' | 'right')[] = pistonCount === 2 ? ['left', 'right'] : ['right'];

  const anchorMuebleX_fromFront = 20; 
  const anchorMuebleY_fromBase = 60;   
  const anchorPuertaY_fromTop = 30;    

  sides.forEach(side => {
    const sideX = side === 'left' ? T + 5 : W - T - 5;
    
    parts.push({
      id: `piston-${side}`,
      name: 'Pistón a Gas',
      width: 15, height: 15, depth: 220, 
      x: sideX, y: anchorMuebleY_fromBase, z: D/2 - anchorMuebleX_fromFront, 
      type: 'piston-body',
      isHardware: true,
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre',
      pistonConfig: {
        side,
        anchorMueble: { x: sideX, y: anchorMuebleY_fromBase, z: D/2 - anchorMuebleX_fromFront },
        anchorPuertaLocal: { 
          x: side === 'left' ? -W/2 + 40 : W/2 - 40, 
          y: doorH/2 - anchorPuertaY_fromTop, // Fija en la puerta a la altura de las bisagras
          z: -T/2 
        },
        doorId: 'door-flip',
        lengthClosed: 220,
        lengthOpen: 340
      }
    });
  });

  return { 
    parts, 
    summary: `Alacena rebatible v15.8 Industrial: Estructura sándwich con cinemática de pistones sincronizada.`, 
    hasDoors: true, 
    hasDrawers: false 
  };
}
