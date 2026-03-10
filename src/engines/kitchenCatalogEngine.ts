import { Part, FurnitureDimensions, FurnitureModel, FurnitureType } from '@/lib/types';

/**
 * Motor de Catálogo Red Arquimax (Inspirado en Dielfe)
 * Genera el despiece industrial basado en configuraciones estándar de mercado.
 */
export function kitchenCatalogEngine(type: FurnitureType, dim: FurnitureDimensions): FurnitureModel {
  const T = dim.thickness || 18;
  const { width: W, height: H, depth: D, hasBack, hasShelf } = dim;
  const innerW = W - 2 * T;
  const parts: Part[] = [];

  // 1. Estructura Básica (Caja)
  // Laterales
  parts.push({ id: 'lat-L', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: T / 2, y: H / 2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' });
  parts.push({ id: 'lat-R', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T / 2, y: H / 2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' });

  // Base y Amarres (Bajos) o Tapa (Alacenas)
  const isBase = type.includes('base') || type.includes('pantry') || type.includes('microwave');
  
  if (isBase) {
    parts.push({ id: 'base', name: 'Base Inferior', width: innerW, height: T, depth: D, x: W / 2, y: T / 2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: 'amarre-F', name: 'Amarre Frontal', width: innerW, height: T, depth: 60, x: W / 2, y: H - T / 2, z: D / 2 - 30, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: 'amarre-B', name: 'Amarre Trasero', width: innerW, height: 60, depth: T, x: W / 2, y: H - 30, z: -D / 2 + T / 2, type: 'static', cutLargo: innerW, cutAncho: 60, cutEspesor: T, grainDirection: 'horizontal' });
  } else {
    parts.push({ id: 'base', name: 'Base Inferior', width: innerW, height: T, depth: D, x: W / 2, y: T / 2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' });
    parts.push({ id: 'tapa', name: 'Tapa Superior', width: innerW, height: T, depth: D, x: W / 2, y: H - T / 2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' });
  }

  // Fondo
  if (hasBack || type.includes('pantry') || type.includes('wall')) {
    parts.push({ id: 'fondo', name: 'Fondo MDF 3mm', width: W, height: H, depth: 3, x: W / 2, y: H / 2, z: -D / 2 - 1.5, type: 'static', cutLargo: H, cutAncho: W, cutEspesor: 3, grainDirection: 'libre' });
  }

  let hasDoors = false;
  let hasDrawers = false;

  // Lógica de Puertas y Cajones según Modelo
  switch (type) {
    case 'cabinet_base_120_2p3c':
    case 'cabinet_base_140_3p3c': {
      hasDoors = true;
      hasDrawers = true;
      const drawerSectW = 400;
      const doorSectW = W - drawerSectW;
      
      // Divisor vertical
      parts.push({ id: 'divisor', name: 'Divisor Vertical', width: T, height: H - T, depth: D * 0.9, x: doorSectW - T / 2, y: H / 2 + T / 2, z: 0, type: 'static', cutLargo: H - T, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'vertical' });

      // Cajones (3 unidades)
      const drH = (H - T - 20) / 3;
      for (let i = 0; i < 3; i++) {
        const py = T + 10 + (i * (drH + 5)) + drH / 2;
        const gId = `drawer-${i}`;
        parts.push({ id: `${gId}-front`, groupId: gId, name: `Frente Cajón ${i+1}`, width: drawerSectW - 4, height: drH - 2, depth: T, x: W - drawerSectW / 2, y: py, z: D / 2 + T / 2, type: 'drawer', cutLargo: drH - 2, cutAncho: drawerSectW - 4, cutEspesor: T, grainDirection: 'horizontal' });
      }

      // Puertas
      const numDoors = type.includes('140') ? 2 : 2; // Simplificado a 2 puertas grandes
      const doorW = (doorSectW - T) / numDoors - 2;
      for (let i = 0; i < numDoors; i++) {
        const px = (i * (doorW + 2)) + doorW / 2 + T;
        const dId = `door-${i}`;
        parts.push({ id: dId, name: `Puerta ${i+1}`, width: doorW, height: H - 5, depth: T, x: px, y: H / 2, z: D / 2 + T / 2, type: i === 0 ? 'door-left' : 'door-right', pivot: { x: i === 0 ? T : doorSectW - T, y: H / 2, z: D / 2 }, cutLargo: H - 5, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      }
      break;
    }

    case 'cabinet_wall_60_1p':
    case 'cabinet_wall_120_3p':
    case 'cabinet_wall_140_3p':
    case 'cabinet_hood_60': {
      hasDoors = true;
      const numDoors = type.includes('60') ? 1 : 3;
      const doorW = (W - 4) / numDoors;
      for (let i = 0; i < numDoors; i++) {
        const dId = `door-wall-${i}`;
        parts.push({ id: dId, name: `Puerta Alacena ${i+1}`, width: doorW, height: H - 4, depth: T, x: (i * doorW) + doorW / 2, y: H / 2, z: D / 2 + T / 2, type: i % 2 === 0 ? 'door-left' : 'door-right', pivot: { x: i % 2 === 0 ? (i * doorW) : ((i + 1) * doorW), y: H / 2, z: D / 2 }, cutLargo: H - 4, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      }
      if (hasShelf) {
        parts.push({ id: 'shelf', name: 'Estante Alacena', width: innerW - 2, height: T, depth: D * 0.9, x: W / 2, y: H / 2, z: 0, type: 'static', cutLargo: innerW - 2, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'horizontal' });
      }
      break;
    }

    case 'cabinet_pantry_60_2p': {
      hasDoors = true;
      const doorH = (H - 10) / 2;
      parts.push({ id: 'door-up', name: 'Puerta Superior', width: W - 4, height: doorH, depth: T, x: W / 2, y: H - doorH / 2 - 2, z: D / 2 + T / 2, type: 'door-left', pivot: { x: 0, y: H - doorH / 2, z: D / 2 }, cutLargo: doorH, cutAncho: W - 4, cutEspesor: T, grainDirection: 'vertical' });
      parts.push({ id: 'door-down', name: 'Puerta Inferior', width: W - 4, height: doorH, depth: T, x: W / 2, y: doorH / 2 + 2, z: D / 2 + T / 2, type: 'door-left', pivot: { x: 0, y: doorH / 2, z: D / 2 }, cutLargo: doorH, cutAncho: W - 4, cutEspesor: T, grainDirection: 'vertical' });
      for (let i = 1; i <= 4; i++) {
        parts.push({ id: `shelf-${i}`, name: `Estante Despensero ${i}`, width: innerW - 2, height: T, depth: D * 0.95, x: W / 2, y: (H / 5) * i, z: 0, type: 'static', cutLargo: innerW - 2, cutAncho: D * 0.95, cutEspesor: T, grainDirection: 'horizontal' });
      }
      break;
    }

    case 'cabinet_microwave_60': {
      hasDoors = true;
      const nicheH = 450;
      parts.push({ id: 'shelf-micro', name: 'Piso Microondas', width: innerW, height: T, depth: D, x: W / 2, y: H * 0.4, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' });
      parts.push({ id: 'door-base', name: 'Puerta Inferior', width: W - 4, height: H * 0.4 - 20, depth: T, x: W / 2, y: (H * 0.4) / 2, z: D / 2 + T / 2, type: 'door-left', pivot: { x: 0, y: (H * 0.4) / 2, z: D / 2 }, cutLargo: H * 0.4 - 20, cutAncho: W - 4, cutEspesor: T, grainDirection: 'vertical' });
      break;
    }

    case 'cabinet_base_single_60_1p':
    case 'cabinet_base_double_80_2p': {
      hasDoors = true;
      const numDoors = type.includes('single') ? 1 : 2;
      const doorW = (W - 4) / numDoors;
      for (let i = 0; i < numDoors; i++) {
        const dId = `door-base-std-${i}`;
        parts.push({ id: dId, name: `Puerta Bajo ${i+1}`, width: doorW, height: H - 10, depth: T, x: (i * doorW) + doorW / 2, y: H / 2, z: D / 2 + T / 2, type: i === 0 ? 'door-left' : 'door-right', pivot: { x: i === 0 ? 0 : W, y: H / 2, z: D / 2 }, cutLargo: H - 10, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical' });
      }
      break;
    }
  }

  return { 
    parts, 
    summary: `Módulo de catálogo tipo ${type.replace(/_/g, ' ').toUpperCase()}. Estructura industrial Red Arquimax.`, 
    hasDoors, 
    hasDrawers 
  };
}
