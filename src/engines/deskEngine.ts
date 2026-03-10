import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

/**
 * Motor para Escritorio Red Arquimax v15.5 Industrial
 * - Estructura Híbrida: Tapa de ancho completo (W).
 * - Sección Cajonera: Posee base propia (Sandwich).
 * - Sección Legroom: Abierta para ergonomía.
 * - Huelgo superior de 3mm estricto.
 */
export function deskEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, depth: D, thickness: T } = dim;
  const H = 750; // Altura estándar industrial

  const cabW = 400; // Ancho del módulo de cajones
  const innerW = cabW - 2 * T;
  const sideH_leg = H - T;    // Pata izquierda apoya en suelo
  const sideH_cab = H - 2 * T; // Laterales cajonera confinados entre base y tapa
  const cabCenterX = W - cabW / 2;

  const parts: Part[] = [
    // 1. Tapa Superior de ancho completo
    { id: 'top', name: 'Tapa Escritorio', width: W, height: T, depth: D, x: W / 2, y: H - T / 2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    
    // 2. Base de la Cajonera (Solo en la sección de cajones)
    { id: 'cab-base', name: 'Base Cajonera', width: cabW, height: T, depth: D, x: cabCenterX, y: T / 2, z: 0, type: 'static', cutLargo: cabW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },

    // 3. Lateral Izquierdo (Apoya en suelo)
    { id: 'leg-L', name: 'Lateral Izquierdo', width: T, height: sideH_leg, depth: D, x: T / 2, y: sideH_leg / 2, z: 0, type: 'static', cutLargo: sideH_leg, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    
    // 4. Laterales de Cajonera (Apoyan en cab-base)
    { id: 'leg-R', name: 'Lateral Derecho', width: T, height: sideH_cab, depth: D, x: W - T / 2, y: T + sideH_cab / 2, z: 0, type: 'static', cutLargo: sideH_cab, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'div-L', name: 'Divisor Módulo', width: T, height: sideH_cab, depth: D, x: W - cabW + T / 2, y: T + sideH_cab / 2, z: 0, type: 'static', cutLargo: sideH_cab, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    
    // 5. Respaldo estructural (Amarre de fondo)
    { id: 'mod-back', name: 'Respaldo Estructural', width: W - cabW - T, height: H * 0.4, depth: T, x: (W - cabW) / 2, y: H - T - (H * 0.2), z: -D/4, type: 'static', cutLargo: W - cabW - T, cutAncho: H * 0.4, cutEspesor: T, grainDirection: 'horizontal' },
  ];

  // Configuración de Cajones Sincronizados con Huelgo Superior de 3mm
  const railCl = 13; // Espacio para riel telescópico
  const drawerBoxW = innerW - (railCl * 2);
  const drD = D - 40;
  const numDrawers = 3;
  const gap = 3; 
  const availH = H - 2 * T; // Altura libre interna
  const frontH = (availH - (numDrawers * gap)) / numDrawers;

  for (let i = 0; i < numDrawers; i++) {
    // pY centrando el frente considerando el huelgo superior de 3mm
    const pY = (H - T) - gap - (frontH / 2) - (i * (frontH + gap));
    const prefix = `desk-dr-${i}`;
    const boxH = frontH * 0.7;
    const boxInnerW = drawerBoxW - 2 * T;
    
    // 1. Frente Estético Overlay
    parts.push({ id: `${prefix}-f`, groupId: prefix, name: `Frente Cajón`, width: cabW - 4, height: frontH, depth: T, x: cabCenterX, y: pY, z: D / 2 + T / 2, type: 'drawer', cutLargo: frontH, cutAncho: cabW - 4, cutEspesor: T, grainDirection: 'horizontal' });
    
    // 2. Caja Estructural (6 piezas sincronizadas)
    parts.push({ id: `${prefix}-box-F`, groupId: prefix, name: `Frente Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: cabCenterX, y: pY, z: D/2 - T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-B`, groupId: prefix, name: `Trasera Estruct. Caja`, width: boxInnerW, height: boxH, depth: T, x: cabCenterX, y: pY, z: D/2 - drD + T/2, type: 'drawer', cutLargo: boxInnerW, cutAncho: boxH, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: `${prefix}-box-SL`, groupId: prefix, name: `Lateral Izq. Caja`, width: T, height: boxH, depth: drD, x: cabCenterX - drawerBoxW/2 + T/2, y: pY, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-SR`, groupId: prefix, name: `Lateral Der. Caja`, width: T, height: boxH, depth: drD, x: cabCenterX + drawerBoxW/2 - T/2, y: pY, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: boxH, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-box-bottom`, groupId: prefix, name: `Piso Cajón 3mm`, width: drawerBoxW, height: 3, depth: drD, x: cabCenterX, y: pY - boxH/2 + 1.5, z: D/2 - drD/2, type: 'drawer', cutLargo: drD, cutAncho: drawerBoxW, cutEspesor: 3, grainDirection: 'libre' });

    // 3. Rieles (Se contabilizan por Juego)
    parts.push({ id: `${prefix}-rail-L`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drD, x: cabCenterX - drawerBoxW/2 - 6.5, y: pY, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-rail-R`, groupId: prefix, name: `Riel Telescópico (Juego)`, width: 13, height: 35, depth: drD, x: cabCenterX + drawerBoxW/2 + 6.5, y: pY, z: D/2 - drD/2, type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre' });
  }

  return { parts, summary: 'Escritorio v15.5 Industrial: Cajones sincronizados con luz superior de 3mm.', hasDoors: false, hasDrawers: true };
}
