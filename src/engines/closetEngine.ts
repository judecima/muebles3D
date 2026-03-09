import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function closetEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  
  const innerW = W - 2 * T;
  const parts: Part[] = [
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'tapa-sup', name: 'Tapa Superior', width: innerW, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'base-inf', name: 'Base Inferior', width: innerW, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
  ];

  // Fondo obligatorio (3mm)
  parts.push({ 
    id: 'fondo', name: 'Fondo Mueble', width: W, height: H, depth: 3, 
    x: W/2, y: H/2, z: -D/2 - 1.5, 
    type: 'static', cutLargo: H, cutAncho: W, cutEspesor: 3, grainDirection: 'free' 
  });

  // Barra de colgar (Hardware)
  parts.push({
    id: 'hanger-bar', name: 'Barra de Colgar 25mm', width: innerW, height: 25, depth: 25,
    x: W/2, y: H * 0.8, z: 0, type: 'hardware', isHardware: true,
    cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'free'
  });

  // Puertas (Agregadas para corregir el error visual)
  const doorW = W / 2 - 2;
  const doorH = H - 10;
  parts.push({ 
    id: 'p-door-L', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, 
    x: doorW / 2, y: H/2, z: D / 2 + T / 2, type: 'door-left',
    pivot: { x: 0, y: H/2, z: D / 2 },
    cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical'
  });
  parts.push({ 
    id: 'p-door-R', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, 
    x: W - doorW / 2, y: H/2, z: D / 2 + T / 2, type: 'door-right',
    pivot: { x: W, y: H/2, z: D / 2 },
    cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical'
  });

  return { 
    parts, 
    summary: 'Placard estándar Red Arquimax con fondo de 3mm y barra de colgar.', 
    hasDoors: true, 
    hasDrawers: false 
  };
}
