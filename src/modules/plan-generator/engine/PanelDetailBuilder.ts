
import { SteelWall, InternalWall } from '@/lib/steel/types';
import { Drawing, DrawingElement } from '../models/PlanModels';

export class PanelDetailBuilder {
  public static build(wall: SteelWall | InternalWall, label: string): Drawing {
    const elements: DrawingElement[] = [];
    const scale = 0.2; // 1:50 approx
    const padding = 100;
    const h = wall.height * scale;
    const w = wall.length * scale;

    // Soleras Superior e Inferior
    elements.push({ type: 'rect', x: padding, y: padding, w: w, h: 10, stroke: '#000', strokeWidth: 1, fill: '#ddd' });
    elements.push({ type: 'rect', x: padding, y: padding + h - 10, w: w, h: 10, stroke: '#000', strokeWidth: 1, fill: '#ddd' });

    // Montantes
    const spacing = ('studSpacing' in wall) ? wall.studSpacing : 400;
    for (let x = 0; x <= wall.length; x += spacing) {
      const drawX = padding + x * scale;
      elements.push({ type: 'rect', x: drawX - 2, y: padding, w: 4, h: h, stroke: '#333', strokeWidth: 0.5, fill: '#ccc' });
    }

    // Aberturas
    wall.openings.forEach(op => {
      const opX = padding + op.position * scale;
      const opW = op.width * scale;
      const opH = op.height * scale;
      const sill = (op.type === 'window' ? (op.sillHeight || 900) : 0) * scale;
      const opY = padding + h - sill - opH;

      // Vano
      elements.push({ type: 'rect', x: opX, y: opY, w: opW, h: opH, stroke: '#ff0000', strokeWidth: 1.5 });
      
      // Kings
      elements.push({ type: 'rect', x: opX - 5, y: padding, w: 5, h: h, stroke: '#000', strokeWidth: 1, fill: '#fbb' });
      elements.push({ type: 'rect', x: opX + opW, y: padding, w: 5, h: h, stroke: '#000', strokeWidth: 1, fill: '#fbb' });
      
      // Dintel
      elements.push({ type: 'rect', x: opX, y: opY - 10, w: opW, h: 10, stroke: '#000', strokeWidth: 1, fill: '#bfb' });
    });

    return {
      elements,
      width: w + padding * 2,
      height: h + padding * 2,
      scale: 50,
      title: `DETALLE DE PANEL - ${label}`
    };
  }
}
