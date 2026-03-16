
import { DrawingElement } from '../models/PlanModels';

export class TitleBlock {
  public static build(
    width: number, 
    height: number, 
    sheetNumber: string, 
    title: string, 
    project: string,
    scale: string
  ): DrawingElement[] {
    const margin = 20;
    const blockW = 250;
    const blockH = 100;
    const startX = width - margin - blockW;
    const startY = height - margin - blockH;

    return [
      // Border principal
      { type: 'rect', x: margin, y: margin, w: width - margin * 2, h: height - margin * 2, stroke: '#000', strokeWidth: 2 },
      // Rótulo
      { type: 'rect', x: startX, y: startY, w: blockW, h: blockH, fill: '#fff', stroke: '#000', strokeWidth: 1 },
      // Líneas internas
      { type: 'line', p1: { x: startX, y: startY + 30 }, p2: { x: startX + blockW, y: startY + 30 }, stroke: '#000', strokeWidth: 0.5 },
      { type: 'line', p1: { x: startX + 180, y: startY + 30 }, p2: { x: startX + 180, y: startY + blockH }, stroke: '#000', strokeWidth: 0.5 },
      
      // Textos
      { type: 'text', x: startX + 10, y: startY + 20, content: project.toUpperCase(), fontSize: 14, fontWeight: 'bold', color: '#000' },
      { type: 'text', x: startX + 10, y: startY + 50, content: title, fontSize: 12, color: '#000' },
      { type: 'text', x: startX + 10, y: startY + 80, content: `ESCALA: ${scale}`, fontSize: 10, color: '#666' },
      { type: 'text', x: startX + 190, y: startY + 70, content: sheetNumber, fontSize: 30, fontWeight: 'bold', color: '#000' },
      { type: 'text', x: startX + 190, y: startY + 90, content: 'HOJA', fontSize: 8, color: '#666' }
    ];
  }
}
