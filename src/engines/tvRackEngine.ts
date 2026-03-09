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

  // Cajones (Descuento herraje: 26mm)
  const slideClearance = 26;
  const drawerW = (W - 3*T) / 2 - 4;
  const drawerBoxW = drawerW - slideClearance;
  const drawerH = H - 2*T - 20;
  const drawerD = D * 0.8;

  const drawerConfigs = [
    { x: T + drawerW/2 + 2, id: '1' },
    { x: W - T - drawerW/2 - 2, id: '2' }
  ];

  drawerConfigs.forEach((config) => {
    const prefix = `cajon-${config.id}`;
    const posY = H/2;
    const posZ_frente = D/2 + T/2;

    // Frente
    parts.push({ id: `${prefix}-frente`, name: `Frente Cajón ${config.id}`, width: drawerW, height: drawerH, depth: T, x: config.x, y: posY, z: posZ_frente, type: 'drawer' });
    // Estructura interna
    parts.push({ id: `${prefix}-lat-izq`, name: `Lat. Izq. Cajón ${config.id}`, width: T, height: drawerH * 0.6, depth: drawerD, x: config.x - drawerBoxW/2 + T/2, y: posY, z: posZ_frente - drawerD/2 - T/2, type: 'drawer' });
    parts.push({ id: `${prefix}-lat-der`, name: `Lat. Der. Cajón ${config.id}`, width: T, height: drawerH * 0.6, depth: drawerD, x: config.x + drawerBoxW/2 - T/2, y: posY, z: posZ_frente - drawerD/2 - T/2, type: 'drawer' });
    parts.push({ id: `${prefix}-fondo`, name: `Contrafrente Cajón ${config.id}`, width: drawerBoxW - 2*T, height: drawerH * 0.6, depth: T, x: config.x, y: posY, z: posZ_frente - drawerD, type: 'drawer' });
    parts.push({ id: `${prefix}-piso`, name: `Piso Cajón ${config.id}`, width: drawerBoxW - 2*T, height: 3, depth: drawerD - T, x: config.x, y: posY - (drawerH * 0.6)/2 + 1.5, z: posZ_frente - drawerD/2, type: 'drawer' });
    
    // Herrajes
    parts.push({ id: `${prefix}-guia`, name: 'Juego Guías Telescópicas', width: 0, height: 0, depth: drawerD, x: 0, y: 0, z: 0, type: 'hardware', isHardware: true });
  });

  return { parts, summary: 'Rack TV con descuentos para guías telescópicas.' };
}
