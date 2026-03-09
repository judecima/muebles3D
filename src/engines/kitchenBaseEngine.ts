import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function kitchenBaseEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  const effectiveH = Math.min(H, 1000);

  const parts: Part[] = [
    { id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: effectiveH, depth: D, x: T/2, y: effectiveH/2, z: 0, type: 'static' },
    { id: 'lat-R', name: 'Lateral Derecho', width: T, height: effectiveH, depth: D, x: W - T/2, y: effectiveH/2, z: 0, type: 'static' },
    { id: 'base', name: 'Base Inferior', width: W - 2*T, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static' },
    { id: 'shelf', name: 'Estante Interior', width: W - 2*T - 2, height: T, depth: D * 0.9, x: W/2, y: effectiveH/2, z: 0, type: 'static' },
  ];

  // Bisagras automáticas
  const doorH = effectiveH - 10;
  let hinges = 2;
  if (doorH > 900) hinges = 3;

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

  // Bisagras en el despiece
  for (let i = 0; i < hinges * 2; i++) {
    parts.push({ id: `h-${i}`, name: 'Bisagra Cazoleta 90°', width: 0, height: 0, depth: 0, x: 0, y: 0, z: 0, type: 'hardware', isHardware: true });
  }

  return { parts, summary: `Bajo mesada con ${hinges * 2} bisagras calculadas según altura.` };
}
