'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ControlPanel } from '@/components/ControlPanel';
import { FurnitureViewer } from '@/components/FurnitureViewer';
import { CutlistTable } from '@/components/CutlistTable';
import { OptimizerPanel } from '@/components/OptimizerPanel';
import { FurnitureType, FurnitureDimensions, Part, FurnitureColor, AVAILABLE_PANELS, PanelSize, FurnitureModel } from '@/lib/types';
import { 
  FileDown,
  LayoutGrid,
  Box as BoxIcon,
  Menu as MenuIcon,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Motores de ingeniería
import { kitchenBaseEngine } from '@/engines/kitchenBaseEngine';
import { deskEngine } from '@/engines/deskEngine';
import { tvRackEngine } from '@/engines/tvRackEngine';
import { kitchenWallEngine } from '@/engines/kitchenWallEngine';
import { closetEngine } from '@/engines/closetEngine';
import { bookshelfEngine } from '@/engines/bookshelfEngine';

const DEFAULT_DIMENSIONS: Record<FurnitureType, FurnitureDimensions> = {
  bajoMesada: { width: 1200, height: 870, depth: 600, thickness: 18, hasBack: true, hasShelf: true },
  rackTV: { width: 1600, height: 500, depth: 400, thickness: 18, hasBack: true },
  escritorio: { width: 1200, height: 750, depth: 600, thickness: 18 },
  alacena: { width: 800, height: 600, depth: 320, thickness: 18, hasBack: true },
  placard: { width: 1800, height: 2100, depth: 600, thickness: 18, hasBack: true },
  biblioteca: { width: 800, height: 1800, depth: 300, thickness: 18, hasBack: true },
};

export default function Home() {
  const [view, setView] = useState<'3d' | 'optimize'>('3d');
  const [type, setType] = useState<FurnitureType>('bajoMesada');
  const [color, setColor] = useState<FurnitureColor>('alarce-blanco');
  const [dimensions, setDimensions] = useState<FurnitureDimensions>(DEFAULT_DIMENSIONS.bajoMesada);
  const [action, setAction] = useState<string>('');
  const [parts, setParts] = useState<Part[]>([]);
  const [hasDoors, setHasDoors] = useState(false);
  const [hasDrawers, setHasDrawers] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<PanelSize>(AVAILABLE_PANELS[0]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const viewerRef = useRef<{ getScreenshot: () => string }>(null);

  useEffect(() => {
    setDimensions(DEFAULT_DIMENSIONS[type]);
    setAction('reset');
  }, [type]);

  const generateFurniture = () => {
    let result: FurnitureModel;
    switch (type) {
      case 'bajoMesada': result = kitchenBaseEngine(dimensions); break;
      case 'escritorio': result = deskEngine(dimensions); break;
      case 'rackTV': result = tvRackEngine(dimensions); break;
      case 'alacena': result = kitchenWallEngine(dimensions); break;
      case 'placard': result = closetEngine(dimensions); break;
      case 'biblioteca': result = bookshelfEngine(dimensions); break;
      default: result = { parts: [], summary: '', hasDoors: false, hasDrawers: false };
    }
    setParts(result.parts);
    setHasDoors(result.hasDoors);
    setHasDrawers(result.hasDrawers);
  };

  useEffect(() => {
    generateFurniture();
  }, [type, dimensions]);

  const handleAction = (act: string) => {
    if (act === 'export-pdf') {
      generatePDF();
    } else {
      setAction(act);
      setTimeout(() => setAction(''), 100);
    }
  };

  const drawWatermark = (doc: any) => {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setTextColor(240, 240, 240);
      doc.setFontSize(30);
      for (let y = -50; y < 400; y += 80) {
        for (let x = -50; x < 300; x += 120) {
          doc.text("RED ARQUIMAX", x, y, { angle: 45 });
        }
      }
    }
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    const BRAND_COLOR = [174, 26, 226];

    // Portada
    doc.setFontSize(22);
    doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.text("RED ARQUIMAX - Ficha Técnica", 105, 30, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Mueble: ${type.toUpperCase()}`, 105, 40, { align: 'center' });
    doc.text(`Dimensiones: ${dimensions.width}x${dimensions.height}x${dimensions.depth} mm`, 105, 48, { align: 'center' });

    // Captura 3D Técnica (Ángulo 45°)
    if (viewerRef.current) {
      const img = viewerRef.current.getScreenshot();
      if (img) {
        doc.addImage(img, 'PNG', 15, 60, 180, 120);
      }
    }

    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.text("Listado Detallado de Cortes", 15, 20);
    
    const panelRows = parts.filter(p => !p.isHardware).map(p => [
      p.name, p.cutLargo, p.cutAncho, p.cutEspesor, 1, p.grainDirection
    ]);

    (doc as any).autoTable({
      head: [['Pieza', 'Largo (mm)', 'Ancho (mm)', 'Espesor', 'Cant.', 'Veta']],
      body: panelRows,
      startY: 30,
      headStyles: { fillColor: BRAND_COLOR },
      styles: { fontSize: 9 }
    });

    drawWatermark(doc);
    doc.save(`tecnico-red-arquimax-${type}-${Date.now()}.pdf`);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-100">
      <aside className="hidden md:block w-80 h-full border-r bg-white shadow-xl overflow-y-auto shrink-0 z-40">
        <ControlPanel 
          type={type} 
          dimensions={dimensions} 
          color={color}
          hasDoors={hasDoors}
          hasDrawers={hasDrawers}
          onTypeChange={setType} 
          onDimensionsChange={setDimensions} 
          onColorChange={setColor}
          onAction={handleAction} 
        />
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden h-full min-h-0">
        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full h-full flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 md:px-6 py-2 bg-white border-b shadow-sm z-30 shrink-0">
            <div className="flex items-center gap-2">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <MenuIcon className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-80">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Configuración</SheetTitle>
                  </SheetHeader>
                  <ControlPanel 
                    type={type} 
                    dimensions={dimensions} 
                    color={color}
                    hasDoors={hasDoors}
                    hasDrawers={hasDrawers}
                    onTypeChange={(v) => { setType(v); setIsMobileMenuOpen(false); }} 
                    onDimensionsChange={setDimensions} 
                    onColorChange={setColor}
                    onAction={(a) => { handleAction(a); setIsMobileMenuOpen(false); }} 
                  />
                </SheetContent>
              </Sheet>
              <div className="flex items-center gap-1">
                <Settings2 className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase text-slate-800 hidden xs:inline tracking-tighter">RED ARQUIMAX</span>
              </div>
            </div>

            <TabsList className="bg-slate-100 h-9 p-1">
              <TabsTrigger value="3d" className="gap-2 text-[10px] md:text-xs h-7 px-3">
                <BoxIcon className="w-3.5 h-3.5" /> 
                <span className="uppercase font-bold">Diseño 3D</span>
              </TabsTrigger>
              <TabsTrigger value="optimize" className="gap-2 text-[10px] md:text-xs h-7 px-3">
                <LayoutGrid className="w-3.5 h-3.5" /> 
                <span className="uppercase font-bold">Optimizar</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 px-2 md:px-3 text-[10px] font-bold" onClick={() => handleAction('export-pdf')}>
                <FileDown className="w-3.5 h-3.5 md:mr-2" /> 
                <span className="hidden sm:inline">EXPORTAR PDF</span>
              </Button>
            </div>
          </div>

          <TabsContent value="3d" className="flex-1 m-0 relative bg-slate-100 overflow-hidden flex flex-col data-[state=inactive]:hidden min-h-0">
            <div className="flex-1 relative">
              <FurnitureViewer ref={viewerRef} parts={parts} action={action} color={color} />
              <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full border border-slate-200 shadow-sm pointer-events-none">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{type}</span>
              </div>
            </div>
            <div className="h-1/3 border-t bg-white min-h-[200px] shrink-0">
              <CutlistTable parts={parts} />
            </div>
          </TabsContent>

          <TabsContent value="optimize" className="flex-1 m-0 overflow-hidden flex flex-col data-[state=inactive]:hidden min-h-0">
            <OptimizerPanel parts={parts} selectedPanel={selectedPanel} onPanelChange={setSelectedPanel} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
