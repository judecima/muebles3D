import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function bookshelfEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T, hasBack } = dim;
  
  const numShelves = 4;
  const sideH = H - 2 * T;
  const parts: Part[] = [
    { id: 'base', name: 'Base Inferior', width: W, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'tapa', name: 'Tapa Superior', width: W, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: sideH, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: sideH, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
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

  const innerW = W - 2 * T;
  for (let i = 1; i <= numShelves; i++) {
    parts.push({
      id: `estante-${i}`,
      name: `Estante ${i}`,
      width: innerW - 2,
      height: T,
      depth: D * 0.95,
      x: W/2,
      y: (H / (numShelves + 1)) * i,
      z: 0,
      type: 'static',
      cutLargo: innerW - 2,
      cutAncho: D * 0.95,
      cutEspesor: T,
      grainDirection: 'horizontal'
    });
  }

  return { parts, summary: `Biblioteca con ${numShelves} estantes fijos. Estructura tipo sándwich.`, hasDoors: false, hasDrawers: false };
}
