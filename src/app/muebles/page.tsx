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
  Settings2,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Link from 'next/link';

const DEFAULT_DIMENSIONS: Record<string, FurnitureDimensions> = {
  bajoMesada: { width: 1200, height: 870, depth: 600, thickness: 18, hasBack: true, hasShelf: true },
  rackTV: { width: 1600, height: 500, depth: 400, thickness: 18, hasBack: true },
  escritorio: { width: 1200, height: 750, depth: 600, thickness: 18 },
  alacena: { width: 800, height: 600, depth: 320, thickness: 18, hasBack: true, hasShelf: true },
  placard: { width: 1800, height: 2100, depth: 600, thickness: 18, hasBack: true },
  biblioteca: { width: 800, height: 1800, depth: 300, thickness: 18, hasBack: true },
  alacenaFlip: { width: 500, height: 300, depth: 320, thickness: 18, hasBack: true, hasShelf: false },
  'bajomesada-cajonera': { width: 600, height: 870, depth: 600, thickness: 18, hasBack: true },
  'porta-anafe': { width: 800, height: 870, depth: 600, thickness: 18, hasBack: true, hasShelf: true },
  'cabinet_base_120_2p3c': { width: 1200, height: 870, depth: 600, thickness: 18, hasBack: true, hasShelf: true },
  'cabinet_base_140_3p3c': { width: 1400, height: 870, depth: 600, thickness: 18, hasBack: true, hasShelf: true },
  'cabinet_wall_60_1p': { width: 600, height: 600, depth: 320, thickness: 18, hasBack: true, hasShelf: true },
  'cabinet_wall_120_3p': { width: 1200, height: 600, depth: 320, thickness: 18, hasBack: true, hasShelf: true, hasShelf2: true },
  'cabinet_wall_140_3p': { width: 1400, height: 600, depth: 320, thickness: 18, hasBack: true, hasShelf: true, hasShelf2: true },
  'cabinet_pantry_60_2p': { width: 600, height: 2100, depth: 600, thickness: 18, hasBack: true },
  'cabinet_microwave_60': { width: 600, height: 2100, depth: 600, thickness: 18, hasBack: true },
  'cabinet_base_single_60_1p': { width: 600, height: 870, depth: 600, thickness: 18, hasBack: true, hasShelf: true },
  'cabinet_base_double_80_2p': { width: 800, height: 870, depth: 600, thickness: 18, hasBack: true, hasShelf: true },
};

export default function MueblesPage() {
  const [view, setView] = useState<'3d' | 'optimize'>('3d');
  const [type, setType] = useState<FurnitureType>('bajoMesada');
  const [color, setColor] = useState<FurnitureColor>('blanco');
  const [dimensions, setDimensions] = useState<FurnitureDimensions>(DEFAULT_DIMENSIONS.bajoMesada);
  const [action, setAction] = useState<string>('');
  const [parts, setParts] = useState<Part[]>([]);
  const [hasDoors, setHasDoors] = useState(false);
  const [hasDrawers, setHasDrawers] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<PanelSize>(AVAILABLE_PANELS[0]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const viewerRef = useRef<{ getScreenshot: () => string }>(null);

  const generateFurniture = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/furniture/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, dimensions })
      });
      const result: FurnitureModel = await res.json();
      setParts(result.parts);
      setHasDoors(result.hasDoors);
      setHasDrawers(result.hasDrawers);
    } catch (error) {
      console.error("Furniture API Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setDimensions(DEFAULT_DIMENSIONS[type] || DEFAULT_DIMENSIONS.bajoMesada);
    setAction('reset');
  }, [type]);

  useEffect(() => {
    generateFurniture();
  }, [type, dimensions]);

  const handleAction = (act: string) => {
    if (act === 'export-pdf') generatePDF();
    else {
      setAction(act);
      setTimeout(() => setAction(''), 100);
    }
    setIsMobileMenuOpen(false);
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    const BRAND_COLOR = [13, 110, 253]; // Azul JADSI

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.text("JADSI INDUSTRIAL", 105, 30, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text("Módulo de Mobiliario Paramétrico", 105, 40, { align: 'center' });
    
    doc.setDrawColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.setLineWidth(1);
    doc.line(20, 45, 190, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Módulo: ${type.toUpperCase()}`, 20, 60);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 67);
    doc.text(`Dimensiones: ${dimensions.width} x ${dimensions.height} x ${dimensions.depth} mm`, 20, 74);

    if (viewerRef.current) {
      const img = viewerRef.current.getScreenshot();
      if (img) doc.addImage(img, 'PNG', 15, 85, 180, 120);
    }

    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.text("Despiece y Herrajes", 15, 20);
    
    const panelRows = parts.filter(p => !p.isHardware).map(p => [
      p.name, p.cutLargo, p.cutAncho, p.cutEspesor, 1, p.grainDirection
    ]);

    (doc as any).autoTable({
      head: [['Pieza', 'Largo (mm)', 'Ancho (mm)', 'Espesor', 'Cant.', 'Veta']],
      body: panelRows,
      startY: 30,
      headStyles: { fillColor: BRAND_COLOR, font: 'helvetica', fontStyle: 'bold' },
      styles: { font: 'helvetica', fontSize: 9 },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });

    doc.save(`jadsi-mueble-${type}-${Date.now()}.pdf`);
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
              <Link href="/">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <MenuIcon className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-80">
                  <ControlPanel 
                    type={type} 
                    dimensions={dimensions} 
                    color={color}
                    hasDoors={hasDoors}
                    hasDrawers={hasDrawers}
                    onTypeChange={(v) => { setType(v); setIsMobileMenuOpen(false); }} 
                    onDimensionsChange={setDimensions} 
                    onColorChange={setColor}
                    onAction={handleAction} 
                  />
                </SheetContent>
              </Sheet>
              <div className="flex items-center gap-1">
                <Settings2 className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase text-slate-800 hidden xs:inline tracking-tighter">JADSI MUEBLES</span>
              </div>
            </div>

            <TabsList className="bg-slate-100 h-9 p-1">
              <TabsTrigger value="3d" className="gap-2 text-[10px] md:text-xs h-7 px-3">
                <BoxIcon className="w-3.5 h-3.5" /> 
                <span className="uppercase font-bold">3D Interactiva</span>
              </TabsTrigger>
              <TabsTrigger value="optimize" className="gap-2 text-[10px] md:text-xs h-7 px-3">
                <LayoutGrid className="w-3.5 h-3.5" /> 
                <span className="uppercase font-bold">Corte Industrial</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 px-2 md:px-3 text-[10px] font-bold" onClick={() => handleAction('export-pdf')}>
                <FileDown className="w-3.5 h-3.5 md:mr-2" /> 
                <span className="hidden sm:inline uppercase">Ficha Técnica</span>
              </Button>
            </div>
          </div>

          <TabsContent value="3d" className="flex-1 m-0 relative bg-slate-100 overflow-hidden flex flex-col data-[state=inactive]:hidden min-h-0">
            <div className="flex-1 relative">
              <FurnitureViewer ref={viewerRef} parts={parts} action={action} color={color} />
              {isLoading && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-black uppercase text-primary">Generando...</span>
                  </div>
                </div>
              )}
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