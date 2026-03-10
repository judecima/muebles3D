'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SteelViewer } from '@/components/steel/SteelViewer';
import { SteelControlPanel } from '@/components/steel/SteelControlPanel';
import { SteelJoystick } from '@/components/steel/SteelJoystick';
import { SteelMaterialsTable } from '@/components/steel/SteelMaterialsTable';
import { SteelHouseConfig, SteelWall, SteelOpening } from '@/lib/steel/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Menu, 
  Home, 
  Download,
  Layout,
  Move,
  Settings2,
  Compass,
  Keyboard,
  ArrowUp,
  ArrowDown,
  Zap,
  Gamepad2,
  MousePointer,
  Box,
  ClipboardList,
  ChevronRight
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';

const createInitialWalls = (w: number, l: number, h: number): SteelWall[] => [
  { id: 'w1', length: w, height: h, thickness: 100, x: -w/2, z: -l/2, rotation: 0, openings: [{ id: 'o1', type: 'door', width: 900, height: 2050, position: w/2 - 450 }], studSpacing: 400 },
  { id: 'w2', length: l, height: h, thickness: 100, x: w/2, z: -l/2, rotation: 270, openings: [{ id: 'o2', type: 'window', width: 1200, height: 1100, position: l/2 - 600, sillHeight: 900 }], studSpacing: 400 },
  { id: 'w3', length: w, height: h, thickness: 100, x: w/2, z: l/2, rotation: 180, openings: [], studSpacing: 400 },
  { id: 'w4', length: l, height: h, thickness: 100, x: -w/2, z: l/2, rotation: 90, openings: [{ id: 'o3', type: 'window', width: 1500, height: 1100, position: l/2 - 750, sillHeight: 900 }], studSpacing: 400 },
];

const INITIAL_CONFIG: SteelHouseConfig = {
  width: 6000,
  length: 6000,
  globalWallHeight: 2600,
  walls: createInitialWalls(6000, 6000, 2600),
  layers: {
    exteriorPanels: true,
    interiorPanels: false,
    steelProfiles: true,
    crossBracing: true,
    horizontalBlocking: true,
    lintels: true,
    reinforcements: true
  },
  structuralMode: false
};

export default function SteelFramingPage() {
  const [config, setConfig] = useState<SteelHouseConfig>(INITIAL_CONFIG);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedOpening, setSelectedOpening] = useState<{ wallId: string, opening: SteelOpening } | null>(null);
  const [isWalkModeActive, setIsWalkModeActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'3d' | 'materials'>('3d');
  const isMobile = useIsMobile();
  
  const viewerRef = useRef<{ 
    enterWalkMode: () => void, 
    setMovement: (dir: string, active: boolean) => void,
    updateJoystickMove: (x: number, y: number) => void,
    updateJoystickLook: (x: number, y: number) => void
  }>(null);

  useEffect(() => {
    const newWalls = config.walls.map(w => {
      if (w.id === 'w1') return { ...w, length: config.width, x: -config.width/2, z: -config.length/2 };
      if (w.id === 'w2') return { ...w, length: config.length, x: config.width/2, z: -config.length/2 };
      if (w.id === 'w3') return { ...w, length: config.width, x: config.width/2, z: config.length/2 };
      if (w.id === 'w4') return { ...w, length: config.length, x: -config.width/2, z: config.length/2 };
      return w;
    });
    
    const hasChanges = newWalls.some((w, i) => 
      w.length !== config.walls[i]?.length || 
      w.x !== config.walls[i]?.x || 
      w.z !== config.walls[i]?.z
    );

    if (hasChanges) {
      setConfig(prev => ({ ...prev, walls: newWalls }));
    }
  }, [config.width, config.length]);

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
              <span className="text-[10px] font-black uppercase text-slate-800 tracking-tighter">ARQUIMAX STEEL v2.9</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-8">
              <TabsList className="bg-slate-100 h-8 p-1 rounded-lg">
                <TabsTrigger value="3d" className="text-[10px] font-bold uppercase h-6 px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Box className="w-3 h-3 mr-1.5" /> Diseño 3D
                </TabsTrigger>
                <TabsTrigger value="materials" className="text-[10px] font-bold uppercase h-6 px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <ClipboardList className="w-3 h-3 mr-1.5" /> Listado Materiales
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="h-4 w-px bg-slate-200 hidden md:block" />

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
                {isWalkModeActive ? "Salir" : "Caminar"}
              </Button>
              <Button variant="outline" size="sm" className="h-8 px-3 text-[10px] font-bold">
                <Download className="w-3.5 h-3.5 mr-2" /> 
                EXPORTAR
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden">
          <Tabs value={activeTab} className="w-full h-full">
            <TabsContent value="3d" className="w-full h-full m-0 p-0 relative">
              <SteelViewer 
                ref={viewerRef}
                config={config} 
                onOpeningDoubleClick={handleOpeningDoubleClick}
                onWalkModeLock={handleWalkModeLock}
              />
              
              <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                {!isWalkModeActive && (
                  <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-left">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">PROYECTO ACTIVO</span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Layout className="w-3 h-3 text-blue-500" />
                        <span className="text-xs font-black text-slate-800">{config.walls.length} Muros</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[9px] font-black text-slate-600 uppercase">Motor Estructural OK</span>
                      </div>
                    </div>
                  </div>
                )}

                {isWalkModeActive && (
                  <div className="bg-slate-900/90 backdrop-blur text-white px-4 py-3 rounded-xl border border-white/10 shadow-2xl animate-in zoom-in duration-300 pointer-events-auto">
                    <div className="flex items-center gap-2 mb-2">
                      <Gamepad2 className="w-4 h-4 text-blue-400" />
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">MODO CAMINATA</span>
                    </div>
                    <div className="grid grid-cols-1 gap-y-2">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Keyboard className="w-3 h-3" />
                        <span className="text-[9px] font-medium uppercase">W-A-S-D: Moverse</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Move className="w-3 h-3" />
                        <span className="text-[9px] font-medium uppercase">Flechas: Cámara</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {isWalkModeActive && (
                <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                  <div className="absolute bottom-16 left-16 pointer-events-auto">
                    <SteelJoystick 
                      label="Moverse" 
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
                <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200 shadow-sm pointer-events-none">
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <MousePointer className="w-3 h-3 text-blue-500" /> ROTAR: CLICK IZQ | PAN: CLICK DER | ZOOM: RUEDA
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="materials" className="w-full h-full m-0 bg-slate-50 overflow-y-auto p-4 md:p-8">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
                    <ClipboardList className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Cómputo Métrico</h2>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>Estimación Industrial</span>
                      <ChevronRight className="w-3 h-3" />
                      <span>{config.width}x{config.length}mm</span>
                    </div>
                  </div>
                </div>
                <SteelMaterialsTable config={config} />
              </div>
            </TabsContent>
          </Tabs>
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
