import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Sheet, DrawingElement } from '../models/PlanModels';

export class PdfRenderer {
  public static async generate(sheets: Sheet[], projectName: string): Promise<jsPDF> {
    // Usamos orientación landscape para A3 (aunque jspdf escala)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: 'a3'
    });

    for (let i = 0; i < sheets.length; i++) {
      if (i > 0) doc.addPage();
      const sheet = sheets[i];
      this.renderSheet(doc, sheet);
    }

    return doc;
  }

  private static renderSheet(doc: jsPDF, sheet: Sheet) {
    const elements = sheet.drawing.elements;
    
    elements.forEach(el => {
      this.renderElement(doc, el);
    });
  }

  private static renderElement(doc: jsPDF, el: DrawingElement) {
    doc.setLineWidth(el.strokeWidth || 1);
    
    switch (el.type) {
      case 'line':
        doc.setDrawColor(el.stroke);
        doc.line(el.p1.x, el.p1.y, el.p2.x, el.p2.y);
        break;
      case 'rect':
        if (el.fill) {
          doc.setFillColor(el.fill);
          doc.rect(el.x, el.y, el.w, el.h, 'FD');
        } else {
          doc.setDrawColor(el.stroke);
          doc.rect(el.x, el.y, el.w, el.h, 'D');
        }
        break;
      case 'circle':
        doc.setFillColor(el.fill);
        doc.circle(el.x, el.y, el.r, 'FD');
        break;
      case 'text':
        doc.setTextColor(el.color);
        doc.setFontSize(el.fontSize);
        const fontStyle = el.fontWeight === 'bold' ? 'bold' : 'normal';
        doc.setFont('helvetica', fontStyle);
        
        let x = el.x;
        if (el.align === 'center') {
          const textWidth = doc.getTextWidth(el.content);
          x -= textWidth / 2;
        } else if (el.align === 'right') {
          const textWidth = doc.getTextWidth(el.content);
          x -= textWidth;
        }
        
        doc.text(el.content, x, el.y, {
          angle: el.rotate || 0
        });
        break;
    }
  }
}
