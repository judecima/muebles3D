
import { Drawing, DrawingElement } from '../models/PlanModels';

export class SvgRenderer {
  public static render(drawing: Drawing): string {
    const elements = drawing.elements.map(el => this.renderElement(el)).join('\n');
    return `
      <svg viewBox="0 0 ${drawing.width} ${drawing.height}" xmlns="http://www.w3.org/2000/svg" style="background: white;">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
          </marker>
        </defs>
        ${elements}
      </svg>
    `;
  }

  private static renderElement(el: DrawingElement): string {
    switch (el.type) {
      case 'line':
        return `<line x1="${el.p1.x}" y1="${el.p1.y}" x2="${el.p2.x}" y2="${el.p2.y}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" stroke-dasharray="${el.dashArray || ''}" />`;
      case 'rect':
        return `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" fill="${el.fill || 'none'}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" />`;
      case 'text':
        return `<text x="${el.x}" y="${el.y}" font-family="Arial, sans-serif" font-size="${el.fontSize}" font-weight="${el.fontWeight || 'normal'}" text-anchor="${el.align || 'left'}" fill="${el.color}" transform="${el.rotate ? `rotate(${el.rotate}, ${el.x}, ${el.y})` : ''}">${el.content}</text>`;
      case 'circle':
        return `<circle cx="${el.x}" cy="${el.y}" r="${el.r}" fill="${el.fill}" stroke="${el.stroke || 'none'}" />`;
      default:
        return '';
    }
  }
}
