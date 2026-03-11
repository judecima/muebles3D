
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
  MousePointer,
  Plus,
  Trash2,
  Columns,
  Info,
  DoorOpen,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StructuralEngine } from '@/utils/steel/structuralEngine';

const EDGE_MARGIN_EXTERIOR = 400; 
const EDGE_MARGIN_INTERNAL = 50; 
const INTERSECTION_MARGIN = 100; // Margen de seguridad respecto a cruces de paredes
const DEFAULT_SILL = 900; 
const EXTERIOR_WALL_THICKNESS = 100;

const createInitialWalls = (w: number, l: number, h: number): SteelWall[] => [
  { id: 'w1', length: w, height: h, thickness: EXTERIOR_WALL_THICKNESS, x: -w/2, z: -l/2, rotation: 0, openings: [{ id: 'o1', type: 'door', width: 900, height: 2000, position: EDGE_MARGIN_EXTERIOR }], studSpacing: 400 },
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
  const [structuralAlerts, setStructuralAlerts] = useState<any[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [selectedOpening, setSelectedOpening] = useState<{ wallId: string, opening: SteelOpening, isInternal?: boolean } | null>(null);
  const [localOpeningData, setLocalOpeningData] = useState<{ width: string, position: string } | null>(null);
  const [addingOpening, setAddingOpening] = useState<{ wallId: string, x: number } | null>(null);
  const [newOpData, setNewOpeningData] = useState<{ type: OpeningType, width: number, height: number, sill: number }>({
    type: 'window', width: 1200, height: 1100, sill: DEFAULT_SILL
  });

  const [editingInternalWall, setEditingInternalWall] = useState<InternalWall | null>(null);
  const [localIWData, setLocalIWData] = useState<{ length: string, xPosition: string } | null>(null);
  const [wallActionChoice, setWallActionChoice] = useState<InternalWall | null>(null);
  
  const [isWalkModeActive, setIsWalkModeActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'3d' | 'materials'>('3d');
  
  const viewerRef = useRef<{ enterWalkMode: () => void, exitWalkMode: () => void }>(null);

  useEffect(() => {
    const newWalls = config.walls.map(w => {
      if (w.id === 'w1') return { ...w, length: config.width, x: -config.width/2, z: -config.length/2 };
      if (w.id === 'w2') return { ...w, length: config.length, x: config.width/2, z: -config.length/2 };
      if (w.id === 'w3') return { ...w, length: config.width, x: config.width/2, z: config.length/2 };
      if (w.id === 'w4') return { ...w, length: config.length, x: -config.width/2, z: config.length/2 };
      return w;
    });

    const newInternalWalls = config.internalWalls.map(iw => {
      const parent = newWalls.find(w => w.id === iw.parentWallId);
      if (!parent) return iw;

      let maxLen = 10000;
      if (parent.id === 'w1' || parent.id === 'w3') maxLen = config.length - EXTERIOR_WALL_THICKNESS;
      if (parent.id === 'w2' || parent.id === 'w4') maxLen = config.width - EXTERIOR_WALL_THICKNESS;

      const adjustedLength = Math.min(iw.length, maxLen);
      const adjustedX = Math.min(iw.xPosition, parent.length - 50);

      const adjustedOpenings = (iw.openings || []).map(op => {
        const margin = EDGE_MARGIN_INTERNAL;
        const finalW = Math.min(op.width, adjustedLength - margin * 2);
        const finalP = Math.max(margin, Math.min(op.position, adjustedLength - finalW - margin));
        return { ...op, width: finalW, position: finalP };
      });

      return { ...iw, length: adjustedLength, xPosition: adjustedX, openings: adjustedOpenings };
    });
    
    const hasChanges = newWalls.some((w, i) => 
      w.length !== config.walls[i]?.length || 
      w.x !== config.walls[i]?.x || 
      w.z !== config.walls[i]?.z
    ) || newInternalWalls.some((iw, i) => iw.length !== config.internalWalls[i]?.length);

    if (hasChanges) {
      setConfig(prev => ({ ...prev, walls: newWalls, internalWalls: newInternalWalls }));
    }

    setStructuralAlerts(StructuralEngine.validateStructure(config));

  }, [config.width, config.length]);

  const handleOpeningDoubleClick = useCallback((wallId: string, opening: SteelOpening, isInternal?: boolean) => {
    setSelectedOpening({ wallId, opening, isInternal });
    setLocalOpeningData({
      width: opening.width.toString(),
      position: Math.round(opening.position).toString()
    });
  }, []);

  const handleInternalWallDoubleClick = useCallback((iw: InternalWall) => {
    setWallActionChoice(iw);
  }, []);

  const handleWallDoubleClick = useCallback((wallId: string, x: number, side: 'exterior' | 'interior') => {
    const parent = config.walls.find(w => w.id === wallId);
    if (!parent) return;

    if (side === 'exterior') {
      setAddingOpening({ wallId, x });
    } else {
      const isOverOpening = parent.openings.some(op => x >= op.position && x <= (op.position + op.width));
      if (isOverOpening) return;

      const targetRotation = (parent.rotation - 90 + 360) % 360;
      let maxPossibleLength = 2000;
      if (parent.id === 'w1' || parent.id === 'w3') maxPossibleLength = config.length - EXTERIOR_WALL_THICKNESS;
      if (parent.id === 'w2' || parent.id === 'w4') maxPossibleLength = config.width - EXTERIOR_WALL_THICKNESS;

      const newIW: InternalWall = {
        id: Math.random().toString(36).substr(2, 9),
        parentWallId: wallId,
        xPosition: Math.round(x),
        length: Math.min(2000, maxPossibleLength), 
        height: config.globalWallHeight,
        rotation: targetRotation,
        x: 0, z: 0,
        openings: []
      };
      
      setConfig(prev => ({ ...prev, internalWalls: [...prev.internalWalls, newIW] }));
      setEditingInternalWall(newIW);
      setLocalIWData({ length: newIW.length.toString(), xPosition: Math.round(x).toString() });
    }
  }, [config.walls, config.globalWallHeight, config.width, config.length]);

  const commitInternalWallChanges = () => {
    if (!editingInternalWall || !localIWData) return;
    
    const parent = config.walls.find(w => w.id === editingInternalWall.parentWallId);
    if (!parent) {
      setEditingInternalWall(null);
      return;
    }

    let inputLen = parseInt(localIWData.length) || 0;
    let xPos = parseInt(localIWData.xPosition) || 0;

    const isOverOpening = parent.openings.some(op => xPos >= (op.position - 50) && xPos <= (op.position + op.width + 50));
    if (isOverOpening) {
      alert("Punto de anclaje interfiere con abertura.");
      return;
    }

    xPos = Math.max(50, Math.min(xPos, parent.length - 50));
    
    let maxLen = 10000;
    if (parent.id === 'w1' || parent.id === 'w3') maxLen = config.length - EXTERIOR_WALL_THICKNESS;
    if (parent.id === 'w2' || parent.id === 'w4') maxLen = config.width - EXTERIOR_WALL_THICKNESS;
    
    let finalLen = Math.max(100, Math.min(inputLen, maxLen));
    if (inputLen >= maxLen - 100) {
      finalLen = maxLen;
    }

    const adjustedOpenings = (editingInternalWall.openings || []).map(op => {
      const margin = EDGE_MARGIN_INTERNAL;
      const fw = Math.min(op.width, finalLen - margin * 2);
      const fp = Math.max(margin, Math.min(op.position, finalLen - fw - margin));
      return { ...op, width: fw, position: fp };
    });

    const updated: InternalWall = { ...editingInternalWall, length: finalLen, xPosition: xPos, openings: adjustedOpenings };
    
    setConfig(prev => ({
      ...prev,
      internalWalls: prev.internalWalls.map(iw => iw.id === updated.id ? updated : iw)
    }));
    
    setEditingInternalWall(null);
    setLocalIWData(null);
  };

  const deleteInternalWall = () => {
    if (!editingInternalWall) return;
    setConfig(prev => ({ ...prev, internalWalls: prev.internalWalls.filter(iw => iw.id !== editingInternalWall.id) }));
    setEditingInternalWall(null);
  };

  const getWallSegments = (wallId: string, clickX: number, totalLength: number, isInternal: boolean) => {
    const baseMargin = isInternal ? EDGE_MARGIN_INTERNAL : EDGE_MARGIN_EXTERIOR;
    
    // Si es un muro exterior, buscamos tabiques internos que lo toquen
    const intersections = config.internalWalls
      .filter(iw => iw.parentWallId === wallId)
      .map(iw => iw.xPosition);
    
    const boundaries = [0, ...intersections, totalLength].sort((a, b) => a - b);
    
    for (let i = 0; i < boundaries.length - 1; i++) {
      if (clickX >= boundaries[i] && clickX <= boundaries[i+1]) {
        const segMin = boundaries[i] === 0 ? baseMargin : boundaries[i] + INTERSECTION_MARGIN;
        const segMax = boundaries[i+1] === totalLength ? totalLength - baseMargin : boundaries[i+1] - INTERSECTION_MARGIN;
        return { min: segMin, max: segMax };
      }
    }
    return { min: baseMargin, max: totalLength - baseMargin };
  };

  const commitOpeningChange = () => {
    if (!selectedOpening || !localOpeningData) return;
    
    const inputW = parseInt(localOpeningData.width) || 0;
    const inputP = parseInt(localOpeningData.position) || 0;
    
    if (selectedOpening.isInternal) {
      const wall = config.internalWalls.find(iw => iw.id === selectedOpening.wallId);
      if (!wall) return;

      const margin = EDGE_MARGIN_INTERNAL;
      const finalW = Math.min(inputW, wall.length - margin * 2);
      const finalP = Math.max(margin, Math.min(inputP, wall.length - finalW - margin));

      setConfig(prev => ({
        ...prev,
        internalWalls: prev.internalWalls.map(iw => iw.id === selectedOpening.wallId ? {
          ...iw,
          openings: iw.openings.map(o => o.id === selectedOpening.opening.id ? { ...o, width: finalW, position: finalP } : o)
        } : iw)
      }));
    } else {
      const wall = config.walls.find(w => w.id === selectedOpening.wallId);
      if (!wall) return;
      
      const bounds = getWallSegments(wall.id, inputP + inputW/2, wall.length, false);
      const finalW = Math.min(inputW, bounds.max - bounds.min);
      const finalP = Math.max(bounds.min, Math.min(inputP, bounds.max - finalW));
      
      const newOpening = { ...selectedOpening.opening, width: finalW, position: finalP };
      setConfig({ ...config, walls: config.walls.map(w => 
        w.id === selectedOpening.wallId 
          ? { ...w, openings: w.openings.map(o => o.id === selectedOpening.opening.id ? newOpening : o) } 
          : w
      )});
    }
    setSelectedOpening(null);
  };

  const handleDeleteOpening = () => {
    if (!selectedOpening) return;
    if (selectedOpening.isInternal) {
      setConfig(prev => ({
        ...prev,
        internalWalls: prev.internalWalls.map(iw => iw.id === selectedOpening.wallId ? {
          ...iw,
          openings: iw.openings.filter(o => o.id !== selectedOpening.opening.id)
        } : iw)
      }));
    } else {
      setConfig({ ...config, walls: config.walls.map(w => w.id === selectedOpening.wallId ? { ...w, openings: w.openings.filter(o => o.id !== selectedOpening.opening.id) } : w) });
    }
    setSelectedOpening(null);
  };

  const addDoorToInternalWall = () => {
    if (!wallActionChoice) return;
    const doorWidth = 800;
    const margin = EDGE_MARGIN_INTERNAL;
    
    if (wallActionChoice.length < (doorWidth + margin * 2)) {
      alert("El tabique es demasiado corto para una puerta estándar.");
      return;
    }

    const newDoor: SteelOpening = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'door',
      width: doorWidth,
      height: 2000,
      position: Math.max(margin, (wallActionChoice.length - doorWidth) / 2),
      sillHeight: 0
    };

    setConfig(prev => ({
      ...prev,
      internalWalls: prev.internalWalls.map(iw => iw.id === wallActionChoice.id ? {
        ...iw,
        openings: [...(iw.openings || []), newDoor]
      } : iw)
    }));
    setWallActionChoice(null);
  };

  const createOpening = () => {
    if (!addingOpening) return;
    const wall = config.walls.find(w => w.id === addingOpening.wallId);
    if (!wall) return;

    const bounds = getWallSegments(wall.id, addingOpening.x, wall.length, false);
    const finalW = Math.min(newOpData.width, bounds.max - bounds.min);
    const finalP = Math.max(bounds.min, Math.min(addingOpening.x - finalW / 2, bounds.max - finalW));

    const newOp: SteelOpening = {
      id: Math.random().toString(36).substr(2, 9),
      type: newOpData.type,
      width: finalW,
      height: newOpData.height,
      position: finalP,
      sillHeight: newOpData.type === 'window' ? newOpData.sill : 0
    };

    const collision = wall.openings.some(op => {
      const start = op.position - 200;
      const end = op.position + op.width + 200;
      return (newOp.position < end && (newOp.position + newOp.width) > start);
    });

    if (collision) {
      alert("Espacio insuficiente entre vanos.");
      return;
    }

    setConfig({ ...config, walls: config.walls.map(w => w.id === wall.id ? { ...w, openings: [...w.openings, newOp] } : w) });
    setAddingOpening(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-100">
      <aside className={`hidden md:block w-80 h-full border-r bg-white shadow-xl overflow-y-auto shrink-0 z-40 transition-all ${isWalkModeActive ? '-ml-80' : ''}`}>
        <SteelControlPanel config={config} onConfigChange={setConfig} structuralAlerts={structuralAlerts} />
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden h-full min-h-0">
        <header className={`flex items-center justify-between px-4 md:px-6 py-2 bg-white border-b shadow-sm z-30 shrink-0 transition-transform ${isWalkModeActive ? '-translate-y-full' : ''}`}>
          <div className="flex items-center gap-2">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden"><Menu className="w-5 h-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                <SteelControlPanel config={config} onConfigChange={setConfig} structuralAlerts={structuralAlerts} />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-1.5">
              <Home className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-black uppercase text-slate-800 tracking-tighter">ARQUIMAX WALL ENGINE</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {structuralAlerts.length > 0 && (
              <div className="hidden lg:flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[10px] font-black text-amber-700 uppercase">{structuralAlerts.length} ADVERTENCIAS ESTRUCTURALES</span>
              </div>
            )}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-8">
              <TabsList className="bg-slate-100 h-8 p-1 rounded-lg">
                <TabsTrigger value="3d" className="text-[10px] font-bold uppercase h-6 px-3"><Box className="w-3 h-3 mr-1.5" /> Estructura 3D</TabsTrigger>
                <TabsTrigger value="materials" className="text-[10px] font-bold uppercase h-6 px-3"><ClipboardList className="w-3 h-3 mr-1.5" /> Listado Materiales</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="default" size="sm" className="h-8 px-4 text-[10px] font-black uppercase bg-blue-600 hover:bg-blue-700 text-white" onClick={() => viewerRef.current?.enterWalkMode()}><Compass className="w-3.5 h-3.5 mr-2" /> Inspección 3P</Button>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden">
          <Tabs value={activeTab} className="w-full h-full">
            <TabsContent value="3d" className="w-full h-full m-0 p-0 relative">
              <SteelViewer 
                ref={viewerRef}
                config={config} 
                onOpeningDoubleClick={handleOpeningDoubleClick}
                onInternalWallDoubleClick={handleInternalWallDoubleClick}
                onWallDoubleClick={handleWallDoubleClick}
                onWalkModeLock={(locked) => setIsWalkModeActive(locked)}
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

        <Dialog open={!!selectedOpening} onOpenChange={(open) => !open && setSelectedOpening(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 uppercase tracking-tighter font-black text-blue-600">
                <Settings2 className="w-5 h-5" /> Editar Vano {selectedOpening?.isInternal ? '(Interno)' : ''}
              </DialogTitle>
              <DialogDescription className="text-[10px] uppercase font-bold text-slate-400">
                La posición se calcula desde el extremo inicial del muro (Referencia 0).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black uppercase text-slate-500">Ancho</Label>
                <Input type="number" value={localOpeningData?.width || ''} onChange={(e) => setLocalOpeningData(prev => prev ? { ...prev, width: e.target.value } : null)} onKeyDown={(e) => e.key === 'Enter' && commitOpeningChange()} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black uppercase text-slate-500">Posición</Label>
                <Input type="number" value={localOpeningData?.position || ''} onChange={(e) => setLocalOpeningData(prev => prev ? { ...prev, position: e.target.value } : null)} onKeyDown={(e) => e.key === 'Enter' && commitOpeningChange()} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="destructive" onClick={handleDeleteOpening} className="font-bold uppercase text-[10px]"><Trash2 className="w-4 h-4 mr-2" /> Eliminar</Button>
              <Button onClick={commitOpeningChange} className="bg-blue-600 font-black uppercase text-[10px]">Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        <Dialog open={!!editingInternalWall} onOpenChange={(open) => !open && setEditingInternalWall(null)}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader><DialogTitle className="flex items-center gap-2 uppercase tracking-tighter font-black text-purple-600"><Columns className="w-5 h-5" /> Tabique Drywall</DialogTitle></DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black uppercase text-slate-500">Inicio (mm)</Label>
                <Input type="number" value={localIWData?.xPosition || ''} onChange={(e) => setLocalIWData(prev => prev ? { ...prev, xPosition: e.target.value } : null)} onKeyDown={(e) => e.key === 'Enter' && commitInternalWallChanges()} className="col-span-3 h-9 font-bold" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black uppercase text-slate-500">Largo (mm)</Label>
                <Input type="number" value={localIWData?.length || ''} onChange={(e) => setLocalIWData(prev => prev ? { ...prev, length: e.target.value } : null)} onKeyDown={(e) => e.key === 'Enter' && commitInternalWallChanges()} className="col-span-3 h-9 font-bold" />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="destructive" onClick={deleteInternalWall} className="font-bold uppercase text-[10px] h-10"><Trash2 className="w-4 h-4 mr-2" /> Eliminar</Button>
              <Button onClick={commitInternalWallChanges} className="bg-purple-600 font-black uppercase text-[10px] flex-1 h-10">Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!wallActionChoice} onOpenChange={(open) => !open && setWallActionChoice(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="uppercase font-black text-slate-800 tracking-tighter">Opciones de Tabique</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-6">
              <Button 
                variant="outline" 
                className="flex flex-col h-32 gap-3 border-2 hover:border-purple-500 hover:bg-purple-50 transition-all group"
                onClick={() => {
                  setEditingInternalWall(wallActionChoice);
                  setLocalIWData({ length: wallActionChoice!.length.toString(), xPosition: Math.round(wallActionChoice!.xPosition).toString() });
                  setWallActionChoice(null);
                }}
              >
                <Settings className="w-8 h-8 text-slate-400 group-hover:text-purple-600" />
                <span className="font-black uppercase text-[10px]">Editar Estructura</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col h-32 gap-3 border-2 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                onClick={addDoorToInternalWall}
              >
                <DoorOpen className="w-8 h-8 text-slate-400 group-hover:text-blue-600" />
                <span className="font-black uppercase text-[10px]">Sumar Puerta</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
