import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function kitchenBaseEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, depth: D, thickness: T, hasBack } = dim;
  const H = 870; // Altura fija Red Arquimax
  const innerW = W - 2 * T;

  const parts: Part[] = [
    { id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-R', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'base', name: 'Base Inferior', width: innerW, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'amarre-front', name: 'Amarre Frontal (H)', width: innerW, height: T, depth: 60, x: W/2, y: H - T/2, z: D/2 - 30, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'amarre-back', name: 'Amarre Trasero (V)', width: innerW, height: 60, depth: T, x: W/2, y: H - 30, z: -D/2 + T/2, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' },
  ];

  if (hasBack) {
    parts.push({ 
      id: 'fondo', 
      name: 'Fondo Mueble', 
      width: W - T, height: H - T, depth: 3, 
      x: W/2, y: H/2, z: -D/2 + 1.5, 
      type: 'static', cutLargo: H - T, cutAncho: W - T, cutEspesor: 3, grainDirection: 'libre' 
    });
  }

  const doorH = H - 5;
  const doorW = W / 2 - 2;
  const doorY = H / 2;
  
  const hingeCount = doorH > 1500 ? 4 : doorH > 900 ? 3 : 2;

  parts.push({ 
    id: 'k-door-L', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, 
    x: doorW / 2, y: doorY, z: D / 2 + T / 2, type: 'door-left',
    pivot: { x: 0, y: doorY, z: D / 2 },
    cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical',
    hingeCount
  });

  parts.push({ 
    id: 'k-door-R', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, 
    x: W - doorW / 2, y: doorY, z: D / 2 + T / 2, type: 'door-right',
    pivot: { x: W, y: doorY, z: D / 2 },
    cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical',
    hingeCount
  });

  for (let i = 0; i < hingeCount * 2; i++) {
    parts.push({ id: `bis-${i}`, name: 'Bisagra Cazoleta', width: 35, height: 35, depth: 12, x: 0, y: 0, z: 0, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  }

  return { parts, summary: 'Bajo mesada Red Arquimax con amarres estructurales.', hasDoors: true, hasDrawers: false };
}
