'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { OptimizerPanel } from '@/components/OptimizerPanel';
import { AVAILABLE_PANELS, PanelSize, Part } from '@/lib/types';
import { 
  ChevronLeft, 
  LayoutGrid, 
  Settings2,
  Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CutOptimizerPage() {
  const [selectedPanel, setSelectedPanel] = useState<PanelSize>(AVAILABLE_PANELS[0]);
  
  // Lista inicial vacía o ejemplo para el optimizador manual
  const [parts, setParts] = useState<Part[]>([]);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-50 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1 rounded-lg">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-tighter">JADSI OPTIMIZER</h1>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Motor de Nesting Industrial v12.1</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 px-3 text-[10px] font-bold border-slate-200">
            <Settings2 className="w-3.5 h-3.5 mr-2" /> AJUSTES MOTOR
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        <OptimizerPanel 
          parts={parts} 
          selectedPanel={selectedPanel} 
          onPanelChange={setSelectedPanel} 
        />
      </main>
    </div>
  );
}