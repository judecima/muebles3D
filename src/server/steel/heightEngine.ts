import { SteelHouseConfig, SteelWall, InternalWall } from '@/lib/steel/types';

export class HeightEngine {
  /**
   * Resuelve las alturas de cada muro basándose en su conexión y la altura global.
   * Si no se especifican alturas individuales, usa la global.
   * Implementa la lógica de 'Auto-Cierre' para pendientes.
   */
  static resolveWallHeights(config: SteelHouseConfig) {
    const globalH = config.globalWallHeight || 2700;

    // 1. Inicializar alturas si no existen
    config.walls.forEach(w => {
      if (w.heightStart === undefined) w.heightStart = w.height || globalH;
      if (w.heightEnd === undefined) w.heightEnd = w.height || globalH;
    });

    config.internalWalls.forEach(iw => {
       if (iw.heightStart === undefined) iw.heightStart = iw.height || globalH;
       if (iw.heightEnd === undefined) iw.heightEnd = iw.height || globalH;
    });

    // 2. Lógica de Sincronización de Pendientes (Rectangular por ahora)
    // Buscamos muros paralelos con distinto alto para inclinar los perpendiculares
    const frontWall = config.walls.find(w => w.id.toLowerCase().includes('frente') || w.id.toLowerCase().includes('front'));
    const backWall = config.walls.find(w => w.id.toLowerCase().includes('fondo') || w.id.toLowerCase().includes('back'));

    if (frontWall && backWall && frontWall.heightStart !== backWall.heightStart) {
      const hFront = frontWall.heightStart!;
      const hBack = backWall.heightStart!;
      
      // Los muros laterales (perpendiculares) deben adaptarse
      config.walls.forEach(w => {
        const rot = Math.abs(w.rotation % 180);
        if (rot === 90) {
            // Es un muro lateral. Debe ir de hFront a hBack (o viceversa según su posición)
            // Simplificación: si está a la izquierda (x min) o derecha (x max)
            const isLeft = w.x < (config.width / 4); 
            // Esto es heurístico, en una app real usaríamos grafos de conexión
            w.heightStart = hFront;
            w.heightEnd = hBack;
        }
      });
    }

    return config;
  }

  /**
   * Obtiene la altura interpolada en un punto X de un muro
   */
  static getInterpolatedHeight(wall: SteelWall | InternalWall, x: number): number {
    const hS = wall.heightStart || wall.height;
    const hE = wall.heightEnd || wall.height;
    const L = wall.length;
    if (L === 0) return hS;
    return hS + (x / L) * (hE - hS);
  }
}
