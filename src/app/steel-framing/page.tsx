'use client';

import React, { useState, useRef } from 'react';
import { SteelViewer } from '@/components/steel/SteelViewer';
import { SteelControlPanel } from '@/components/steel/SteelControlPanel';
import { SteelHouseConfig, SteelWall, SteelOpening } from '@/lib/steel/types';
import { Button } from '@/components/ui/button';
import { 
  Menu, 
  Home, 
  Eye, 
  Download,
  Share2,
  Layout,
  Move,
  Settings2,
  X,
  Compass,
  MousePointer2,
  Keyboard
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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
  const [selectedOpening, setSelectedOpening] = useState<{ wallId: string, opening: SteelOpening } | null>(null);
  const [isWalkModeActive, setIsWalkModeActive] = useState(false);
  
  const viewerRef = useRef<{ enterWalkMode: () => void }>(null);

  const handleOpeningDoubleClick = (wallId: string, opening: SteelOpening) => {
    setSelectedOpening({ wallId, opening });
  };

  const updateOpeningPosition = (val: number) => {
    if (!selectedOpening) return;
    const newWalls = config.walls.map(w => {
      if (w.id === selectedOpening.wallId) {
        return {
          ...w,
          openings: w.openings.map(o => o.id === selectedOpening.opening.id ? { ...o, position: val } : o)
        };
      }
      return w;
    });
    setConfig({ ...config, walls: newWalls });
    setSelectedOpening({ ...selectedOpening, opening: { ...selectedOpening.opening, position: val } });
  };

  const updateOpeningDim = (field: 'width' | 'height', val: number) => {
    if (!selectedOpening) return;
    const newWalls = config.walls.map(w => {
      if (w.id === selectedOpening.wallId) {
        return {
          ...w,
          openings: w.openings.map(o => o.id === selectedOpening.opening.id ? { ...o, [field]: val } : o)
        };
      }
      return w;
    });
    setConfig({ ...config, walls: newWalls });
    setSelectedOpening({ ...selectedOpening, opening: { ...selectedOpening.opening, [field]: val } });
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-100">
      <aside className="hidden md:block w-80 h-full border-r bg-white shadow-xl overflow-y-auto shrink-0 z-40">
        <SteelControlPanel 
          config={config} 
          onConfigChange={setConfig} 
        />
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden h-full min-h-0">
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
            <Button 
              variant={isWalkModeActive ? "secondary" : "default"}
              size="sm" 
              className={`h-8 px-4 text-[10px] font-black uppercase tracking-tighter transition-all ${isWalkModeActive ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              onClick={() => viewerRef.current?.enterWalkMode()}
            >
              <Compass className="w-3.5 h-3.5 mr-2" /> 
              {isWalkModeActive ? "Caminando..." : "Entrar Modo Caminata"}
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-3 text-[10px] font-bold">
              <Download className="w-3.5 h-3.5 mr-2" /> 
              EXPORTAR
            </Button>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden">
          <SteelViewer 
            ref={viewerRef}
            config={config} 
            onOpeningDoubleClick={handleOpeningDoubleClick}
            onWalkModeLock={setIsWalkModeActive}
          />
          
          <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
            <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">MODO DE EDICIÓN</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Layout className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-black text-slate-800">{config.walls.length} Muros</span>
                </div>
                <div className="flex items-center gap-1">
                  <Settings2 className="w-3 h-3 text-slate-400" />
                  <span className="text-[9px] font-medium text-slate-600 uppercase">Doble Click para reacomodar</span>
                </div>
              </div>
            </div>

            {isWalkModeActive && (
              <div className="bg-slate-900/90 backdrop-blur text-white px-4 py-3 rounded-xl border border-white/10 shadow-2xl animate-in slide-in-from-left duration-300">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-2">CONTROLES DE NAVEGACIÓN</span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-medium uppercase">WASD: Moverse</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MousePointer2 className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-medium uppercase">Mouse: Mirar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-white/20 rounded flex items-center justify-center text-[8px] font-bold">SP</div>
                    <span className="text-[10px] font-medium uppercase">Subir</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-white/20 rounded flex items-center justify-center text-[8px] font-bold">SH</div>
                    <span className="text-[10px] font-medium uppercase">Bajar</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-white/10 text-[9px] text-slate-400 italic">Presiona ESC para salir del modo</div>
              </div>
            )}
          </div>

          <div className="absolute bottom-4 right-4 bg-slate-900/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20 pointer-events-none">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
              <Move className="w-3 h-3" /> CLICK IZQ: ROTAR | CLICK DER: PAN | RUEDA: ZOOM
            </p>
          </div>
        </div>

        {/* Dialogo de Edición de Abertura */}
        <Dialog open={!!selectedOpening} onOpenChange={(open) => !open && setSelectedOpening(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-blue-500" />
                Reacomodar {selectedOpening?.opening.type === 'door' ? 'Puerta' : 'Ventana'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="position" className="text-right text-xs font-bold uppercase">Posición</Label>
                <Input
                  id="position"
                  type="number"
                  value={selectedOpening?.opening.position || 0}
                  onChange={(e) => updateOpeningPosition(parseInt(e.target.value))}
                  className="col-span-3 h-9"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="width" className="text-right text-xs font-bold uppercase">Ancho</Label>
                <Input
                  id="width"
                  type="number"
                  value={selectedOpening?.opening.width || 0}
                  onChange={(e) => updateOpeningDim('width', parseInt(e.target.value))}
                  className="col-span-3 h-9"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="height" className="text-right text-xs font-bold uppercase">Alto</Label>
                <Input
                  id="height"
                  type="number"
                  value={selectedOpening?.opening.height || 0}
                  onChange={(e) => updateOpeningDim('height', parseInt(e.target.value))}
                  className="col-span-3 h-9"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setSelectedOpening(null)} className="w-full bg-blue-600 hover:bg-blue-700 font-bold uppercase text-xs">
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
