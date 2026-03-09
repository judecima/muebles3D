
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ControlPanel } from '@/components/ControlPanel';
import { FurnitureViewer } from '@/components/FurnitureViewer';
import { CutlistTable } from '@/components/CutlistTable';
import { FurnitureType, FurnitureDimensions, Part, FurnitureColor } from '@/lib/types';
import { 
  Menu, 
  Info,
  Maximize2,
  Download
} from 'lucide-react';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { SceneManager } from '@/three/SceneManager';

import { closetEngine } from '@/engines/closetEngine';
import { deskEngine } from '@/engines/deskEngine';
import { kitchenBaseEngine } from '@/engines/kitchenBaseEngine';
import { kitchenWallEngine } from '@/engines/kitchenWallEngine';
import { tvRackEngine } from '@/engines/tvRackEngine';
import { bookshelfEngine } from '@/engines/bookshelfEngine';

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function Home() {
  const [type, setType] = useState<FurnitureType>('placard');
  const [color, setColor] = useState<FurnitureColor>('alarce-blanco');
  const [dimensions, setDimensions] = useState<FurnitureDimensions>({
    width: 1200,
    height: 1800,
    depth: 600,
    thickness: 18,
  });
  const [action, setAction] = useState<string>('');
  const [parts, setParts] = useState<Part[]>([]);
  
  const viewerRef = useRef<{ getScreenshot: () => string }>(null);

  const generateFurniture = () => {
    let result;
    switch (type) {
      case 'placard': result = closetEngine(dimensions); break;
      case 'escritorio': result = deskEngine(dimensions); break;
      case 'bajoMesada': result = kitchenBaseEngine(dimensions); break;
      case 'alacena': result = kitchenWallEngine(dimensions); break;
      case 'rackTV': result = tvRackEngine(dimensions); break;
      case 'biblioteca': result = bookshelfEngine(dimensions); break;
      default: result = { parts: [] };
    }
    setParts(result.parts);
    setAction('reset');
  };

  useEffect(() => {
    generateFurniture();
  }, [type, dimensions]);

  const handleAction = (act: string) => {
    if (act === 'generate') {
      generateFurniture();
    } else if (act === 'export-pdf') {
      generatePDF();
    } else {
      setAction(act);
      setTimeout(() => setAction(''), 100);
    }
  };

  const generatePDF = async () => {
    if (!viewerRef.current) return;

    const doc = new jsPDF();
    const companyName = "Red Arquimax";
    const waterMarkText = "RED ARQUIMAX";

    const addWatermark = (pdf: any) => {
      pdf.saveGraphicsState();
      pdf.setGState(new pdf.GState({ opacity: 0.1 }));
      pdf.setFontSize(60);
      pdf.setTextColor(150);
      pdf.text(waterMarkText, 40, 150, { angle: 45 });
      pdf.restoreGraphicsState();
    };

    // PÁGINA 1: PORTADA Y RENDERS
    addWatermark(doc);
    doc.setFontSize(22);
    doc.setTextColor(40, 44, 41);
    doc.text("Despiece Técnico de Mueble", 105, 30, { align: 'center' });
    doc.setFontSize(16);
    doc.text(companyName, 105, 40, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Proyecto: ${type.toUpperCase()} | Fecha: ${new Date().toLocaleDateString()}`, 105, 50, { align: 'center' });

    // Capturar Render Armado
    setAction('reset');
    await new Promise(r => setTimeout(r, 200));
    const imgArmado = viewerRef.current.getScreenshot();
    doc.addImage(imgArmado, 'PNG', 15, 60, 180, 100);
    doc.text("VISTA MUEBLE ARMADO", 105, 165, { align: 'center' });

    // Capturar Render Explotado
    setAction('explode');
    await new Promise(r => setTimeout(r, 200));
    const imgExplotado = viewerRef.current.getScreenshot();
    doc.addImage(imgExplotado, 'PNG', 15, 175, 180, 100);
    doc.text("VISTA EXPLOTADA", 105, 280, { align: 'center' });
    setAction('reset');

    // PÁGINA 2: TABLA MDF
    doc.addPage();
    addWatermark(doc);
    doc.setFontSize(16);
    doc.text("Listado de Paneles MDF", 15, 20);

    const panels = parts.filter(p => !p.isHardware);
    const aggregatedPanels = Object.values(panels.reduce((acc, part) => {
      const key = `${part.name}-${part.width}-${part.height}-${part.depth}`;
      if (!acc[key]) acc[key] = { ...part, quantity: 0 };
      acc[key].quantity += 1;
      return acc;
    }, {} as any));

    const panelRows = aggregatedPanels.map((p: any) => [
      p.name,
      `${p.height} mm`,
      `${p.width} mm`,
      `${p.depth} mm`,
      p.quantity
    ]);

    (doc as any).autoTable({
      head: [['Pieza', 'Largo', 'Ancho', 'Espesor', 'Cant.']],
      body: panelRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillStyle: [204, 44, 41] }
    });

    // PÁGINA 3: HERRAJES
    doc.addPage();
    addWatermark(doc);
    doc.setFontSize(16);
    doc.text("Listado de Herrajes y Accesorios", 15, 20);

    const hardware = parts.filter(p => p.isHardware);
    const aggregatedHardware = Object.values(hardware.reduce((acc, part) => {
      const key = `${part.name}-${part.depth}`;
      if (!acc[key]) acc[key] = { ...part, quantity: 0 };
      acc[key].quantity += 1;
      return acc;
    }, {} as any));

    const hardwareRows = aggregatedHardware.map((h: any) => [
      h.name,
      h.depth > 0 ? `${h.depth} mm` : '-',
      h.quantity
    ]);

    (doc as any).autoTable({
      head: [['Descripción', 'Largo / Medida', 'Cantidad']],
      body: hardwareRows,
      startY: 30,
      theme: 'striped',
      headStyles: { fillStyle: [180, 64, 63] }
    });

    doc.save('mueble-red-arquimax.pdf');
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-50 text-slate-900 font-body relative">
      {/* Sidebar Desktop */}
      <aside className="hidden md:block w-80 h-full border-r border-slate-200 bg-white z-20 shadow-xl overflow-y-auto">
        <ControlPanel 
          type={type} 
          dimensions={dimensions} 
          color={color}
          onTypeChange={setType} 
          onDimensionsChange={setDimensions} 
          onColorChange={setColor}
          onAction={handleAction} 
        />
      </aside>

      {/* Header Mobile */}
      <header className="md:hidden flex items-center justify-between p-4 bg-primary text-white z-30 shadow-md">
        <div className="flex flex-col font-bold">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-5 h-5" />
            Red Arquimax
          </div>
          <span className="text-[8px] opacity-70">SISTEMA DE DISEÑO 3D</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <SheetHeader className="sr-only">
              <SheetTitle>Panel de Configuración de Mueble</SheetTitle>
            </SheetHeader>
            <ControlPanel 
              type={type} 
              dimensions={dimensions} 
              color={color}
              onTypeChange={setType} 
              onDimensionsChange={setDimensions} 
              onColorChange={setColor}
              onAction={handleAction} 
            />
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="flex-1 relative bg-slate-100 cursor-move">
          <FurnitureViewer ref={viewerRef} parts={parts} action={action} color={color} />
          
          {/* MARCA DE AGUA VISUAL */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-25deg]">
            <h1 className="text-[12vw] font-black tracking-widest text-primary whitespace-nowrap">RED ARQUIMAX</h1>
          </div>

          <div className="absolute top-4 right-4 md:top-6 md:right-6 pointer-events-none">
            <div className="bg-white/80 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-200 text-[10px] text-slate-600">
              <p className="font-bold flex items-center gap-1 mb-1 text-primary">
                <Info className="w-3 h-3" /> NAVEGACIÓN 3D
              </p>
              <ul className="space-y-0.5">
                <li>Rotar: 1 dedo / Click</li>
                <li>Zoom: Pellizcar / Scroll</li>
                <li>Pan: 2 dedos / Der. Click</li>
              </ul>
            </div>
          </div>
        </div>

        <section className="h-[40%] md:h-[35%] bg-white border-t border-slate-200 z-10 shadow-inner overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
             <CutlistTable parts={parts} />
          </div>
          <footer className="bg-slate-50 border-t border-slate-200 px-6 py-2 flex justify-between items-center shrink-0">
            <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">© 2024 RED ARQUIMAX - Todos los derechos reservados</span>
            <div className="flex items-center gap-4">
               <span className="text-[9px] text-slate-300">SOPORTE TÉCNICO</span>
               <span className="text-[9px] text-slate-300">V.1.0.4</span>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
