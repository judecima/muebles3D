import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function tvRackEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, depth: D, thickness: T } = dim;
  const H = 500; // Altura fija obligatoria Red Arquimax

  const parts: Part[] = [
    { id: 'base', name: 'Base Principal', width: W, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'tapa', name: 'Tapa Superior', width: W, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static', cutLargo: W, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H - 2*T, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: H - 2*T, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H - 2*T, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: H - 2*T, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'divisor', name: 'Divisor Central', width: T, height: H - 2*T, depth: D * 0.9, x: W/2, y: H/2, z: 0, type: 'static', cutLargo: H - 2*T, cutAncho: D * 0.9, cutEspesor: T, grainDirection: 'vertical' },
  ];

  const railSpace = 26;
  const compW = (W - 3*T) / 2;
  const drawerW = compW - railSpace;
  const drawerD = D - 40;
  const drawerH = H - 2*T - 30;

  const drawerConfigs = [
    { x: T + compW/2, id: '1', railLX: T + 6.5, railRX: W/2 - T/2 - 6.5 },
    { x: W - T - compW/2, id: '2', railLX: W/2 + T/2 + 6.5, railRX: W - T - 6.5 }
  ];

  drawerConfigs.forEach((config) => {
    const prefix = `cajon-${config.id}`;
    const posY = H/2;

    parts.push({ id: `${prefix}-frente`, name: `Frente Cajón ${config.id}`, width: compW - 4, height: H - 2*T - 4, depth: T, x: config.x, y: posY, z: D/2 + T/2, type: 'drawer', cutLargo: H - 2*T - 4, cutAncho: compW - 4, cutEspesor: T, grainDirection: 'vertical' });
    parts.push({ id: `${prefix}-lat-izq`, name: `Lateral Izq. Cajón ${config.id}`, width: T, height: drawerH, depth: drawerD, x: config.x - drawerW/2 + T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-lat-der`, name: `Lateral Der. Cajón ${config.id}`, width: T, height: drawerH, depth: drawerD, x: config.x + drawerW/2 - T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer', cutLargo: drawerD, cutAncho: drawerH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-trasera`, name: `Trasera Cajón ${config.id}`, width: drawerW - 2*T, height: drawerH, depth: T, x: config.x, y: posY, z: D/2 - drawerD + T/2, type: 'drawer', cutLargo: drawerW - 2*T, cutAncho: drawerH, cutEspesor: T, grainDirection: 'libre' });
    parts.push({ id: `${prefix}-piso`, name: `Piso Cajón ${config.id}`, width: drawerW - 2*T, height: 3, depth: drawerD - T, x: config.x, y: posY - drawerH/2 + 1.5, z: D/2 - drawerD/2 + T/2, type: 'drawer', cutLargo: drawerD - T, cutAncho: drawerW - 2*T, cutEspesor: 3, grainDirection: 'libre' });
    
    parts.push({ 
      id: `${prefix}-riel-L`, name: `Riel Telescópico ${drawerD}mm`, 
      width: 13, height: 35, depth: drawerD, 
      x: config.railLX, y: posY, z: D/2 - drawerD/2, 
      type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
    });
    parts.push({ 
      id: `${prefix}-riel-R`, name: `Riel Telescópico ${drawerD}mm`, 
      width: 13, height: 35, depth: drawerD, 
      x: config.railRX, y: posY, z: D/2 - drawerD/2, 
      type: 'hardware', isHardware: true, cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'libre'
    });
  });

  return { parts, summary: 'Rack TV Red Arquimax con altura fija de 500mm y cajones técnicos.', hasDoors: false, hasDrawers: true };
}
