
import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function deskEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  const effectiveH = Math.min(H, 1000); // Límite de altura solicitado

  // Dimensiones del módulo cajonera
  const cabinetW = 400;
  const cabinetInnerW = cabinetW - 2 * T;
  const cabinetCenterX = W - cabinetW / 2;
  const cabinetTopY = effectiveH - T;

  const parts: Part[] = [
    // --- Estructura Principal del Escritorio ---
    { id: 'desk-top', name: 'Tapa Escritorio', width: W, height: T, depth: D, x: W / 2, y: effectiveH - T / 2, z: 0, type: 'static' },
    { id: 'desk-leg-L', name: 'Lateral Izquierdo Escritorio', width: T, height: effectiveH - T, depth: D, x: T / 2, y: (effectiveH - T) / 2, z: 0, type: 'static' },
    { id: 'desk-back', name: 'Panel Trasero Estructural', width: W - cabinetW - T, height: effectiveH * 0.4, depth: T, x: (W - cabinetW) / 2, y: effectiveH - T - (effectiveH * 0.4) / 2, z: -D / 4, type: 'static' },

    // --- Módulo Cajonera (Estructura de Soporte) ---
    { id: 'mod-lat-L', name: 'Lateral Izquierdo Módulo', width: T, height: effectiveH - T, depth: D, x: W - cabinetW + T / 2, y: (effectiveH - T) / 2, z: 0, type: 'static' },
    { id: 'mod-lat-R', name: 'Lateral Derecho Módulo', width: T, height: effectiveH - T, depth: D, x: W - T / 2, y: (effectiveH - T) / 2, z: 0, type: 'static' },
    { id: 'mod-base', name: 'Base Inferior Módulo', width: cabinetInnerW, height: T, depth: D, x: cabinetCenterX, y: T / 2, z: 0, type: 'static' },
    { id: 'mod-back', name: 'Panel Trasero Módulo', width: cabinetInnerW, height: effectiveH - 2 * T, depth: 3, x: cabinetCenterX, y: effectiveH / 2, z: -D / 2 + 1.5, type: 'static' },
    { id: 'mod-rail-top', name: 'Travesaño Superior Módulo', width: cabinetInnerW, height: T, depth: 100, x: cabinetCenterX, y: cabinetTopY - T / 2, z: D / 2 - 50, type: 'static' },
  ];

  // --- Sistema de Cajones dentro del Módulo ---
  const drawerW = cabinetInnerW - 26; // Descuento de 26mm para rieles (13mm x 2)
  const drawerD = D - 40; // Margen trasero
  const drawerBoxH = 140; // Altura caja cajón
  const frontH = 190;

  // Ajuste de altura superior: el primer cajón comienza 10mm debajo de la tapa
  const startY = effectiveH - T - 10; 

  for (let i = 0; i < 2; i++) {
    // Calculamos la posición center Y para que el tope del primer frente esté a 10mm de la tapa
    const posY = startY - (frontH / 2) - (i * (frontH + 10));
    const prefix = `desk-drawer-${i}`;
    
    // 1. Frente del Cajón
    parts.push({ 
      id: `${prefix}-front`, 
      name: `Frente Cajón ${i + 1}`, 
      width: cabinetW - 4, 
      height: frontH, 
      depth: T, 
      x: cabinetCenterX, 
      y: posY, 
      z: D / 2 + T / 2, 
      type: 'drawer' 
    });
    
    // 2. Caja del Cajón (Piezas independientes)
    parts.push({ id: `${prefix}-side-L`, name: `Lateral Izq. Cajón ${i + 1}`, width: T, height: drawerBoxH, depth: drawerD, x: cabinetCenterX - drawerW / 2 + T / 2, y: posY, z: D / 2 - drawerD / 2, type: 'drawer' });
    parts.push({ id: `${prefix}-side-R`, name: `Lateral Der. Cajón ${i + 1}`, width: T, height: drawerBoxH, depth: drawerD, x: cabinetCenterX + drawerW / 2 - T / 2, y: posY, z: D / 2 - drawerD / 2, type: 'drawer' });
    parts.push({ id: `${prefix}-back`, name: `Trasera Cajón ${i + 1}`, width: drawerW - 2 * T, height: drawerBoxH, depth: T, x: cabinetCenterX, y: posY, z: D / 2 - drawerD + T / 2, type: 'drawer' });
    parts.push({ id: `${prefix}-bottom`, name: `Base Cajón ${i + 1}`, width: drawerW - 2 * T, height: 3, depth: drawerD - T, x: cabinetCenterX, y: posY - drawerBoxH / 2 + 1.5, z: D / 2 - drawerD / 2 + T / 2, type: 'drawer' });

    // 3. Rieles Metálicos (Fijos a los laterales del módulo)
    parts.push({ 
      id: `${prefix}-rail-L`, 
      name: `Riel Telescópico ${drawerD}mm`, 
      width: 13, height: 35, depth: drawerD, 
      x: W - cabinetW + T + 6.5, 
      y: posY, 
      z: D / 2 - drawerD / 2, 
      type: 'hardware', 
      isHardware: true 
    });
    parts.push({ 
      id: `${prefix}-rail-R`, 
      name: `Riel Telescópico ${drawerD}mm`, 
      width: 13, height: 35, depth: drawerD, 
      x: W - T - 6.5, 
      y: posY, 
      z: D / 2 - drawerD / 2, 
      type: 'hardware', 
      isHardware: true 
    });
  }

  return { parts, summary: 'Escritorio estructural Red Arquimax. Cajones con ajuste superior de 10mm y descuento técnico de rieles.' };
}
