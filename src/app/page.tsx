'use client';

import React, { useState, useEffect } from 'react';
import { ControlPanel } from '@/components/ControlPanel';
import { FurnitureViewer } from '@/components/FurnitureViewer';
import { CutlistTable } from '@/components/CutlistTable';
import { FurnitureType, FurnitureDimensions, Part, FurnitureColor } from '@/lib/types';
import { 
  Menu, 
  Info,
  Maximize2
} from 'lucide-react';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

import { closetEngine } from '@/engines/closetEngine';
import { deskEngine } from '@/engines/deskEngine';
import { kitchenBaseEngine } from '@/engines/kitchenBaseEngine';
import { kitchenWallEngine } from '@/engines/kitchenWallEngine';
import { tvRackEngine } from '@/engines/tvRackEngine';
import { bookshelfEngine } from '@/engines/bookshelfEngine';

export default function Home() {
  const [type, setType] = useState<FurnitureType>('placard');
  const [color, setColor] = useState<FurnitureColor>('alerce-blanco');
  const [dimensions, setDimensions] = useState<FurnitureDimensions>({
    width: 1200,
    height: 1800,
    depth: 600,
    thickness: 18,
  });
  const [action, setAction] = useState<string>('');
  const [parts, setParts] = useState<Part[]>([]);

  // Motores paramétricos independientes
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
    } else {
      setAction(act);
      setTimeout(() => setAction(''), 100);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-50 text-slate-900 font-body">
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
        <div className="flex items-center gap-2 font-bold">
          <Maximize2 className="w-5 h-5" />
          MuebleCAD
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
        {/* Visor 3D */}
        <div className="flex-1 relative bg-slate-100 cursor-move">
          <FurnitureViewer parts={parts} action={action} color={color} />
          
          {/* Instrucciones flotantes */}
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

        {/* Tabla de Despiece Responsiva */}
        <section className="h-[40%] md:h-[35%] bg-white border-t border-slate-200 z-10 shadow-inner overflow-hidden">
          <CutlistTable parts={parts} />
        </section>
      </main>
    </div>
  );
}
