import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function tvRackEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;

  const parts: Part[] = [
    { id: 'base', name: 'Base Principal', width: W, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static' },
    { id: 'tapa', name: 'Tapa Superior', width: W, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static' },
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H - 2*T, depth: D, x: T/2, y: H/2, z: 0, type: 'static' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H - 2*T, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static' },
    { id: 'divisor', name: 'Divisor Central', width: T, height: H - 2*T, depth: D * 0.9, x: W/2, y: H/2, z: 0, type: 'static' },
  ];

  const slideClearance = 26;
  const drawerW = (W - 3*T) / 2 - 4;
  const drawerBoxW = drawerW - slideClearance;
  const drawerH = H - 2*T - 30;
  const drawerD = D * 0.8;

  const drawerConfigs = [
    { x: T + drawerW/2 + 2, id: '1', railLX: T + 6, railRX: W/2 - T/2 - 6 },
    { x: W - T - drawerW/2 - 2, id: '2', railLX: W/2 + T/2 + 6, railRX: W - T - 6 }
  ];

  drawerConfigs.forEach((config) => {
    const prefix = `cajon-${config.id}`;
    const posY = H/2;

    // Frente
    parts.push({ id: `${prefix}-frente`, name: `Frente Cajón ${config.id}`, width: drawerW, height: H - 2*T - 4, depth: T, x: config.x, y: posY, z: D/2 + T/2, type: 'drawer' });
    
    // Caja
    parts.push({ id: `${prefix}-lat-izq`, name: `Lat. Izq. Cajón ${config.id}`, width: T, height: drawerH, depth: drawerD, x: config.x - drawerBoxW/2 + T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer' });
    parts.push({ id: `${prefix}-lat-der`, name: `Lat. Der. Cajón ${config.id}`, width: T, height: drawerH, depth: drawerD, x: config.x + drawerBoxW/2 - T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer' });
    parts.push({ id: `${prefix}-trasera`, name: `Trasera Cajón ${config.id}`, width: drawerBoxW - 2*T, height: drawerH, depth: T, x: config.x, y: posY, z: D/2 - drawerD + T/2, type: 'drawer' });
    parts.push({ id: `${prefix}-piso`, name: `Piso Cajón ${config.id}`, width: drawerBoxW - 2*T, height: 3, depth: drawerD - T, x: config.x, y: posY - drawerH/2 + 1.5, z: D/2 - drawerD/2 + T/2, type: 'drawer' });
    
    // Rieles
    parts.push({ id: `${prefix}-riel-L`, name: `Riel Izq. Cajón ${config.id}`, width: 12, height: 45, depth: drawerD, x: config.railLX, y: posY, z: D/2 - drawerD/2, type: 'hardware', isHardware: true });
    parts.push({ id: `${prefix}-riel-R`, name: `Riel Der. Cajón ${config.id}`, width: 12, height: 45, depth: drawerD, x: config.railRX, y: posY, z: D/2 - drawerD/2, type: 'hardware', isHardware: true });
  });

  return { parts, summary: 'Rack TV con cajones técnicos y rieles metálicos.' };
}
