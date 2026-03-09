'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ControlPanel } from '@/components/ControlPanel';
import { FurnitureViewer } from '@/components/FurnitureViewer';
import { CutlistTable } from '@/components/CutlistTable';
import { OptimizerPanel } from '@/components/OptimizerPanel';
import { FurnitureType, FurnitureDimensions, Part, FurnitureColor, AVAILABLE_PANELS, PanelSize } from '@/lib/types';
import { 
  FileDown,
  LayoutGrid,
  Box as BoxIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Importación de motores de ingeniería
import { kitchenBaseEngine } from '@/engines/kitchenBaseEngine';
import { deskEngine } from '@/engines/deskEngine';
import { tvRackEngine } from '@/engines/tvRackEngine';
import { kitchenWallEngine } from '@/engines/kitchenWallEngine';
import { closetEngine } from '@/engines/closetEngine';
import { bookshelfEngine } from '@/engines/bookshelfEngine';

export default function Home() {
  const [view, setView] = useState<'3d' | 'optimize'>('3d');
  const [type, setType] = useState<FurnitureType>('bajoMesada');
  const [color, setColor] = useState<FurnitureColor>('alarce-blanco');
  const [dimensions, setDimensions] = useState<FurnitureDimensions>({
    width: 1200,
    height: 870,
    depth: 600,
    thickness: 18,
  });
  const [action, setAction] = useState<string>('');
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<PanelSize>(AVAILABLE_PANELS[0]);
  
  const viewerRef = useRef<{ getScreenshot: () => string }>(null);

  const generateFurniture = () => {
    let result;
    switch (type) {
      case 'bajoMesada': result = kitchenBaseEngine(dimensions); break;
      case 'escritorio': result = deskEngine(dimensions); break;
      case 'rackTV': result = tvRackEngine(dimensions); break;
      case 'alacena': result = kitchenWallEngine(dimensions); break;
      case 'placard': result = closetEngine(dimensions); break;
      case 'biblioteca': result = bookshelfEngine(dimensions); break;
      default: result = { parts: [] };
    }
    setParts(result.parts);
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

    doc.save('mueble-red-arquimax.pdf');
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-50">
      <aside className="hidden md:block w-85 h-full border-r bg-white shadow-xl overflow-y-auto">
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

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full h-full flex flex-col">
          <div className="flex items-center justify-between px-6 py-2 bg-white border-b shadow-sm z-30">
            <TabsList className="bg-slate-100">
              <TabsTrigger value="3d" className="gap-2"><BoxIcon className="w-4 h-4" /> Diseño 3D</TabsTrigger>
              <TabsTrigger value="optimize" className="gap-2"><LayoutGrid className="w-4 h-4" /> Optimización</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleAction('export-pdf')}>
                <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
              </Button>
            </div>
          </div>

          <TabsContent value="3d" className="flex-1 m-0 relative bg-slate-100 overflow-hidden flex flex-col">
            <div className="flex-1 relative">
              <FurnitureViewer ref={viewerRef} parts={parts} action={action} color={color} />
              <div className="absolute bottom-6 left-6 pointer-events-none opacity-10">
                <h2 className="text-6xl font-black text-primary">RED ARQUIMAX</h2>
              </div>
            </div>
            <div className="h-1/3 border-t bg-white">
              <CutlistTable parts={parts} />
            </div>
          </TabsContent>

          <TabsContent value="optimize" className="flex-1 m-0 overflow-hidden">
            <OptimizerPanel parts={parts} selectedPanel={selectedPanel} onPanelChange={setSelectedPanel} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
