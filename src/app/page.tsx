'use client';

import React, { useState, useEffect } from 'react';
import { ControlPanel } from '@/components/ControlPanel';
import { FurnitureViewer } from '@/components/FurnitureViewer';
import { CutlistTable } from '@/components/CutlistTable';
import { FurnitureType, FurnitureDimensions, Part } from '@/lib/types';

import { closetEngine } from '@/engines/closetEngine';
import { deskEngine } from '@/engines/deskEngine';
import { kitchenBaseEngine } from '@/engines/kitchenBaseEngine';
import { kitchenWallEngine } from '@/engines/kitchenWallEngine';
import { tvRackEngine } from '@/engines/tvRackEngine';
import { bookshelfEngine } from '@/engines/bookshelfEngine';

export default function Home() {
  const [type, setType] = useState<FurnitureType>('placard');
  const [dimensions, setDimensions] = useState<FurnitureDimensions>({
    width: 1200,
    height: 1800,
    depth: 600,
    thickness: 18,
  });
  const [action, setAction] = useState<string>('');
  const [parts, setParts] = useState<Part[]>([]);

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
    setAction('reset'); // Limpiar estados de animación al cambiar mueble
  };

  useEffect(() => {
    generateFurniture();
  }, [type, dimensions]);

  const handleAction = (act: string) => {
    if (act === 'generate') {
      generateFurniture();
    } else {
      setAction(act);
      // Pequeño hack para permitir repetir la misma acción (ej: re-explotar si se movió)
      setTimeout(() => setAction(''), 100);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 font-body">
      {/* Panel de Control Lateral */}
      <aside className="w-72 h-full border-r border-slate-200 bg-white z-20 shadow-xl">
        <ControlPanel 
          type={type} 
          dimensions={dimensions} 
          onTypeChange={setType} 
          onDimensionsChange={setDimensions} 
          onAction={handleAction} 
        />
      </aside>

      {/* Área Principal de Visualización */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Visor 3D */}
        <div className="flex-1 relative bg-[#F8FAFC]">
          <FurnitureViewer parts={parts} action={action} />
          
          {/* Instrucciones flotantes */}
          <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-slate-200 text-[10px] text-slate-500 pointer-events-none">
            <p className="font-bold text-slate-700 mb-1">CONTROLES DE CÁMARA</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <p>Rotar:</p><p className="font-medium">Click + Arrastrar</p>
              <p>Zoom:</p><p className="font-medium">Scroll / Rueda</p>
              <p>Pan (Mover):</p><p className="font-medium">Click Derecho + Arrastrar</p>
            </div>
          </div>
        </div>

        {/* Panel Inferior de Despiece */}
        <section className="h-[30%] bg-white border-t border-slate-200 z-10">
          <CutlistTable parts={parts} />
        </section>
      </main>
    </div>
  );
}
