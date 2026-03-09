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

  // Efecto para resetear dimensiones cuando cambia el tipo de mueble
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

  const generatePDF = async () => {
    const doc = new jsPDF();
    const BRAND_COLOR = [174, 26, 226];

    doc.setFontSize(22);
    doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.text("RED ARQUIMAX - Despiece Técnico", 105, 30, { align: 'center' });
    
    if (viewerRef.current && view === '3d') {
      const img = viewerRef.current.getScreenshot();
      if (img) {
        doc.addImage(img, 'PNG', 15, 60, 180, 100);
      }
    }

    doc.addPage();
    doc.setFontSize(16);
    doc.text("Listado de Cortes MDF", 15, 20);
    
    const panelRows = parts.filter(p => !p.isHardware).map(p => [
      p.name, p.cutLargo, p.cutAncho, p.cutEspesor, 1, p.grainDirection
    ]);

    (doc as any).autoTable({
      head: [['Pieza', 'Largo (mm)', 'Ancho (mm)', 'Espesor', 'Cant.', 'Veta']],
      body: panelRows,
      startY: 30,
      headStyles: { fillColor: BRAND_COLOR }
    });

    doc.save(`mueble-red-arquimax-${type}.pdf`);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-50">
      {/* Sidebar Desktop */}
      <aside className="hidden md:block w-80 h-full border-r bg-white shadow-xl overflow-y-auto shrink-0">
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

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full h-full flex flex-col">
          {/* Header Bar */}
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
                    <SheetTitle>Configuración del Mueble</SheetTitle>
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
                <span className="text-xs font-bold uppercase text-slate-700 hidden xs:inline">RED ARQUIMAX</span>
              </div>
            </div>

            <TabsList className="bg-slate-100 h-9">
              <TabsTrigger value="3d" className="gap-2 text-xs md:text-sm h-7">
                <BoxIcon className="w-3.5 h-3.5" /> 
                <span>Diseño</span>
              </TabsTrigger>
              <TabsTrigger value="optimize" className="gap-2 text-xs md:text-sm h-7">
                <LayoutGrid className="w-3.5 h-3.5" /> 
                <span>Corte</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 px-2 md:px-3" onClick={() => handleAction('export-pdf')}>
                <FileDown className="w-4 h-4 md:mr-2" /> 
                <span className="hidden sm:inline text-xs">PDF</span>
              </Button>
            </div>
          </div>

          {/* Content Areas */}
          <TabsContent value="3d" className="flex-1 m-0 relative bg-slate-100 overflow-hidden flex flex-col data-[state=inactive]:hidden min-h-0">
            <div className="flex-1 relative">
              <FurnitureViewer ref={viewerRef} parts={parts} action={action} color={color} />
              <div className="absolute bottom-4 left-4 pointer-events-none opacity-10">
                <h2 className="text-3xl md:text-6xl font-black text-primary">RED ARQUIMAX</h2>
              </div>
            </div>
            <div className="h-1/3 md:h-1/3 border-t bg-white min-h-[200px]">
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
