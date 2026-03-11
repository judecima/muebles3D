'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SteelViewer } from '@/components/steel/SteelViewer';
import { SteelControlPanel } from '@/components/steel/SteelControlPanel';
import { SteelMaterialsTable } from '@/components/steel/SteelMaterialsTable';
import { SteelHouseConfig, SteelWall, SteelOpening, OpeningType } from '@/lib/steel/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Menu, 
  Home, 
  Download,
  Layout,
  Settings2,
  Compass,
  Box,
  ClipboardList,
  ChevronRight,
  MousePointer,
  X,
  Plus
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EDGE_MARGIN = 400; 
const HEADER_SPACE = 300; 
const MIN_SPACE_BETWEEN = 600; 
const DEFAULT_SILL = 900; 

const createInitialWalls = (w: number, l: number, h: number): SteelWall[] => [
  { id: 'w1', length: w, height: h, thickness: 100, x: -w/2, z: -l/2, rotation: 0, openings: [{ id: 'o1', type: 'door', width: 900, height: 2000, position: EDGE_MARGIN }], studSpacing: 400 },
  { id: 'w2', length: l, height: h, thickness: 100, x: w/2, z: -l/2, rotation: 270, openings: [{ id: 'o2', type: 'window', width: 1200, height: 1100, position: EDGE_MARGIN, sillHeight: DEFAULT_SILL }], studSpacing: 400 },
  { id: 'w3', length: w, height: h, thickness: 100, x: w/2, z: l/2, rotation: 180, openings: [], studSpacing: 400 },
  { id: 'w4', length: l, height: h, thickness: 100, x: -w/2, z: l/2, rotation: 90, openings: [{ id: 'o3', type: 'window', width: 1500, height: 1100, position: EDGE_MARGIN, sillHeight: DEFAULT_SILL }], studSpacing: 400 },
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
  const [addingOpening, setAddingOpening] = useState<{ wallId: string, x: number } | null>(null);
  const [newOpData, setNewOpeningData] = useState<{ type: OpeningType, width: number, height: number, sill: number }>({
    type: 'window', width: 1200, height: 1100, sill: DEFAULT_SILL
  });
  const [isWalkModeActive, setIsWalkModeActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'3d' | 'materials'>('3d');
  
  const viewerRef = useRef<{ 
    enterWalkMode: () => void, 
    exitWalkMode: () => void
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

  const handleWallDoubleClick = useCallback((wallId: string, x: number) => {
    setAddingOpening({ wallId, x });
  }, []);

  const handleWalkModeLock = useCallback((locked: boolean) => {
    setIsWalkModeActive(locked);
  }, []);

  const checkOverlap = (wall: SteelWall, opId: string, pos: number, width: number): boolean => {
    return wall.openings.some(o => {
      if (o.id === opId) return false;
      const startA = pos - MIN_SPACE_BETWEEN;
      const endA = pos + width + MIN_SPACE_BETWEEN;
      const startB = o.position;
      const endB = o.position + o.width;
      return (startA < endB && endA > startB);
    });
  };

  const updateOpeningDim = (field: keyof SteelOpening, val: number) => {
    if (!selectedOpening) return;
    const safeVal = isNaN(val) ? 0 : val;
    const wall = config.walls.find(w => w.id === selectedOpening.wallId);
    if (!wall) return;

    let newOpening = { ...selectedOpening.opening, [field]: safeVal };

    if (field === 'width') {
      const maxW = wall.length - newOpening.position - EDGE_MARGIN;
      newOpening.width = Math.max(0, Math.min(safeVal, maxW));
      if (checkOverlap(wall, newOpening.id, newOpening.position, newOpening.width)) return;
    }

    if (field === 'height') {
      const sill = newOpening.type === 'window' ? (newOpening.sillHeight || 0) : 0;
      const maxH = wall.height - sill - HEADER_SPACE;
      newOpening.height = Math.max(0, Math.min(safeVal, maxH));
    }

    if (field === 'sillHeight' && newOpening.type === 'window') {
      const maxSill = wall.height - newOpening.height - HEADER_SPACE;
      newOpening.sillHeight = Math.max(0, Math.min(safeVal, maxSill));
    }

    const newWalls = config.walls.map(w => {
      if (w.id === selectedOpening.wallId) {
        return {
          ...w,
          openings: w.openings.map(o => o.id === selectedOpening.opening.id ? newOpening : o)
        };
      }
      return w;
    });
    setConfig({ ...config, walls: newWalls });
    setSelectedOpening({ ...selectedOpening, opening: newOpening });
  };

  const createOpening = () => {
    if (!addingOpening) return;
    const wall = config.walls.find(w => w.id === addingOpening.wallId);
    if (!wall) return;

    const width = newOpData.width;
    const height = newOpData.height;
    const sill = newOpData.type === 'door' ? 0 : newOpData.sill;

    // Calcular posición centrada en el clic
    let pos = addingOpening.x - width / 2;
    
    // Validar bordes
    pos = Math.max(EDGE_MARGIN, Math.min(pos, wall.length - width - EDGE_MARGIN));

    // Validar superposición
    if (checkOverlap(wall, 'new', pos, width)) {
      alert("No hay espacio suficiente en esta zona. Respete la separación de 600mm entre aberturas.");
      return;
    }

    const newOp: SteelOpening = {
      id: Math.random().toString(36).substr(2, 9),
      type: newOpData.type,
      width,
      height,
      position: pos,
      sillHeight: sill
    };

    const newWalls = config.walls.map(w => 
      w.id === wall.id ? { ...w, openings: [...w.openings, newOp] } : w
    );

    setConfig({ ...config, walls: newWalls });
    setAddingOpening(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-100">
      <aside className={`hidden md:block w-80 h-full border-r bg-white shadow-xl overflow-y-auto shrink-0 z-40 transition-all ${isWalkModeActive ? '-ml-80' : ''}`}>
        <SteelControlPanel 
          config={config} 
          onConfigChange={setConfig} 
        />
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden h-full min-h-0">
        <header className={`flex items-center justify-between px-4 md:px-6 py-2 bg-white border-b shadow-sm z-30 shrink-0 transition-transform ${isWalkModeActive ? '-translate-y-full' : ''}`}>
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
              <span className="text-[10px] font-black uppercase text-slate-800 tracking-tighter">ARQUIMAX WALL ENGINE</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-8">
              <TabsList className="bg-slate-100 h-8 p-1 rounded-lg">
                <TabsTrigger value="3d" className="text-[10px] font-bold uppercase h-6 px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Box className="w-3 h-3 mr-1.5" /> Estructura 3D
                </TabsTrigger>
                <TabsTrigger value="materials" className="text-[10px] font-bold uppercase h-6 px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <ClipboardList className="w-3 h-3 mr-1.5" /> Listado Materiales
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="h-4 w-px bg-slate-200 hidden md:block" />

            <div className="flex gap-2">
              <Button 
                variant="default"
                size="sm" 
                className="h-8 px-4 text-[10px] font-black uppercase tracking-tighter bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => viewerRef.current?.enterWalkMode()}
              >
                <Compass className="w-3.5 h-3.5 mr-2" /> 
                Inspección 3P
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
                onWallDoubleClick={handleWallDoubleClick}
                onWalkModeLock={handleWalkModeLock}
              />
              
              {isWalkModeActive && (
                <div className="absolute top-6 right-6 z-50">
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="rounded-full w-12 h-12 shadow-2xl"
                    onClick={() => viewerRef.current?.exitWalkMode()}
                  >
                    <X className="w-6 h-6" />
                  </Button>
                </div>
              )}

              <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                {!isWalkModeActive && (
                  <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-left">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">PROYECTO ESTRUCTURAL</span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Layout className="w-3 h-3 text-blue-500" />
                        <span className="text-xs font-black text-slate-800">{config.walls.length} Muros</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[9px] font-black text-slate-600 uppercase">Motor de Vanos OK</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!isWalkModeActive && (
                <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200 shadow-sm pointer-events-none">
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex flex-col gap-1 items-end">
                    <span className="flex items-center gap-2"><MousePointer className="w-3 h-3 text-blue-500" /> DOBLE CLICK EN VANOS PARA EDITAR</span>
                    <span className="flex items-center gap-2"><Plus className="w-3 h-3 text-green-500" /> DOBLE CLICK EN MURO PARA AÑADIR</span>
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

        {/* Modal para EDITAR abertura */}
        <Dialog open={!!selectedOpening} onOpenChange={(open) => !open && setSelectedOpening(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 uppercase tracking-tighter font-black text-blue-600">
                <Settings2 className="w-5 h-5" />
                Editar {selectedOpening?.opening.type === 'door' ? 'Puerta' : 'Ventana'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="width" className="text-right text-[10px] font-black uppercase text-slate-500">Ancho</Label>
                <Input
                  id="width"
                  type="number"
                  value={selectedOpening?.opening.width ?? 0}
                  onChange={(e) => updateOpeningDim('width', parseInt(e.target.value) || 0)}
                  className="col-span-3 h-9 font-bold"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="height" className="text-right text-[10px] font-black uppercase text-slate-500">Alto</Label>
                <Input
                  id="height"
                  type="number"
                  value={selectedOpening?.opening.height ?? 0}
                  onChange={(e) => updateOpeningDim('height', parseInt(e.target.value) || 0)}
                  className="col-span-3 h-9 font-bold"
                />
              </div>
              {selectedOpening?.opening.type === 'window' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sillHeight" className="text-right text-[10px] font-black uppercase text-slate-500">Antepecho</Label>
                  <Input
                    id="sillHeight"
                    type="number"
                    value={selectedOpening?.opening.sillHeight ?? 0}
                    onChange={(e) => updateOpeningDim('sillHeight', parseInt(e.target.value) || 0)}
                    className="col-span-3 h-9 font-bold"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setSelectedOpening(null)} className="w-full bg-blue-600 hover:bg-blue-700 font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-200 h-11">
                Confirmar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal para CREAR abertura */}
        <Dialog open={!!addingOpening} onOpenChange={(open) => !open && setAddingOpening(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 uppercase tracking-tighter font-black text-green-600">
                <Plus className="w-5 h-5" />
                Nueva Abertura
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black uppercase text-slate-500">Tipo</Label>
                <Select value={newOpData.type} onValueChange={(v: OpeningType) => setNewOpeningData({ ...newOpData, type: v })}>
                  <SelectTrigger className="col-span-3 h-9 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="window">Ventana</SelectItem>
                    <SelectItem value="door">Puerta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black uppercase text-slate-500">Ancho</Label>
                <Input
                  type="number"
                  value={newOpData.width}
                  onChange={(e) => setNewOpeningData({ ...newOpData, width: parseInt(e.target.value) || 0 })}
                  className="col-span-3 h-9 font-bold"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black uppercase text-slate-500">Alto</Label>
                <Input
                  type="number"
                  value={newOpData.height}
                  onChange={(e) => setNewOpeningData({ ...newOpData, height: parseInt(e.target.value) || 0 })}
                  className="col-span-3 h-9 font-bold"
                />
              </div>
              {newOpData.type === 'window' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-[10px] font-black uppercase text-slate-500">Antepecho</Label>
                  <Input
                    type="number"
                    value={newOpData.sill}
                    onChange={(e) => setNewOpeningData({ ...newOpData, sill: parseInt(e.target.value) || 0 })}
                    className="col-span-3 h-9 font-bold"
                  />
                </div>
              )}
            </div>
            <DialogFooter className="flex flex-col gap-2">
              <Button onClick={createOpening} className="w-full bg-green-600 hover:bg-green-700 font-black uppercase text-xs tracking-widest shadow-lg shadow-green-200 h-11">
                Insertar Vano
              </Button>
              <p className="text-[9px] text-slate-400 italic text-center">
                Se aplicarán márgenes normativos de 400mm y 600mm.
              </p>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
