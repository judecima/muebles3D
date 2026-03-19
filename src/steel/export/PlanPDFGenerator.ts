import jsPDF from 'jspdf';
import { SteelWall } from '@/lib/steel/types';

export function exportWallPDF(wall: SteelWall, panels: any[]) {
  const doc = new jsPDF();

  doc.text(`Muro: ${wall.id}`, 10, 10);

  let y = 20;

  panels.forEach(p => {
    doc.text(
      `${p.id} - ${(p.width / 1000).toFixed(2)} m`,
      10,
      y
    );
    y += 10;
  });

  doc.save(`muro_${wall.id}.pdf`);
}