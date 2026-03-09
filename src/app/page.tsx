'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
    setAction('reset'); // Clear any current animations
  };

  useEffect(() => {
    generateFurniture();
  }, [type, dimensions]);

  const handleAction = (act: string) => {
    if (act === 'generate') {
      generateFurniture();
    } else {
      setAction(act);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar Controls */}
      <aside className="w-80 h-full border-r bg-white z-10">
        <ControlPanel 
          type={type} 
          dimensions={dimensions} 
          onTypeChange={setType} 
          onDimensionsChange={setDimensions} 
          onAction={handleAction} 
        />
      </aside>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col relative">
        <div className="flex-1 bg-[#F3F6F8]">
          <FurnitureViewer parts={parts} action={action} />
          
          <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-sm border text-xs text-muted-foreground">
            <p><strong>Controles:</strong></p>
            <p>Click + Arrastrar: Rotar</p>
            <p>Scroll: Zoom</p>
            <p>Click Derecho + Arrastrar: Pan</p>
          </div>
        </div>

        {/* Bottom Cutlist Section */}
        <section className="h-1/3 bg-white border-t overflow-y-auto">
          <CutlistTable parts={parts} />
        </section>
      </main>
    </div>
  );
}