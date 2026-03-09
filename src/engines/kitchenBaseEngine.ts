import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function kitchenBaseEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  const effectiveH = Math.min(H, 1000);
  const innerW = W - 2 * T;

  const parts: Part[] = [
    { id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: effectiveH, depth: D, x: T/2, y: effectiveH/2, z: 0, type: 'static', cutLargo: effectiveH, cutAncho: D, cutEspesor: T },
    { id: 'lat-R', name: 'Lateral Derecho', width: T, height: effectiveH, depth: D, x: W - T/2, y: effectiveH/2, z: 0, type: 'static', cutLargo: effectiveH, cutAncho: D, cutEspesor: T },
    { id: 'base', name: 'Base Inferior', width: innerW, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T },
    { id: 'shelf', name: 'Estante Interior', width: innerW - 2, height: T, depth: D * 0.9, x: W/2, y: effectiveH/2, z: 0, type: 'static', cutLargo: innerW - 2, cutAncho: D * 0.9, cutEspesor: T },
    
    { id: 'amarre-front', name: 'Amarre Frontal (Horizontal)', width: innerW, height: T, depth: 60, x: W/2, y: effectiveH - T/2, z: D/2 - 30, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T },
    { id: 'amarre-back', name: 'Amarre Trasero (Vertical)', width: innerW, height: 60, depth: T, x: W/2, y: effectiveH - 30, z: -D/2 + T/2, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T },
  ];

  const doorH = effectiveH - 5;
  const doorW = W / 2 - 2;
  const doorY = effectiveH / 2;

  parts.push({ 
    id: 'k-door-L', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, 
    x: doorW / 2, y: doorY, z: D / 2 + T / 2, type: 'door-left',
    pivot: { x: 0, y: doorY, z: D / 2 },
    cutLargo: doorH, cutAncho: doorW, cutEspesor: T
  });

  parts.push({ 
    id: 'k-door-R', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, 
    x: W - doorW / 2, y: doorY, z: D / 2 + T / 2, type: 'door-right',
    pivot: { x: W, y: doorY, z: D / 2 },
    cutLargo: doorH, cutAncho: doorW, cutEspesor: T
  });

  for (let i = 0; i < 4; i++) {
    parts.push({ id: `bis-${i}`, name: 'Bisagra Cazoleta 90°', width: 0, height: 0, depth: 0, x: 0, y: 0, z: 0, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0 });
  }

  return { parts, summary: 'Bajo mesada Red Arquimax con amarres técnicos y sin tapa.' };
}
