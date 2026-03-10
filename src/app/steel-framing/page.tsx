'use client';

import React, { useState } from 'react';
import { SteelViewer } from '@/components/steel/SteelViewer';
import { SteelControlPanel } from '@/components/steel/SteelControlPanel';
import { SteelHouseConfig, SteelWall } from '@/lib/steel/types';
import { Button } from '@/components/ui/button';
import { 
  Menu, 
  Settings2, 
  Home, 
  Eye, 
  Download,
  Share2,
  Box,
  Layout,
  Move
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const INITIAL_WALLS: SteelWall[] = [
  { id: 'w1', length: 6000, height: 2600, thickness: 100, x: -3000, z: -3000, rotation: 0, openings: [{ id: 'o1', type: 'door', width: 900, height: 2050, position: 2500 }] },
  { id: 'w2', length: 6000, height: 2600, thickness: 100, x: 3000, z: -3000, rotation: 270, openings: [{ id: 'o2', type: 'window', width: 1200, height: 1100, position: 2400, sillHeight: 900 }] },
  { id: 'w3', length: 6000, height: 2600, thickness: 100, x: 3000, z: 3000, rotation: 180, openings: [] },
  { id: 'w4', length: 6000, height: 2600, thickness: 100, x: -3000, z: 3000, rotation: 90, openings: [{ id: 'o3', type: 'window', width: 1500, height: 1100, position: 2250, sillHeight: 900 }] },
];

const INITIAL_CONFIG: SteelHouseConfig = {
  globalWallHeight: 2600,
  walls: INITIAL_WALLS
};

export default function SteelFramingPage() {
  const [config, setConfig] = useState<SteelHouseConfig>(INITIAL_CONFIG);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-100">
      {/* Sidebar Desktop */}
      <aside className="hidden md:block w-80 h-full border-r bg-white shadow-xl overflow-y-auto shrink-0 z-40">
        <SteelControlPanel 
          config={config} 
          onConfigChange={setConfig} 
        />
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden h-full min-h-0">
        {/* Header Superior */}
        <header className="flex items-center justify-between px-4 md:px-6 py-2 bg-white border-b shadow-sm z-30 shrink-0">
          <div className="flex items-center gap-2">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                <SheetHeader className="sr-only">
                  <SheetTitle>Configuración Steel Framing</SheetTitle>
                </SheetHeader>
                <SteelControlPanel 
                  config={config} 
                  onConfigChange={setConfig} 
                />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-1.5">
              <Home className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-black uppercase text-slate-800 tracking-tighter">RED ARQUIMAX STEEL</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 px-3 text-[10px] font-bold">
              <Download className="w-3.5 h-3.5 mr-2" /> 
              EXPORTAR
            </Button>
            <Button size="sm" className="h-8 px-3 text-[10px] font-bold bg-blue-600 hover:bg-blue-700">
              <Share2 className="w-3.5 h-3.5 mr-2" /> 
              COMPARTIR
            </Button>
          </div>
        </header>

        {/* Visualizador 3D */}
        <div className="flex-1 relative overflow-hidden">
          <SteelViewer config={config} />
          
          {/* Overlay de información */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
            <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">PROYECTO ACTUAL</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Layout className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-black text-slate-800">{config.walls.length} Muros</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">Visualización 3D</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ayuda de navegación */}
          <div className="absolute bottom-4 right-4 bg-slate-900/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20 pointer-events-none">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
              <Move className="w-3 h-3" /> CLICK IZQ: ROTAR | CLICK DER: PAN | RUEDA: ZOOM
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
