import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SteelHouseConfig } from '@/lib/steel/types';
import { calculateSteelMaterials } from './materialCalculator';

export const exportFullProject = async (
  config: SteelHouseConfig, 
  structuralResult: any,
  screenshot: string 
) => {
  const zip = new JSZip();
  const folder = zip.folder(`Proyecto_Steel_${config.width}x${config.length}`);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- 1. CARÁTULA Y ENCABEZADO ---
  doc.setFontSize(22);
  doc.setTextColor(59, 130, 246); // Blue-500
  doc.text("MEMORIA DE CÁLCULO ESTRUCTURAL", pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Proyecto: Steel Frame Industrial - ${config.width}mm x ${config.length}mm`, 14, 30);
  doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 14, 36);
  doc.text(`Normativa Aplicada: AISI S100-2016 / ASCE 7-22`, 14, 42);

  // --- 2. CAPTURA DEL MODELO (BLUEPRINT) ---
  if (screenshot) {
    try {
      doc.addImage(screenshot, 'PNG', 14, 50, 180, 100);
    } catch (e) { console.error("PDF: Error al añadir captura", e); }
  }

  // --- 3. AUDITORÍA DE VANOS Y REFUERZOS ---
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("1. Auditoría de Aperturas y Cabezales", 14, 160);

  const headerRows: any[] = [];
  if (structuralResult.processedWalls) {
    structuralResult.processedWalls.forEach((wall: any) => {
      wall.headers?.forEach((h: any) => {
        if (h.analysis) {
          const def = (h.analysis.f_max ?? h.analysis.deflectionMm / 10).toFixed(3);
          const lim = (h.analysis.limit ?? h.analysis.maxAllowableDeflection / 10).toFixed(3);
          headerRows.push([
            `Muro ${wall.id} - ${h.openingId}`,
            h.analysis.type.toUpperCase(),
            `${h.analysis.actualHeight}mm`,
            `${h.analysis.supports.jacks} x ${h.analysis.supports.jackThickness}mm`,
            h.analysis.isSafe ? 'PASA (PASS)' : 'FALLA (FAIL)',
            h.analysis.alertBanner ? 'Refuerzo Automático' : 'Estándar'
          ]);
        }
      });
    });
  }

  autoTable(doc, {
    startY: 165,
    head: [['Elemento', 'Configuración', 'Peralte', 'Jack/Apoyo', 'Estado', 'Nota']],
    body: headerRows,
    headStyles: { fillStyle: 'F', fillColor: [59, 130, 246] },
    alternateRowStyles: { fillColor: [245, 247, 250] }
  });

  // --- 4. CIMENTACIÓN ---
  doc.addPage();
  doc.text("2. Análisis de Cimentación y Suelo", 14, 20);
  if (structuralResult.foundation) {
    const f = structuralResult.foundation;
    autoTable(doc, {
      startY: 25,
      head: [['Parámetro', 'Valor Calculado', 'Criterio']],
      body: [
        ['Tipo de Estructura', 'Platea de HºAº con Pilotones', 'H-21'],
        ['Cantidad de Pilotones', f.pileCount, 'Perimetral cada ~2m'],
        ['Carga Total (kN)', (f.totalLoadKg / 100).toFixed(2), 'Gravitatoria + Viento'],
        ['Capacidad Admisible', (f.totalCapacityKg / 100).toFixed(2) + ' kN', f.globalJustification],
        ['Volumen Hormigón', f.concreteVolumeM3.toFixed(2) + ' m³', 'Cómputo Directo'],
        ['Peso Acero (ADN-420)', f.steelWeightKg.toFixed(2) + ' kg', 'Refuerzo estructural']
      ]
    });
  }

  // --- 5. CÓMPUTO MÉTRICO CONSOLIDADO ---
  doc.text("3. Cómputo Métrico de Materiales", 14, doc.lastAutoTable.finalY + 20);
  const estimate = calculateSteelMaterials(config);
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 25,
    head: [['Material / Perfil', 'Cant.', 'Unid.', 'Uso Sugerido']],
    body: estimate.items.map(i => [i.name, i.quantity, i.unit, i.description]),
    headStyles: { fillColor: [45, 55, 72] }
  });

  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text("Nota: Este documento ha sido generado por el Sistema de Ingeniería SteelAI. Los cálculos deben ser visados por un profesional local.", 14, doc.internal.pageSize.getHeight() - 10);

  // GUARDAR EN ZIP
  folder?.file("01_Memoria_Calculo_LOD400.pdf", doc.output('blob'));
  folder?.file("02_Data_Proyecto.json", JSON.stringify({ config, structuralResult }, null, 2));
  
  // Captura original para seguridad
  const imgData = screenshot.split(',')[1];
  folder?.file("03_Isometria_Original.png", imgData, { base64: true });

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `Entrega_LOD400_Steel_${config.width}x${config.length}.zip`);
};
