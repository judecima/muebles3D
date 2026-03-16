
import { SteelHouseConfig } from '@/lib/steel/types';
import { Drawing, DrawingElement } from '../models/PlanModels';

export class FloorPlanBuilder {
  public static build(config: SteelHouseConfig): Drawing {
    const elements: DrawingElement[] = [];
    const scale = 0.1; // 1:100 approx
    const padding = 100;

    // Dibujar muros perimetrales
    config.walls.forEach((wall, idx) => {
      const x = wall.x * scale + padding;
      const z = wall.z * scale + padding;
      const len = wall.length * scale;
      const thk = wall.thickness * scale;
      const rad = (wall.rotation * Math.PI) / 180;

      elements.push({
        type: 'rect',
        x: x,
        y: z,
        w: len,
        h: thk,
        stroke: '#000',
        strokeWidth: 1,
        fill: '#eee'
      });

      // Etiqueta de Panel
      elements.push({
        type: 'text',
        x: x + len / 2,
        y: z - 10,
        content: `PEX-${idx + 1}`,
        fontSize: 12,
        fontWeight: 'bold',
        align: 'center',
        color: '#000'
      });
    });

    // Cotas generales
    elements.push({
      type: 'line',
      p1: { x: padding, y: padding - 40 },
      p2: { x: padding + config.width * scale, y: padding - 40 },
      stroke: '#000',
      strokeWidth: 0.5
    });
    elements.push({
      type: 'text',
      x: padding + (config.width * scale) / 2,
      y: padding - 50,
      content: `${config.width} mm`,
      fontSize: 10,
      align: 'center',
      color: '#000'
    });

    return {
      elements,
      width: config.width * scale + padding * 2,
      height: config.length * scale + padding * 2,
      scale: 100,
      title: 'PLANTA DE REPLANTEO'
    };
  }
}
