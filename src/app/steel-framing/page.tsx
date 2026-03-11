'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SteelViewer } from '@/components/steel/SteelViewer';
import { SteelControlPanel } from '@/components/steel/SteelControlPanel';
import { SteelMaterialsTable } from '@/components/steel/SteelMaterialsTable';
import { SteelHouseConfig, SteelWall, SteelOpening, OpeningType, InternalWall } from '@/lib/steel/types';
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
  Plus,
  Trash2,
  ArrowRightLeft,
  Columns
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
  internalWalls: [],
  layers: {
    exteriorPanels: true,
    interiorPanels: true,
    steelProfiles: true,
    horizontalBlocking: true,
    lintels: true,
    reinforcements: true,
    bracing: true
  },
  structuralMode: false
};

export default function SteelFramingPage() {
  const [config, setConfig] = useState<SteelHouseConfig>(INITIAL_CONFIG);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // States para modales y edición
  const [selectedOpening, setSelectedOpening] = useState<{ wallId: string, opening: SteelOpening } | null>(null);
  const [localOpeningData, setLocalOpeningData] = useState<{ width: string, position: string } | null>(null);
  
  const [addingOpening, setAddingOpening] = useState<{ wallId: string, x: number } | null>(null);
  const [editingInternalWall, setEditingInternalWall] = useState<InternalWall | null>(null);
  const [localInternalWallLength, setLocalInternalWallLength] = useState<string>('');
  
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
    setLocalOpeningData({
      width: opening.width.toString(),
      position: Math.round(opening.position).toString()
    });
  }, []);

  const handleWallDoubleClick = useCallback((wallId: string, x: number, side: 'exterior' | 'interior') => {
    if (side === 'exterior') {
      setAddingOpening({ wallId, x });
    } else {
      const parent = config.walls.find(w => w.id === wallId);
      if (!parent) return;

      // Cálculo de rotación para que apunte hacia ADENTRO
      // parent.rotation 0 -> Inward +Z -> Internal rot 270 (X points +Z)
      const targetRotation = (parent.rotation - 90 + 360) % 360;

      const newIW: InternalWall = {
        id: Math.random().toString(36).substr(2, 9),
        parentWallId: wallId,
        xPosition: x,
        length: 2000, 
        height: config.globalWallHeight,
        rotation: targetRotation,
        x: 0, 
        z: 0
      };
      
      setConfig(prev => ({
        ...prev,
        internalWalls: [...prev.internalWalls, newIW]
      }));
      setEditingInternalWall(newIW);
      setLocalInternalWallLength(newIW.length.toString());
    }
  }, [config.walls, config.globalWallHeight]);

  const commitInternalWallLength = () => {
    if (!editingInternalWall) return;
    const val = parseInt(localInternalWallLength) || 0;
    const updated = { ...editingInternalWall, length: val };
    setConfig(prev => ({
      ...prev,
      internalWalls: prev.internalWalls.map(iw => iw.id === updated.id ? updated : iw)
    }));
    setEditingInternalWall(updated);
  };

  const deleteInternalWall = () => {
    if (!editingInternalWall) return;
    setConfig(prev => ({
      ...prev,
      internalWalls: prev.internalWalls.filter(iw => iw.id !== editingInternalWall.id)
    }));
    setEditingInternalWall(null);
  };

  const handleWalkModeLock = useCallback((locked: boolean) => {
    setIsWalkModeActive(locked);
  }, []);

  const commitOpeningChange = () => {
    if (!selectedOpening || !localOpeningData) return;
    
    const w = parseInt(localOpeningData.width) || 0;
    const p = parseInt(localOpeningData.position) || 0;
    
    const wall = config.walls.find(w => w.id === selectedOpening.wallId);
    if (!wall) return;

    const newOpening = { ...selectedOpening.opening, width: w, position: p };
    
    const newWalls = config.walls.map(w => 
      w.id === selectedOpening.wallId 
        ? { ...w, openings: w.openings.map(o => o.id === selectedOpening.opening.id ? newOpening : o) } 
        : w
    );
    
    setConfig({ ...config, walls: newWalls });
    setSelectedOpening({ ...selectedOpening, opening: newOpening });
  };

  const handleDeleteOpening = () => {
    if (!selectedOpening) return;
    const newWalls = config.walls.map(w => w.id === selectedOpening.wallId ? { ...w, openings: w.openings.filter(o => o.id !== selectedOpening.opening.id) } : w);
    setConfig({ ...config, walls: newWalls });
    setSelectedOpening(null);
  };

  const createOpening = () => {
    if (!addingOpening) return;
    const wall = config.walls.find(w => w.id === addingOpening.wallId);
    if (!wall) return;
    const newOp: SteelOpening = {
      id: Math.random().toString(36).substr(2, 9),
      type: newOpData.type,
      width: newOpData.width,
      height: newOpData.height,
      position: addingOpening.x - newOpData.width / 2,
      sillHeight: newOpData.type === 'window' ? newOpData.sill : 0
    };
    setConfig({ ...config, walls: config.walls.map(w => w.id === wall.id ? { ...w, openings: [...w.openings, newOp] } : w) });
    setAddingOpening(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-100">
      <aside className={`hidden md:block w-80 h-full border-r bg-white shadow-xl overflow-y-auto shrink-0 z-40 transition-all ${isWalkModeActive ? '-ml-80' : ''}`}>
        <SteelControlPanel config={config} onConfigChange={setConfig} />
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden h-full min-h-0">
        <header className={`flex items-center justify-between px-4 md:px-6 py-2 bg-white border-b shadow-sm z-30 shrink-0 transition-transform ${isWalkModeActive ? '-translate-y-full' : ''}`}>
          <div className="flex items-center gap-2">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden"><Menu className="w-5 h-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                <SteelControlPanel config={config} onConfigChange={setConfig} />
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
                <TabsTrigger value="3d" className="text-[10px] font-bold uppercase h-6 px-3"><Box className="w-3 h-3 mr-1.5" /> Estructura 3D</TabsTrigger>
                <TabsTrigger value="materials" className="text-[10px] font-bold uppercase h-6 px-3"><ClipboardList className="w-3 h-3 mr-1.5" /> Listado Materiales</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex gap-2">
              <Button variant="default" size="sm" className="h-8 px-4 text-[10px] font-black uppercase bg-blue-600 hover:bg-blue-700 text-white" onClick={() => viewerRef.current?.enterWalkMode()}><Compass className="w-3.5 h-3.5 mr-2" /> Inspección 3P</Button>
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
              
              {!isWalkModeActive && (
                <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200 shadow-sm pointer-events-none">
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex flex-col gap-1 items-end">
                    <span className="flex items-center gap-2"><MousePointer className="w-3 h-3 text-blue-500" /> DOBLE CLICK CARA EXTERNA: VANOS</span>
                    <span className="flex items-center gap-2"><Plus className="w-3 h-3 text-green-500" /> DOBLE CLICK CARA INTERNA: TABIQUES</span>
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="materials" className="w-full h-full m-0 bg-slate-50 overflow-y-auto p-4 md:p-8">
              <div className="max-w-4xl mx-auto">
                <SteelMaterialsTable config={config} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Modal Editar Vano */}
        <Dialog open={!!selectedOpening} onOpenChange={(open) => !open && setSelectedOpening(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 uppercase tracking-tighter font-black text-blue-600">
                <Settings2 className="w-5 h-5" /> Editar Vano
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black uppercase text-slate-500">Ancho</Label>
                <Input 
                  type="number" 
                  value={localOpeningData?.width || ''} 
                  onChange={(e) => setLocalOpeningData(prev => prev ? { ...prev, width: e.target.value } : null)}
                  onBlur={commitOpeningChange}
                  onKeyDown={(e) => e.key === 'Enter' && commitOpeningChange()}
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black uppercase text-slate-500">Posición</Label>
                <Input 
                  type="number" 
                  value={localOpeningData?.position || ''} 
                  onChange={(e) => setLocalOpeningData(prev => prev ? { ...prev, position: e.target.value } : null)}
                  onBlur={commitOpeningChange}
                  onKeyDown={(e) => e.key === 'Enter' && commitOpeningChange()}
                  className="col-span-3" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="destructive" onClick={handleDeleteOpening} className="font-bold uppercase text-[10px]"><Trash2 className="w-4 h-4 mr-2" /> Eliminar</Button>
              <Button onClick={() => setSelectedOpening(null)} className="bg-blue-600 font-black uppercase text-[10px]">Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Nuevo Vano */}
        <Dialog open={!!addingOpening} onOpenChange={(open) => !open && setAddingOpening(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle className="font-black text-green-600 uppercase">Nuevo Vano</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black">Tipo</Label>
                <Select value={newOpData.type} onValueChange={(v: any) => setNewOpeningData({ ...newOpData, type: v })}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="window">Ventana</SelectItem><SelectItem value="door">Puerta</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black">Ancho</Label>
                <Input type="number" value={newOpData.width} onChange={(e) => setNewOpeningData({ ...newOpData, width: parseInt(e.target.value) || 0 })} className="col-span-3" />
              </div>
            </div>
            <DialogFooter><Button onClick={createOpening} className="w-full bg-green-600 font-black uppercase text-xs h-11">Insertar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Editar Tabique Interno */}
        <Dialog open={!!editingInternalWall} onOpenChange={(open) => !open && setEditingInternalWall(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 uppercase tracking-tighter font-black text-purple-600">
                <Columns className="w-5 h-5" /> Editar Tabique Drywall
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black uppercase text-slate-500">Largo (mm)</Label>
                <Input
                  type="number"
                  value={localInternalWallLength}
                  onChange={(e) => setLocalInternalWallLength(e.target.value)}
                  onBlur={commitInternalWallLength}
                  onKeyDown={(e) => e.key === 'Enter' && commitInternalWallLength()}
                  className="col-span-3 h-9 font-bold"
                />
              </div>
              <p className="text-[9px] text-slate-400 italic col-span-4 text-center">
                El largo máximo está limitado por las paredes perimetrales.
              </p>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="destructive" onClick={deleteInternalWall} className="font-bold uppercase text-[10px]"><Trash2 className="w-4 h-4 mr-2" /> Eliminar</Button>
              <Button onClick={() => setEditingInternalWall(null)} className="bg-purple-600 font-black uppercase text-[10px] flex-1">Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
