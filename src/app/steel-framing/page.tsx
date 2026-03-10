'use client';

import React, { useState, useRef, useCallback } from 'react';
import { SteelViewer } from '@/components/steel/SteelViewer';
import { SteelControlPanel } from '@/components/steel/SteelControlPanel';
import { SteelJoystick } from '@/components/steel/SteelJoystick';
import { SteelHouseConfig, SteelWall, SteelOpening } from '@/lib/steel/types';
import { Button } from '@/components/ui/button';
import { 
  Menu, 
  Home, 
  Download,
  Layout,
  Move,
  Settings2,
  Compass,
  MousePointer2,
  Keyboard,
  ArrowUp,
  ArrowDown,
  Zap,
  Gamepad2,
  MousePointer
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  
  const viewerRef = useRef<{ 
    enterWalkMode: () => void, 
    setMovement: (dir: string, active: boolean) => void,
    updateJoystickMove: (x: number, y: number) => void,
    updateJoystickLook: (x: number, y: number) => void
  }>(null);

  const handleOpeningDoubleClick = useCallback((wallId: string, opening: SteelOpening) => {
    setSelectedOpening({ wallId, opening });
  }, []);

  const handleWalkModeLock = useCallback((locked: boolean) => {
    setIsWalkModeActive(locked);
  }, []);

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
              onClick={() => {
                if (isWalkModeActive) setIsWalkModeActive(false);
                else viewerRef.current?.enterWalkMode();
              }}
            >
              <Compass className="w-3.5 h-3.5 mr-2" /> 
              {isWalkModeActive ? "Navegación Manual Activa" : "Entrar Modo Caminata"}
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
            onWalkModeLock={handleWalkModeLock}
          />
          
          <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
            {!isWalkModeActive && (
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
            )}

            {isWalkModeActive && (
              <div className="bg-slate-900/90 backdrop-blur text-white px-4 py-3 rounded-xl border border-white/10 shadow-2xl animate-in slide-in-from-left duration-300 pointer-events-auto">
                <div className="flex items-center gap-2 mb-2">
                  <Gamepad2 className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">EXPLORACIÓN ACTIVA</span>
                </div>
                <div className="grid grid-cols-1 gap-y-2">
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-medium uppercase">WASD / Flechas: Mover y Mirar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MousePointer className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-medium uppercase">Mouse: Mirada Libre (si permitido)</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-white/10 text-[9px] text-slate-400 italic">Presiona el botón de la cabecera para salir</div>
              </div>
            )}
          </div>

          {isWalkModeActive && (isMobile || true) && ( // Mostramos joysticks siempre como fallback si el API falla
            <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
              <div className="absolute bottom-16 left-16 pointer-events-auto">
                <SteelJoystick 
                  label="Movimiento" 
                  onMove={(v) => viewerRef.current?.updateJoystickMove(v.x, v.y)} 
                />
              </div>
              
              <div className="absolute bottom-16 right-16 pointer-events-auto">
                <SteelJoystick 
                  label="Cámara" 
                  onMove={(v) => viewerRef.current?.updateJoystickLook(v.x, v.y)} 
                />
              </div>

              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-auto scale-90">
                <Button 
                  variant="secondary" size="icon" className="w-14 h-14 rounded-full bg-slate-900/40 backdrop-blur border border-white/20" 
                  onMouseDown={() => viewerRef.current?.setMovement('up', true)} onMouseUp={() => viewerRef.current?.setMovement('up', false)}
                  onTouchStart={() => viewerRef.current?.setMovement('up', true)} onTouchEnd={() => viewerRef.current?.setMovement('up', false)}
                >
                  <ArrowUp className="w-6 h-6 text-white" />
                </Button>
                <Button 
                  variant="secondary" size="icon" className="w-14 h-14 rounded-full bg-blue-600/60 backdrop-blur border border-white/20 shadow-lg" 
                  onMouseDown={() => viewerRef.current?.setMovement('sprint', true)} onMouseUp={() => viewerRef.current?.setMovement('sprint', false)}
                  onTouchStart={() => viewerRef.current?.setMovement('sprint', true)} onTouchEnd={() => viewerRef.current?.setMovement('sprint', false)}
                >
                  <Zap className="w-6 h-6 text-white" />
                </Button>
                <Button 
                  variant="secondary" size="icon" className="w-14 h-14 rounded-full bg-slate-900/40 backdrop-blur border border-white/20" 
                  onMouseDown={() => viewerRef.current?.setMovement('down', true)} onMouseUp={() => viewerRef.current?.setMovement('down', false)}
                  onTouchStart={() => viewerRef.current?.setMovement('down', true)} onTouchEnd={() => viewerRef.current?.setMovement('down', false)}
                >
                  <ArrowDown className="w-6 h-6 text-white" />
                </Button>
              </div>
            </div>
          )}

          {!isWalkModeActive && (
            <div className="absolute bottom-4 right-4 bg-slate-900/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20 pointer-events-none">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                <Move className="w-3 h-3" /> ROTAR: CLICK IZQ | PAN: CLICK DER | ZOOM: RUEDA
              </p>
            </div>
          )}
        </div>

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