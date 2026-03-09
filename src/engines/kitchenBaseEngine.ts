import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function kitchenBaseEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T, hasBack, hasShelf } = dim;
  const innerW = W - 2 * T;

  const parts: Part[] = [
    { id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'libre' },
    { id: 'lat-R', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'libre' },
    { id: 'base', name: 'Base Inferior', width: innerW, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'libre' },
    { id: 'amarre-front', name: 'Amarre Frontal (H)', width: innerW, height: T, depth: 60, x: W/2, y: H - T/2, z: D/2 - 30, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'libre' },
    { id: 'amarre-back', name: 'Amarre Trasero (V)', width: innerW, height: 60, depth: T, x: W/2, y: H - 30, z: -D/2 + T/2, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'libre' },
  ];

  if (hasBack) {
    parts.push({ 
      id: 'fondo', 
      name: 'Fondo Mueble', 
      width: W, height: H, depth: 3, 
      x: W/2, y: H/2, z: -D/2 - 1.5, 
      type: 'static', cutLargo: H, cutAncho: W, cutEspesor: 3, grainDirection: 'libre' 
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
      grainDirection: 'libre'
    });
  }

  const doorH = H - 5;
  const doorW = W / 2 - 2;
  const doorY = H / 2;
  
  // Lógica Global de Bisagras
  const hingeCountPerDoor = doorH <= 600 ? 2 : doorH <= 1200 ? 3 : 4;

  parts.push({ 
    id: 'k-door-L', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, 
    x: doorW / 2, y: doorY, z: D / 2 + T / 2, type: 'door-left',
    pivot: { x: 0, y: doorY, z: D / 2 },
    cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'libre',
    hingeCount: hingeCountPerDoor
  });

  parts.push({ 
    id: 'k-door-R', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, 
    x: W - doorW / 2, y: doorY, z: D / 2 + T / 2, type: 'door-right',
    pivot: { x: W, y: doorY, z: D / 2 },
    cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'libre',
    hingeCount: hingeCountPerDoor
  });

  // Agregar bisagras al listado de herrajes
  for(let i=0; i < hingeCountPerDoor * 2; i++) {
    parts.push({
      id: `hinge-base-${i}`, name: 'Bisagra Cazoleta 35mm', width: 30, height: 15, depth: 45,
      x: i < hingeCountPerDoor ? 10 : W - 10, y: H/2, z: D/2, type: 'hardware', isHardware: true,
      cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
    });
  }

  return { parts, summary: 'Bajo mesada Red Arquimax con bisagras calculadas.', hasDoors: true, hasDrawers: false };
}
