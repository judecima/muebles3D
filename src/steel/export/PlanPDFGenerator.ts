import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SteelWall, WallPanelData, InternalWall, SteelHouseConfig } from '@/lib/steel/types';
import { StructuralEngine } from '@/server/steel/structuralEngine';

export function exportWallPDF(wall: SteelWall | InternalWall, panels: WallPanelData[], config: SteelHouseConfig) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const wallName = ('id' in wall) ? wall.id : 'Muro';

  panels.forEach((panel, index) => {
    if (index > 0) doc.addPage();

    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Encabezado
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`PLANO DE FABRICACIÓN: PANEL ${panel.id}`, margin, margin);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Proyecto: Muebles3D Steel Frame`, margin, margin + 7);
    doc.text(`Muro Padre: ${wallName} | Largo: ${panel.width}mm | Alto: ${wall.height}mm`, margin, margin + 12);

    // Dibujo del Panel (Proyección Frontal)
    const drawWidth = pageWidth - (margin * 2);
    const drawHeight = (pageHeight / 2) - margin;
    const scale = Math.min(drawWidth / panel.width, drawHeight / wall.height);
    
    const startX = margin + (drawWidth - (panel.width * scale)) / 2;
    const startY = margin + 25 + (drawHeight - (wall.height * scale));

    // Dibujar Soleras (PGU)
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    // Solera Inferior
    doc.rect(startX, startY + (wall.height - 40) * scale, panel.width * scale, 40 * scale);
    // Solera Superior
    doc.rect(startX, startY, panel.width * scale, 40 * scale);

    // Dibujar Montantes (PGC)
    const studSpacing = ('studSpacing' in wall) ? (wall as SteelWall).studSpacing : 400;
    for (let x = 0; x <= panel.width; x += studSpacing) {
        const sx = Math.min(x, panel.width - 40);
        doc.rect(startX + sx * scale, startY + 40 * scale, 40 * scale, (wall.height - 80) * scale);
        
        // Etiqueta de Montante (S = Stud)
        doc.setFontSize(6);
        doc.text(`S-${Math.round(x/studSpacing)}`, startX + sx * scale + 1, startY + 50 * scale);
    }

    // Dibujar Tornillos (Marcas de Posición)
    doc.setDrawColor(255, 0, 0);
    doc.setLineWidth(0.2);
    panel.fasteners.forEach(f => {
        const fx = startX + f.x * scale;
        const fy = startY + (wall.height - f.y) * scale;
        // Dibujar una pequeña X
        doc.line(fx - 1, fy - 1, fx + 1, fy + 1);
        doc.line(fx + 1, fy - 1, fx - 1, fy + 1);
    });

    // Acotado
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    // Cota Total
    doc.line(startX, startY + (wall.height + 10) * scale, startX + panel.width * scale, startY + (wall.height + 10) * scale);
    doc.text(`${panel.width} mm`, startX + (panel.width * scale / 2) - 5, startY + (wall.height + 15) * scale);

    // Tabla de Listado de Corte
    const cutList = [
        ['ID', 'Tipo', 'Largo (mm)', 'Cant.', 'Función'],
        ['T-INF', 'PGU 100', panel.width.toString(), '1', 'Solera Inferior'],
        ['T-SUP', 'PGU 100', panel.width.toString(), '1', 'Solera Superior'],
        ['S-STD', 'PGC 100', (wall.height - 80).toString(), Math.ceil(panel.width / studSpacing + 1).toString(), 'Montante Estándar']
    ];

    autoTable(doc, {
        startY: pageHeight / 2 + 10,
        head: [cutList[0]],
        body: cutList.slice(1),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [40, 40, 40] }
    });

    // Resumen de Tornillería
    const t1Count = panel.fasteners.filter(f => f.type === 'T1').length;
    const t3Count = panel.fasteners.filter(f => f.type === 'T3').length;

    const screwY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE FIJACIONES', margin, screwY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tornillos T1 (Punta Aguja): ${t1Count || 0} unidades`, margin, screwY + 5);
    doc.text(`Tornillos T3 (Punta Mecha): ${t3Count || 0} unidades`, margin, screwY + 10);
    doc.text(`Nota: Las posiciones marcadas con 'X' indican puntos de atornillado estructural.`, margin, screwY + 15);
  });

  const mMargin = 20;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text("MEMORIA DE CÁLCULO ESTRUCTURAL", mMargin, mMargin);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Justificación técnica según normativa AISI S100 - Panel ID: ${wallName}`, mMargin, mMargin + 10);
  
  doc.setDrawColor(30, 41, 59);
  doc.line(mMargin, mMargin + 15, 270, mMargin + 15);

  let curY = mMargin + 25;

  // 1. Análisis de Vanos y Dinteles
  doc.setFont('helvetica', 'bold');
  doc.text("1. ANÁLISIS DE VANOS Y DINTELES", mMargin, curY);
  curY += 10;
  
  wall.openings.forEach((op, i) => {
    const analysis = StructuralEngine.calculateHeader(op, wall.length, config, wall.height);
    const mech = StructuralEngine.analyzeStructuralElement(analysis.type === 'truss' ? 'PGC-100-1.25' : 'PGC-100-0.9', op.width, analysis.loadNmm * 100, analysis.type === 'tube' ? 'tube' : (analysis.type === 'truss' ? 'truss' : 'simple'));

    doc.setFont('helvetica', 'bold');
    doc.text(`Vano ${i+1}: ${op.type.toUpperCase()} (${op.width}x${op.height}mm)`, mMargin + 5, curY);
    curY += 5;
    doc.setFont('helvetica', 'normal');
    
    doc.text(`- Solución: ${analysis.type.toUpperCase()} | Perfil: ${mech.isSafe ? 'VERIFICA' : 'REFORZAR'}`, mMargin + 10, curY);
    curY += 5;
    doc.text(`- ${mech.description}`, mMargin + 10, curY);
    curY += 8;
  });

  // 2. Descenso de Cargas (Load Path)
  const lp = StructuralEngine.calculateVerticalLoadPath(config);
  doc.setFont('helvetica', 'bold');
  doc.text("2. ANÁLISIS DE DESCENSO DE CARGAS (LOAD PATH)", mMargin, curY);
  curY += 10;
  doc.setFont('helvetica', 'normal');
  doc.text(`- Reacción de Apoyo Cubierta: ${lp.roofReactionKg.toFixed(2)} kg`, mMargin + 5, curY);
  curY += 5;
  doc.text(`- Carga Acumulada Entrepiso: ${lp.floorBeamLoadKg.toFixed(2)} kg`, mMargin + 5, curY);
  curY += 5;
  doc.text(`- Carga Final en Pilotón: ${lp.foundationPointLoadKg.toFixed(2)} kg`, mMargin + 5, curY);
  curY += 5;
  doc.text(`- Estado de Fundación: ${lp.alerts}`, mMargin + 5, curY);

  // 3. Estabilidad Lateral (Viento)
  const stab = StructuralEngine.calculateLateralStability(config);
  curY += 10;
  doc.setFont('helvetica', 'bold');
  doc.text("3. ANÁLISIS DE ESTABILIDAD LATERAL (VIENTO)", mMargin, curY);
  curY += 10;
  doc.setFont('helvetica', 'normal');
  doc.text(`- Fuerza de Viento Total (Dir. X): ${stab.windForceX.toFixed(2)} kN`, mMargin + 5, curY);
  curY += 5;
  doc.text(`- Fuerza de Viento Total (Dir. Z): ${stab.windForceZ.toFixed(2)} kN`, mMargin + 5, curY);
  curY += 5;
  
  // 4. Cuadro de Incidencias Estructurales
  curY += 10;
  doc.setFont('helvetica', 'bold');
  doc.text("4. CUADRO DE INCIDENCIAS Y CORRECCIONES", mMargin, curY);
  curY += 10;
  
  const issues: any[] = [];
  wall.openings.forEach(op => {
      const h = StructuralEngine.calculateHeader(op, wall.length, config, wall.height);
      if (h.status !== 'ok') {
          issues.push([`Vano ${op.id}`, h.status.toUpperCase(), 'Deflexión/Aplastamiento', 'Sustituir por Viga Tubo o aumentar Jacks']);
      }
  });

  if (issues.length > 0) {
    (doc as any).autoTable({
        startY: curY,
        head: [['Elemento', 'Estado', 'Causa', 'Propuesta de Corrección']],
        body: issues,
        theme: 'grid',
        headStyles: { fillColor: [185, 28, 28] }, // Rojo intenso
        styles: { fontSize: 8 }
    });
    curY = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text("✅ No se detectaron incidencias críticas en este panel.", mMargin + 5, curY);
    curY += 15;
  }

  // 5. Fórmulas de Verificación (LOD 400)
  doc.setFont('helvetica', 'bold');
  doc.text(`${issues.length > 0 ? '5' : '4'}. FÓRMULAS DE REFERENCIA`, mMargin, curY);
  curY += 10;
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.text("Momento de Inercia (I): b*h³/12", mMargin + 5, curY); curY += 5;
  doc.text("Deflexión Máxima (Delta): (5*w*L⁴) / (384*E*I)", mMargin + 5, curY); curY += 5;
  doc.text("Módulo de Elasticidad (E): 210,000 MPa (Acero)", mMargin + 5, curY);

  doc.save(`INGENIERIA_JADSI_${wallName}.pdf`);
}