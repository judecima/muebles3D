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
  Settings2,
  Compass,
  Box,
  ClipboardList,
  Plus,
  Trash2,
  DoorOpen,
  Settings,
  ArrowRightToLine,
  Check,
  LayoutTemplate,
  MoveLeft,
  MoveRight,
  LogOut,
  ArrowLeft
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

const EDGE_MARGIN_EXTERIOR = 400; 
const EDGE_MARGIN_INTERNAL = 50; 
const INTERSECTION_MARGIN = 100; 
const DEFAULT_SILL = 900; 
const EXTERIOR_WALL_THICKNESS = 100;

const createInitialWalls = (w: number, l: number, h: number): SteelWall[] => [
  { id: 'w1', length: w, height: h, thickness: EXTERIOR_WALL_THICKNESS, x: -w/2, z: -l/2, rotation: 0, openings: [{ id: 'o1', type: 'door', width: 900, height: 2050, position: EDGE_MARGIN_EXTERIOR }], studSpacing: 400 },
  { id: 'w2', length: l, height: h, thickness: EXTERIOR_WALL_THICKNESS, x: w/2, z: -l/2, rotation: 270, openings: [{ id: 'o2', type: 'window', width: 1200, height: 1100, position: EDGE_MARGIN_EXTERIOR, sillHeight: DEFAULT_SILL }], studSpacing: 400 },
  { id: 'w3', length: w, height: h, thickness: EXTERIOR_WALL_THICKNESS, x: w/2, z: l/2, rotation: 180, openings: [], studSpacing: 400 },
  { id: 'w4', length: l, height: h, thickness: EXTERIOR_WALL_THICKNESS, x: -w/2, z: l/2, rotation: 90, openings: [{ id: 'o3', type: 'window', width: 1500, height: 1100, position: EDGE_MARGIN_EXTERIOR, sillHeight: DEFAULT_SILL }], studSpacing: 400 },
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
  const [structuralResult, setStructuralResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [selectedOpening, setSelectedOpening] = useState<{ wallId: string, opening: SteelOpening, isInternal?: boolean } | null>(null);
  const [localOpeningData, setLocalOpeningData] = useState<{ width: string, position: string } | null>(null);
  const [addingOpening, setAddingOpening] = useState<{ wallId: string, x: number, isInternal?: boolean } | null>(null);
  const [newOpData, setNewOpeningData] = useState<{ type: OpeningType, width: number, height: number, sill: number }>({
    type: 'window', width: 1200, height: 1100, sill: DEFAULT_SILL
  });

  const [wallActionChoice, setWallActionChoice] = useState<(InternalWall & { lastClickX?: number }) | null>(null);
  const [editingInternalWall, setEditingInternalWall] = useState<InternalWall | null>(null);
  const [localIWData, setLocalIWData] = useState<{ length: string, xPosition: string } | null>(null);
  
  const [roomGenerator, setRoomGenerator] = useState<{ x: number, z: number, p1: InternalWall, p2: InternalWall } | null>(null);

  const [isWalkModeActive, setIsWalkModeActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'3d' | 'materials'>('3d');
  const viewerRef = useRef<{ enterWalkMode: () => void, exitWalkMode: () => void }>(null);

  const calculateStructure = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/steel/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const result = await res.json();
      setStructuralResult(result);
    } catch (error) {
      console.error("Steel Engine API Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    calculateStructure();
  }, [config]);

  const updateConfig = (newConfig: Partial<SteelHouseConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const getWallSegments = useCallback((wallId: string, clickX: number, totalLength: number, isInternalWall: boolean) => {
    const baseMargin = isInternalWall ? EDGE_MARGIN_INTERNAL : EDGE_MARGIN_EXTERIOR;
    const boundaries = [0];
    config.internalWalls.forEach(iw => {
      if (iw.parentWallId === wallId) boundaries.push(iw.xPosition);
    });
    const sortedBounds = Array.from(new Set([...boundaries, totalLength])).sort((a, b) => a - b);
    for (let i = 0; i < sortedBounds.length - 1; i++) {
      if (clickX >= sortedBounds[i] && clickX <= sortedBounds[i+1]) {
        const start = sortedBounds[i];
        const end = sortedBounds[i+1];
        const min = start === 0 ? baseMargin : start + INTERSECTION_MARGIN;
        const max = end === totalLength ? totalLength - baseMargin : end - INTERSECTION_MARGIN;
        return { start, end, min, max };
      }
    }
    return { start: 0, end: totalLength, min: baseMargin, max: totalLength - baseMargin };
  }, [config.internalWalls]);

  const handleOpeningDoubleClick = useCallback((wallId: string, opening: SteelOpening, isInternal?: boolean) => {
    const wall = isInternal ? config.internalWalls.find(iw => iw.id === wallId) : config.walls.find(w => w.id === wallId);
    if (!wall) return;
    const bounds = getWallSegments(wallId, opening.position + opening.width / 2, wall.length, !!isInternal);
    setSelectedOpening({ wallId, opening, isInternal });
    setLocalOpeningData({ width: opening.width.toString(), position: Math.round(opening.position - bounds.start).toString() });
  }, [config.walls, config.internalWalls, getWallSegments]);

  const commitOpeningChange = () => {
    if (!selectedOpening || !localOpeningData) return;
    const inputW = parseInt(localOpeningData.width) || 0;
    const inputRelP = parseInt(localOpeningData.position) || 0;
    const wall = selectedOpening.isInternal ? config.internalWalls.find(iw => iw.id === selectedOpening.wallId) : config.walls.find(w => w.id === selectedOpening.wallId);
    if (!wall) return;
    const bounds = getWallSegments(wall.id, selectedOpening.opening.position + selectedOpening.opening.width / 2, wall.length, !!selectedOpening.isInternal);
    const absPos = bounds.start + inputRelP;
    const finalW = Math.min(inputW, bounds.max - bounds.min);
    const finalP = Math.max(bounds.min, Math.min(absPos, bounds.max - finalW));

    if (selectedOpening.isInternal) {
      updateConfig({ internalWalls: config.internalWalls.map(iw => iw.id === selectedOpening.wallId ? { ...iw, openings: iw.openings.map(o => o.id === selectedOpening.opening.id ? { ...o, width: finalW, position: finalP } : o) } : iw) });
    } else {
      updateConfig({ walls: config.walls.map(w => w.id === selectedOpening.wallId ? { ...w, openings: w.openings.map(o => o.id === selectedOpening.opening.id ? { ...o, width: finalW, position: finalP } : o) } : w) });
    }
    setSelectedOpening(null);
  };

  const deleteOpening = () => {
    if (!selectedOpening) return;
    if (selectedOpening.isInternal) {
      updateConfig({ internalWalls: config.internalWalls.map(iw => iw.id === selectedOpening.wallId ? { ...iw, openings: iw.openings.filter(o => o.id !== selectedOpening.opening.id) } : iw) });
    } else {
      updateConfig({ walls: config.walls.map(w => w.id === selectedOpening.wallId ? { ...w, openings: w.openings.filter(o => o.id !== selectedOpening.opening.id) } : w) });
    }
    setSelectedOpening(null);
  };

  const handleInternalWallDoubleClick = useCallback((iw: InternalWall, x: number) => {
    setWallActionChoice({ ...iw, lastClickX: x });
  }, []);

  const handleWallDoubleClick = useCallback((wallId: string, x: number, side: 'exterior' | 'interior') => {
    const parent = config.walls.find(w => w.id === wallId);
    if (!parent) return;
    if (side === 'exterior') {
      setAddingOpening({ wallId, x, isInternal: false });
      setNewOpeningData({ type: 'window', width: 1200, height: 1100, sill: DEFAULT_SILL });
    } else {
      const targetRot = (parent.rotation - 90 + 360) % 360;
      const newIW: InternalWall = { id: Math.random().toString(36).substr(2, 9), parentWallId: wallId, xPosition: Math.round(x), length: 2000, height: config.globalWallHeight, rotation: targetRot, x: 0, z: 0, openings: [] };
      updateConfig({ internalWalls: [...config.internalWalls, newIW] });
      setEditingInternalWall(newIW);
      setLocalIWData({ length: '2000', xPosition: Math.round(x).toString() });
    }
  }, [config.walls, config.globalWallHeight, config.internalWalls]);

  const commitInternalWallChange = () => {
    if (!editingInternalWall || !localIWData) return;
    updateConfig({ internalWalls: config.internalWalls.map(iw => iw.id === editingInternalWall.id ? { ...iw, length: parseInt(localIWData.length) || 500, xPosition: parseInt(localIWData.xPosition) || 0 } : iw) });
    setEditingInternalWall(null);
  };

  const deleteInternalWall = () => {
    if (!editingInternalWall) return;
    updateConfig({ internalWalls: config.internalWalls.filter(iw => iw.id !== editingInternalWall.id) });
    setEditingInternalWall(null);
  };

  const handleFloorDoubleClick = (x: number, z: number) => {
    const candidates = config.internalWalls.filter(iw => iw.length < (config.width - 200));
    if (candidates.length >= 2) setRoomGenerator({ x, z, p1: candidates[0], p2: candidates[1] });
  };

  const closeRoomWithNewWall = () => {
    if (!roomGenerator) return;
    const { p1, p2 } = roomGenerator;
    const dist = Math.abs(p1.xPosition - p2.xPosition);
    const newWall: InternalWall = {
      id: Math.random().toString(36).substr(2,9), parentWallId: p1.id, xPosition: p1.length, length: dist,
      height: config.globalWallHeight, rotation: (p1.rotation + 90) % 360, x: 0, z: 0, openings: []
    };
    updateConfig({ internalWalls: [...config.internalWalls, newWall] });
    setRoomGenerator(null);
  };

  const createOpening = () => {
    if (!addingOpening) return;
    const wall = addingOpening.isInternal ? config.internalWalls.find(iw => iw.id === addingOpening.wallId) : config.walls.find(w => w.id === addingOpening.wallId);
    if (!wall) return;
    const bounds = getWallSegments(wall.id, addingOpening.x, wall.length, !!addingOpening.isInternal);
    const finalW = Math.min(newOpData.width, bounds.max - bounds.min);
    const finalP = Math.max(bounds.min, Math.min(addingOpening.x - finalW / 2, bounds.max - finalW));
    const newOp: SteelOpening = { id: Math.random().toString(36).substr(2, 9), type: newOpData.type, width: finalW, height: newOpData.height, position: finalP, sillHeight: newOpData.type === 'window' ? newOpData.sill : 0 };
    if (addingOpening.isInternal) {
      updateConfig({ internalWalls: config.internalWalls.map(iw => iw.id === wall.id ? { ...iw, openings: [...iw.openings, newOp] } : iw) });
    } else {
      updateConfig({ walls: config.walls.map(w => w.id === wall.id ? { ...w, openings: [...w.openings, newOp] } : w) });
    }
    setAddingOpening(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-100">
      <aside className={`hidden md:block w-80 h-full border-r bg-white shadow-xl overflow-y-auto shrink-0 z-40 transition-all ${isWalkModeActive ? '-ml-80' : ''}`}>
        <SteelControlPanel config={config} onConfigChange={setConfig} structuralAlerts={structuralResult?.alerts || []} />
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden h-full min-h-0">
        <header className={`flex items-center justify-between px-4 md:px-6 py-2 bg-white border-b shadow-sm z-30 shrink-0 transition-transform ${isWalkModeActive ? '-translate-y-full' : ''}`}>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-1.5">
              <Home className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase text-slate-800 tracking-tighter">JADSI STEEL ENGINE</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-8">
              <TabsList className="bg-slate-100 h-8 p-1 rounded-lg">
                <TabsTrigger value="3d" className="text-[10px] font-bold uppercase h-6 px-3"><Box className="w-3 h-3 mr-1.5" /> 3D Estructural</TabsTrigger>
                <TabsTrigger value="materials" className="text-[10px] font-bold uppercase h-6 px-3"><ClipboardList className="w-3 h-3 mr-1.5" /> Materiales</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="default" size="sm" className="h-8 px-4 text-[10px] font-black uppercase bg-primary hover:bg-primary/90 text-white" onClick={() => viewerRef.current?.enterWalkMode()}><Compass className="w-3.5 h-3.5 mr-2" /> Inspección 3P</Button>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden">
          <Tabs value={activeTab} className="w-full h-full">
            <TabsContent value="3d" className="w-full h-full m-0 p-0 relative">
              <SteelViewer 
                ref={viewerRef}
                config={config} 
                structuralResult={structuralResult}
                onOpeningDoubleClick={handleOpeningDoubleClick}
                onInternalWallDoubleClick={handleInternalWallDoubleClick}
                onWallDoubleClick={handleWallDoubleClick}
                onFloorDoubleClick={handleFloorDoubleClick}
                onWalkModeLock={(locked) => setIsWalkModeActive(locked)}
              />
              {isLoading && (
                <div className="absolute top-4 right-4 z-[70] bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-primary/20 flex items-center gap-2 shadow-2xl">
                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-[9px] font-black uppercase text-primary">Calculando AISI...</span>
                </div>
              )}
            </TabsContent>
            <TabsContent value="materials" className="w-full h-full m-0 bg-slate-50 overflow-y-auto p-4 md:p-8">
              <div className="max-w-4xl mx-auto">
                <SteelMaterialsTable estimate={structuralResult?.materials || { items: [], totalSteelWeightKg: 0 }} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* MODALES DE INTERACCIÓN (Preservados del estable) */}
        <Dialog open={!!roomGenerator} onOpenChange={(open) => !open && setRoomGenerator(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="uppercase font-black text-primary flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5" /> Generar Ambiente
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase">Se han detectado tabiques paralelos libres. ¿Deseas unirlos para cerrar el recinto?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={closeRoomWithNewWall} className="w-full bg-primary font-black uppercase text-xs h-11">Unir Tabiques y Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingInternalWall} onOpenChange={(open) => !open && setEditingInternalWall(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle className="uppercase font-black text-primary">Editar Tabique Interno</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black uppercase">Largo (mm)</Label>
                <Input type="number" value={localIWData?.length || ''} onChange={(e) => setLocalIWData(prev => prev ? { ...prev, length: e.target.value } : null)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black uppercase">Posición (mm)</Label>
                <Input type="number" value={localIWData?.xPosition || ''} onChange={(e) => setLocalIWData(prev => prev ? { ...prev, xPosition: e.target.value } : null)} className="col-span-3" />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="destructive" onClick={deleteInternalWall} className="flex-1 font-black uppercase text-[10px]"><Trash2 className="w-3 h-3 mr-2" /> Eliminar</Button>
              <Button onClick={commitInternalWallChange} className="flex-1 bg-primary font-black uppercase text-[10px]"><Check className="w-3 h-3 mr-2" /> Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedOpening} onOpenChange={(open) => !open && setSelectedOpening(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle className="flex items-center gap-2 uppercase tracking-tighter font-black text-primary"><Settings2 className="w-5 h-5" /> Editar Vano</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right text-[10px] font-black uppercase text-slate-500">Ancho</Label><Input type="number" value={localOpeningData?.width || ''} onChange={(e) => setLocalOpeningData(prev => prev ? { ...prev, width: e.target.value } : null)} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right text-[10px] font-black uppercase text-slate-500">Offset (mm)</Label><Input type="number" value={localOpeningData?.position || ''} onChange={(e) => setLocalOpeningData(prev => prev ? { ...prev, position: e.target.value } : null)} className="col-span-3" /></div>
            </div>
            <DialogFooter className="flex gap-2"><Button variant="destructive" onClick={deleteOpening} className="flex-1 font-black uppercase text-[10px]"><Trash2 className="w-3 h-3 mr-2" /> Eliminar</Button><Button onClick={commitOpeningChange} className="flex-1 bg-primary font-black uppercase text-[10px]">Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!addingOpening} onOpenChange={(open) => !open && setAddingOpening(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle className="font-black text-primary uppercase">Nuevo Vano</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black">Tipo</Label>
                <Select value={newOpData.type} onValueChange={(v: any) => { const isDoor = v === 'door'; setNewOpeningData({ ...newOpData, type: v, height: isDoor ? 2050 : 1100, sill: isDoor ? 0 : DEFAULT_SILL }); }}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="window">Ventana</SelectItem><SelectItem value="door">Puerta</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right text-[10px] font-black">Ancho</Label><Input type="number" value={newOpData.width} onChange={(e) => setNewOpeningData({ ...newOpData, width: parseInt(e.target.value) || 0 })} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right text-[10px] font-black">Altura</Label><Input type="number" value={newOpData.height} onChange={(e) => setNewOpeningData({ ...newOpData, height: parseInt(e.target.value) || 0 })} className="col-span-3" /></div>
            </div>
            <DialogFooter><Button onClick={createOpening} className="w-full bg-primary font-black uppercase text-xs h-11">Insertar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!wallActionChoice} onOpenChange={(open) => !open && setWallActionChoice(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader><DialogTitle className="uppercase font-black text-slate-800 tracking-tighter">Opciones de Tabique</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-6">
              <Button variant="outline" className="flex flex-col h-32 gap-3 border-2 hover:border-primary hover:bg-blue-50 transition-all group" onClick={() => { setAddingOpening({ wallId: wallActionChoice!.id, x: wallActionChoice!.lastClickX || wallActionChoice!.length / 2, isInternal: true }); setNewOpeningData({ type: 'door', width: 900, height: 2050, sill: 0 }); setWallActionChoice(null); }}><DoorOpen className="w-8 h-8 text-slate-400 group-hover:text-primary" /><span className="font-black uppercase text-[10px]">Sumar Puerta</span></Button>
              <Button variant="outline" className="flex flex-col h-32 gap-3 border-2 hover:border-primary hover:bg-blue-50 transition-all group" onClick={() => { setEditingInternalWall(wallActionChoice); setLocalIWData({ length: wallActionChoice!.length.toString(), xPosition: Math.round(wallActionChoice!.xPosition).toString() }); setWallActionChoice(null); }}><Settings className="w-8 h-8 text-slate-400 group-hover:text-primary" /><span className="font-black uppercase text-[10px]">Editar Estructura</span></Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}