import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Rack TV Red Arquimax v15.0
 * Construcción sándwich y herrajes calculados.
 */
export function tvRackEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, depth: D, thickness: T } = dim;
  const H = 500; 
  const sideH = H - 2 * T;

  const parts: Part[] = [
    { id: 'base', name: 'Base Principal', width: W, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'tapa', name: 'Tapa Superior', width: W, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: sideH, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: sideH, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'divisor', name: 'Divisor Central', width: T, height: sideH, depth: D * 0.9, x: W/2, y: H/2, z: 0, type: 'static', cutLargo: sideH, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'vertical' },
  ];

  const drW = (W - 3*T - 26*2) / 2;
  const drD = D - 50;

  for (let i = 0; i < 2; i++) {
    const pX = i === 0 ? T + (W - 3*T)/4 : W - T - (W - 3*T)/4;
    const prefix = `rack-dr-${i}`;
    parts.push({ id: `${prefix}-front`, name: `Frente Cajón`, width: (W - 3*T)/2 - 4, height: sideH - 4, depth: T, x: pX, y: H/2, z: D/2 + T/2, type: 'drawer', cutLargo: sideH - 4, cutAncho: (W - 3*T)/2 - 4, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-rail-L`, name: `Rieles Telescópicos (Juego)`, width: 13, height: 35, depth: drD, x: pX - drW/2 - 13 - 6.5, y: H/2, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-R`, name: `Rieles Telescópicos (Juego)`, width: 13, height: 35, depth: drD, x: pX + drW/2 + 13 + 6.5, y: H/2, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  }

  return { parts, summary: 'Rack TV v15.0: Estructura sándwich reforzada y rieles contabilizados por par.', hasDoors: false, hasDrawers: true };
}