
import { Drawing, DrawingElement, Sheet } from '../models/PlanModels';
import { TitleBlock } from './TitleBlock';

export class SheetComposer {
  private static readonly A3_WIDTH = 1122; // px approx for scale
  private static readonly A3_HEIGHT = 794;

  public static compose(sheet: Sheet): Drawing {
    const drawing = sheet.drawing;
    
    // Centrar el dibujo en la hoja
    const offsetX = (this.A3_WIDTH - drawing.width) / 2;
    const offsetY = (this.A3_HEIGHT - drawing.height) / 2;

    const translatedElements = drawing.elements.map(el => this.translate(el, offsetX, offsetY));
    
    const titleBlock = TitleBlock.build(
      this.A3_WIDTH, 
      this.A3_HEIGHT, 
      sheet.sheetNumber, 
      sheet.title, 
      sheet.projectName,
      sheet.scale
    );

    return {
      elements: [...translatedElements, ...titleBlock],
      width: this.A3_WIDTH,
      height: this.A3_HEIGHT,
      scale: drawing.scale,
      title: sheet.title
    };
  }

  private static translate(el: DrawingElement, x: number, y: number): DrawingElement {
    switch (el.type) {
      case 'line':
        return { ...el, p1: { x: el.p1.x + x, y: el.p1.y + y }, p2: { x: el.p2.x + x, y: el.p2.y + y } };
      case 'rect':
        return { ...el, x: el.x + x, y: el.y + y };
      case 'text':
        return { ...el, x: el.x + x, y: el.y + y };
      case 'circle':
        return { ...el, x: el.x + x, y: el.y + y };
      default:
        return el;
    }
  }
}
