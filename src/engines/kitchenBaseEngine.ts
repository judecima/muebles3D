import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function kitchenBaseEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  const effectiveH = Math.min(H, 1000);
  const innerW = W - 2 * T;

  const parts: Part[] = [
    // Laterales y Base
    { id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: effectiveH, depth: D, x: T/2, y: effectiveH/2, z: 0, type: 'static' },
    { id: 'lat-R', name: 'Lateral Derecho', width: T, height: effectiveH, depth: D, x: W - T/2, y: effectiveH/2, z: 0, type: 'static' },
    { id: 'base', name: 'Base Inferior', width: innerW, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static' },
    { id: 'shelf', name: 'Estante Interior', width: innerW - 2, height: T, depth: D * 0.9, x: W/2, y: effectiveH/2, z: 0, type: 'static' },
    
    // Amarre Frontal Horizontal (60mm)
    { 
      id: 'amarre-front', 
      name: 'Amarre Frontal (Horizontal)', 
      width: innerW, 
      height: T, 
      depth: 60, 
      x: W/2, 
      y: effectiveH - T/2, 
      z: D/2 - 30, 
      type: 'static' 
    },
    
    // Amarre Trasero Vertical (60mm)
    { 
      id: 'amarre-back', 
      name: 'Amarre Trasero (Vertical)', 
      width: innerW, 
      height: 60, 
      depth: T, 
      x: W/2, 
      y: effectiveH - 30, 
      z: -D/2 + T/2, 
      type: 'static' 
    },
  ];

  // Cálculo automático de bisagras según altura de puerta
  const doorH = effectiveH - 5; // Margen mínimo
  let hingeCount = 2;
  if (doorH > 1600) hingeCount = 4;
  else if (doorH > 900) hingeCount = 3;

  const doorW = W / 2 - 2;
  const doorY = effectiveH / 2;

  // Puerta Izquierda
  parts.push({ 
    id: 'k-door-L', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, 
    x: doorW / 2, y: doorY, z: D / 2 + T / 2, type: 'door-left',
    pivot: { x: 0, y: doorY, z: D / 2 }
  });

  // Puerta Derecha
  parts.push({ 
    id: 'k-door-R', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, 
    x: W - doorW / 2, y: doorY, z: D / 2 + T / 2, type: 'door-right',
    pivot: { x: W, y: doorY, z: D / 2 }
  });

  // Representación de bisagras en el despiece de herrajes
  for (let i = 0; i < hingeCount * 2; i++) {
    parts.push({ 
      id: `bis-${i}`, 
      name: 'Bisagra Cazoleta 90°', 
      width: 0, height: 0, depth: 0, 
      x: 0, y: 0, z: 0, 
      type: 'hardware', 
      isHardware: true 
    });
  }

  return { parts, summary: `Bajo mesada Red Arquimax sin tapa superior, con amarres estructurales de 60mm y ${hingeCount * 2} bisagras calculadas.` };
}
