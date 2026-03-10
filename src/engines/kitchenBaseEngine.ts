import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Bajo Mesada Red Arquimax v14.0
 * Construcción industrial con Base de ancho completo y Amarres superiores.
 */
export function kitchenBaseEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T, hasBack, hasShelf } = dim;
  const innerW = W - 2 * T;
  const sideH = H - T; // De base a ras superior

  const parts: Part[] = [
    { id: 'base', name: 'Base Inferior', width: W, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: sideH, depth: D, x: T/2, y: T + sideH/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-R', name: 'Lateral Derecho', width: T, height: sideH, depth: D, x: W - T/2, y: T + sideH/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    
    // Amarres internos atornillados en extremos
    { id: 'amarre-front', name: 'Amarre Frontal (H)', width: innerW, height: T, depth: 60, x: W/2, y: H - T/2, z: D/2 - 30, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'amarre-back', name: 'Amarre Trasero (V)', width: innerW, height: 60, depth: T, x: W/2, y: H - 30, z: -D/2 + T/2, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' },
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

  if (hasShelf) {
    parts.push({
      id: 'estante-interno',
      name: 'Estante Interno',
      width: innerW - 2,
      height: T,
      depth: D * 0.9,
      x: W/2,
      y: H/2,
      z: 0,
      type: 'static',
      cutLargo: innerW - 2,
      cutAncho: D * 0.9,
      cutEspesor: T,
      grainDirection: 'horizontal'
    });
  }

  const doorH = H - 3; // Luz superior 3mm
  const doorW = (W - 3) / 2; // Luz central 3mm
  const doorY = doorH / 2;
  
  const hingesPerDoor = doorH <= 600 ? 2 : doorH <= 1200 ? 3 : 4;
  const doorTypes: ('door-left' | 'door-right')[] = ['door-left', 'door-right'];
  
  doorTypes.forEach((type) => {
    const isLeft = type === 'door-left';
    parts.push({ 
      id: `k-door-${isLeft ? 'L' : 'R'}`, 
      name: `Puerta ${isLeft ? 'Izquierda' : 'Derecha'}`, 
      width: doorW, height: doorH, depth: T, 
      x: isLeft ? 1.5 + doorW / 2 : W - 1.5 - doorW / 2, 
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
        id: `hinge-${isLeft ? 'L' : 'R'}-${i}`, name: 'Bisagra Interna 90°', width: 35, height: 35, depth: 12,
        x: isLeft ? T : W - T, y: posY, z: D/2 - 10, type: 'hardware', isHardware: true,
        cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
      });
    }
  });

  return { parts, summary: 'Bajo mesada con base de apoyo estructural y laterales internos.', hasDoors: true, hasDrawers: false };
}
