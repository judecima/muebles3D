
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
  Check
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StructuralEngine } from '@/utils/steel/structuralEngine';

const EDGE_MARGIN_EXTERIOR = 400; 
const EDGE_MARGIN_INTERNAL = 50; 
const INTERSECTION_MARGIN = 100; 
const DEFAULT_SILL = 900; 
const EXTERIOR_WALL_THICKNESS = 100;
const INTERNAL_WALL_THICKNESS = 70;

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
  const [structuralAlerts, setStructuralAlerts] = useState<any[]>([]);
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

      let maxLen = (parent.id === 'w1' || parent.id === 'w3') ? config.length - EXTERIOR_WALL_THICKNESS : config.width - EXTERIOR_WALL_THICKNESS;
      const adjustedLength = Math.min(iw.length, maxLen);
      const adjustedX = Math.max(50, Math.min(iw.xPosition, parent.length - 50));

      const adjustedOpenings = (iw.openings || []).map(op => {
        const bounds = getWallSegments(iw.id, op.position + op.width/2, adjustedLength, true);
        const finalW = Math.min(op.width, bounds.max - bounds.min);
        const finalP = Math.max(bounds.min, Math.min(op.position, bounds.max - finalW));
        return { ...op, width: finalW, position: finalP };
      });

      return { ...iw, length: adjustedLength, xPosition: adjustedX, openings: adjustedOpenings };
    });
    
    setConfig(prev => ({ ...prev, walls: newWalls, internalWalls: newInternalWalls }));
    setStructuralAlerts(StructuralEngine.validateStructure(config));
  }, [config.width, config.length]);

  const getWallSegments = useCallback((wallId: string, clickX: number, totalLength: number, isInternalWall: boolean) => {
    const baseMargin = isInternalWall ? EDGE_MARGIN_INTERNAL : EDGE_MARGIN_EXTERIOR;
    const boundaries = [0];
    
    config.internalWalls.forEach(iw => {
      if (iw.parentWallId === wallId) boundaries.push(iw.xPosition);
    });

    config.internalWalls.forEach(iw => {
      const parent = config.walls.find(w => w.id === iw.parentWallId);
      if (!parent) return;
      const isOpposite = (parent.id === 'w1' && wallId === 'w3') || (parent.id === 'w3' && wallId === 'w1') || (parent.id === 'w2' && wallId === 'w4') || (parent.id === 'w4' && wallId === 'w2');
      if (isOpposite && Math.abs(iw.length - (wallId === 'w1' || wallId === 'w3' ? config.length - EXTERIOR_WALL_THICKNESS : config.width - EXTERIOR_WALL_THICKNESS)) < 10) {
        boundaries.push(iw.xPosition);
      }
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
  }, [config.internalWalls, config.width, config.length, config.walls]);

  const handleOpeningDoubleClick = useCallback((wallId: string, opening: SteelOpening, isInternal?: boolean) => {
    const wall = isInternal 
      ? config.internalWalls.find(iw => iw.id === wallId)
      : config.walls.find(w => w.id === wallId);
    
    if (!wall) return;
    const bounds = getWallSegments(wallId, opening.position + opening.width / 2, wall.length, !!isInternal);
    setSelectedOpening({ wallId, opening, isInternal });
    setLocalOpeningData({
      width: opening.width.toString(),
      position: Math.round(opening.position - bounds.start).toString()
    });
  }, [config.walls, config.internalWalls, getWallSegments]);

  const commitOpeningChange = () => {
    if (!selectedOpening || !localOpeningData) return;
    const inputW = parseInt(localOpeningData.width) || 0;
    const inputRelP = parseInt(localOpeningData.position) || 0;
    const wall = selectedOpening.isInternal 
      ? config.internalWalls.find(iw => iw.id === selectedOpening.wallId)
      : config.walls.find(w => w.id === selectedOpening.wallId);
    if (!wall) return;
    const bounds = getWallSegments(wall.id, selectedOpening.opening.position + selectedOpening.opening.width / 2, wall.length, !!selectedOpening.isInternal);
    const absPos = bounds.start + inputRelP;
    const finalW = Math.min(inputW, bounds.max - bounds.min);
    const finalP = Math.max(bounds.min, Math.min(absPos, bounds.max - finalW));

    if (selectedOpening.isInternal) {
      setConfig(prev => ({ ...prev, internalWalls: prev.internalWalls.map(iw => iw.id === selectedOpening.wallId ? { ...iw, openings: iw.openings.map(o => o.id === selectedOpening.opening.id ? { ...o, width: finalW, position: finalP } : o) } : iw) }));
    } else {
      setConfig(prev => ({ ...prev, walls: prev.walls.map(w => w.id === selectedOpening.wallId ? { ...w, openings: w.openings.map(o => o.id === selectedOpening.opening.id ? { ...o, width: finalW, position: finalP } : w) } : w) }));
    }
    setSelectedOpening(null);
  };

  const deleteOpening = () => {
    if (!selectedOpening) return;
    if (selectedOpening.isInternal) {
      setConfig(prev => ({ ...prev, internalWalls: prev.internalWalls.map(iw => iw.id === selectedOpening.wallId ? { ...iw, openings: iw.openings.filter(o => o.id !== selectedOpening.opening.id) } : iw) }));
    } else {
      setConfig(prev => ({ ...prev, walls: prev.walls.map(w => w.id === selectedOpening.wallId ? { ...w, openings: w.openings.filter(o => o.id !== selectedOpening.opening.id) } : w) }));
    }
    setSelectedOpening(null);
  };

  const handleInternalWallDoubleClick = useCallback((iw: InternalWall, x: number) => {
    setWallActionChoice({ ...iw, lastClickX: x });
  }, []);

  const handleWallDoubleClick = useCallback((wallId: string, x: number, side: 'exterior' | 'interior') => {
    if (side === 'exterior') {
      setAddingOpening({ wallId, x, isInternal: false });
      setNewOpeningData({ type: 'window', width: 1200, height: 1100, sill: DEFAULT_SILL });
    } else {
      const parent = config.walls.find(w => w.id === wallId);
      if (!parent) return;
      const isOverOp = parent.openings.some(op => x >= (op.position - 50) && x <= (op.position + op.width + 50));
      if (isOverOp) return;
      const targetRot = (parent.rotation - 90 + 360) % 360;
      let maxLen = (parent.id === 'w1' || parent.id === 'w3') ? config.length - EXTERIOR_WALL_THICKNESS : config.width - EXTERIOR_WALL_THICKNESS;
      const newIW: InternalWall = { id: Math.random().toString(36).substr(2, 9), parentWallId: wallId, xPosition: Math.round(x), length: Math.min(2000, maxLen), height: config.globalWallHeight, rotation: targetRot, x: 0, z: 0, openings: [] };
      setConfig(prev => ({ ...prev, internalWalls: [...prev.internalWalls, newIW] }));
      setEditingInternalWall(newIW);
      setLocalIWData({ length: newIW.length.toString(), xPosition: Math.round(x).toString() });
    }
  }, [config.walls, config.globalWallHeight, config.width, config.length]);

  const commitInternalWallChange = () => {
    if (!editingInternalWall || !localIWData) return;
    const newLen = parseInt(localIWData.length) || 500;
    const newX = parseInt(localIWData.xPosition) || 0;
    
    setConfig(prev => ({
      ...prev,
      internalWalls: prev.internalWalls.map(iw => 
        iw.id === editingInternalWall.id 
          ? { ...iw, length: newLen, xPosition: newX } 
          : iw
      )
    }));
    setEditingInternalWall(null);
  };

  const deleteInternalWall = () => {
    if (!editingInternalWall) return;
    setConfig(prev => ({
      ...prev,
      internalWalls: prev.internalWalls.filter(iw => iw.id !== editingInternalWall.id)
    }));
    setEditingInternalWall(null);
  };

  const extendToNextWall = () => {
    if (!editingInternalWall) return;
    const parent = config.walls.find(w => w.id === editingInternalWall.parentWallId);
    if (!parent) return;

    const parentRad = (parent.rotation * Math.PI) / 180;
    const parentDir = { x: Math.cos(parentRad), z: -Math.sin(parentRad) };
    const perpDir = { x: Math.sin(parentRad), z: Math.cos(parentRad) };
    
    const p0 = {
      x: parent.x + parentDir.x * editingInternalWall.xPosition + perpDir.x * (EXTERIOR_WALL_THICKNESS / 2),
      z: parent.z + parentDir.z * editingInternalWall.xPosition + perpDir.z * (EXTERIOR_WALL_THICKNESS / 2)
    };
    
    const iwRad = (editingInternalWall.rotation * Math.PI) / 180;
    const iwDir = { x: Math.cos(iwRad), z: -Math.sin(iwRad) };

    const getIntersection = (rayP: {x:number, z:number}, rayD: {x:number, z:number}, segA: {x:number, z:number}, segB: {x:number, z:number}) => {
      const x1 = rayP.x, z1 = rayP.z;
      const x2 = rayP.x + rayD.x, z2 = rayP.z + rayD.z;
      const x3 = segA.x, z3 = segA.z;
      const x4 = segB.x, z4 = segB.z;
      const den = (x1 - x2) * (z3 - z4) - (z1 - z2) * (x3 - x4);
      if (Math.abs(den) < 0.01) return null;
      const t = ((x1 - x3) * (z3 - z4) - (z1 - z3) * (x3 - x4)) / den;
      const u = -((x1 - x2) * (z1 - z3) - (z1 - z2) * (x1 - x3)) / den;
      if (t > 10 && u >= 0 && u <= 1) return t;
      return null;
    };

    const distances: number[] = [];

    // Escanear contra muros exteriores
    config.walls.forEach(w => {
      const wRad = (w.rotation * Math.PI) / 180;
      const wD = { x: Math.cos(wRad), z: -Math.sin(wRad) };
      const A = { x: w.x, z: w.z };
      const B = { x: w.x + wD.x * w.length, z: w.z + wD.z * w.length };
      const dist = getIntersection(p0, iwDir, A, B);
      if (dist !== null) distances.push(dist);
    });

    // Escanear contra otros tabiques internos
    config.internalWalls.forEach(other => {
      if (other.id === editingInternalWall.id) return;
      const op = config.walls.find(pw => pw.id === other.parentWallId);
      if (!op) return;
      const oPRad = (op.rotation * Math.PI) / 180;
      const oPDir = { x: Math.cos(oPRad), z: -Math.sin(oPRad) };
      const oPPerp = { x: Math.sin(oPRad), z: Math.cos(oPRad) };
      const start = {
        x: op.x + oPDir.x * other.xPosition + oPPerp.x * (EXTERIOR_WALL_THICKNESS/2),
        z: op.z + oPDir.z * other.xPosition + oPPerp.z * (EXTERIOR_WALL_THICKNESS/2)
      };
      const oIRad = (other.rotation * Math.PI) / 180;
      const oIDir = { x: Math.cos(oIRad), z: -Math.sin(oIRad) };
      const end = { x: start.x + oIDir.x * other.length, z: start.z + oIDir.z * other.length };
      const dist = getIntersection(p0, iwDir, start, end);
      if (dist !== null) distances.push(dist);
    });

    // Lógica secuencial: buscar el siguiente punto más lejano que el actual
    const currentLen = parseInt(localIWData?.length || "0") || editingInternalWall.length;
    const furtherDistances = distances.filter(d => d > currentLen + 10).sort((a, b) => a - b);
    
    let targetLen: number;
    if (furtherDistances.length > 0) {
      targetLen = furtherDistances[0];
    } else {
      // Si ya llegamos al final, reiniciamos al primer encuentro para permitir rotación
      targetLen = Math.min(...distances);
    }

    setLocalIWData(prev => prev ? { ...prev, length: Math.round(targetLen).toString() } : null);
  };

  const createOpening = () => {
    if (!addingOpening) return;
    const wall = addingOpening.isInternal ? config.internalWalls.find(iw => iw.id === addingOpening.wallId) : config.walls.find(w => w.id === addingOpening.wallId);
    if (!wall) return;
    const bounds = getWallSegments(wall.id, addingOpening.x, wall.length, !!addingOpening.isInternal);
    const finalW = Math.min(newOpData.width, bounds.max - bounds.min);
    const finalP = Math.max(bounds.min, Math.min(addingOpening.x - finalW / 2, bounds.max - finalW));
    
    const finalH = newOpData.type === 'door' ? Math.max(newOpData.height, 2050) : newOpData.height;
    const finalSill = newOpData.type === 'window' ? newOpData.sill : 0;

    const newOp: SteelOpening = { 
      id: Math.random().toString(36).substr(2, 9), 
      type: newOpData.type, 
      width: finalW, 
      height: finalH, 
      position: finalP, 
      sillHeight: finalSill 
    };

    if (addingOpening.isInternal) {
      setConfig(prev => ({ ...prev, internalWalls: prev.internalWalls.map(iw => iw.id === wall.id ? { ...iw, openings: [...iw.openings, newOp] } : iw) }));
    } else {
      setConfig(prev => ({ ...prev, walls: prev.walls.map(w => w.id === wall.id ? { ...w, openings: [...w.openings, newOp] } : w) }));
    }
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
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black uppercase text-slate-500">Ancho</Label>
                <Input type="number" value={localOpeningData?.width || ''} onChange={(e) => setLocalOpeningData(prev => prev ? { ...prev, width: e.target.value } : null)} onKeyDown={(e) => e.key === 'Enter' && commitOpeningChange()} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black uppercase text-slate-500">Offset (mm)</Label>
                <Input type="number" value={localOpeningData?.position || ''} onChange={(e) => setLocalOpeningData(prev => prev ? { ...prev, position: e.target.value } : null)} onKeyDown={(e) => e.key === 'Enter' && commitOpeningChange()} className="col-span-3" />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="destructive" onClick={deleteOpening} className="flex-1 font-black uppercase text-[10px]"><Trash2 className="w-3 h-3 mr-2" /> Eliminar</Button>
              <Button onClick={commitOpeningChange} className="flex-1 bg-blue-600 font-black uppercase text-[10px]">Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!addingOpening} onOpenChange={(open) => !open && setAddingOpening(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle className="font-black text-green-600 uppercase">Nuevo Vano</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black">Tipo</Label>
                <Select 
                  value={newOpData.type} 
                  disabled={addingOpening?.isInternal}
                  onValueChange={(v: any) => {
                    const isDoor = v === 'door';
                    setNewOpeningData({ 
                      ...newOpData, 
                      type: v, 
                      height: isDoor ? 2050 : 1100, 
                      sill: isDoor ? 0 : DEFAULT_SILL 
                    });
                  }}
                >
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {!addingOpening?.isInternal && <SelectItem value="window">Ventana</SelectItem>}
                    <SelectItem value="door">Puerta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black">Ancho</Label>
                <Input type="number" value={newOpData.width} onChange={(e) => setNewOpeningData({ ...newOpData, width: parseInt(e.target.value) || 0 })} onKeyDown={(e) => e.key === 'Enter' && createOpening()} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black">Altura</Label>
                <Input type="number" value={newOpData.height} onChange={(e) => setNewOpeningData({ ...newOpData, height: parseInt(e.target.value) || 0 })} onKeyDown={(e) => e.key === 'Enter' && createOpening()} className="col-span-3" />
              </div>
            </div>
            <DialogFooter><Button onClick={createOpening} className="w-full bg-green-600 font-black uppercase text-xs h-11">Insertar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingInternalWall} onOpenChange={(open) => !open && setEditingInternalWall(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle className="uppercase font-black text-purple-600">Editar Tabique Interno</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black uppercase">Largo (mm)</Label>
                <div className="col-span-3 flex gap-2">
                  <Input type="number" value={localIWData?.length || ''} onChange={(e) => setLocalIWData(prev => prev ? { ...prev, length: e.target.value } : null)} onKeyDown={(e) => e.key === 'Enter' && commitInternalWallChange()} className="flex-1" />
                  <Button variant="outline" size="icon" onClick={extendToNextWall} title="Proyectar a próxima pared"><ArrowRightToLine className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-[10px] font-black uppercase">Posición (X)</Label>
                <Input type="number" value={localIWData?.xPosition || ''} onChange={(e) => setLocalIWData(prev => prev ? { ...prev, xPosition: e.target.value } : null)} onKeyDown={(e) => e.key === 'Enter' && commitInternalWallChange()} className="col-span-3" />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="destructive" onClick={deleteInternalWall} className="flex-1 font-black uppercase text-[10px]"><Trash2 className="w-3 h-3 mr-2" /> Eliminar</Button>
              <Button onClick={commitInternalWallChange} className="flex-1 bg-purple-600 font-black uppercase text-[10px]"><Check className="w-3 h-3 mr-2" /> Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!wallActionChoice} onOpenChange={(open) => !open && setWallActionChoice(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader><DialogTitle className="uppercase font-black text-slate-800 tracking-tighter">Opciones de Tabique</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-6">
              <Button variant="outline" className="flex flex-col h-32 gap-3 border-2 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                onClick={() => { 
                  setAddingOpening({ wallId: wallActionChoice!.id, x: wallActionChoice!.lastClickX || wallActionChoice!.length / 2, isInternal: true }); 
                  setNewOpeningData({ type: 'door', width: 900, height: 2050, sill: 0 }); 
                  setWallActionChoice(null); 
                }}>
                <DoorOpen className="w-8 h-8 text-slate-400 group-hover:text-blue-600" />
                <span className="font-black uppercase text-[10px]">Sumar Puerta</span>
              </Button>
              <Button variant="outline" className="flex flex-col h-32 gap-3 border-2 hover:border-purple-500 hover:bg-blue-50 transition-all group"
                onClick={() => { setEditingInternalWall(wallActionChoice); setLocalIWData({ length: wallActionChoice!.length.toString(), xPosition: Math.round(wallActionChoice!.xPosition).toString() }); setWallActionChoice(null); }}>
                <Settings className="w-8 h-8 text-slate-400 group-hover:text-purple-600" />
                <span className="font-black uppercase text-[10px]">Editar Estructura</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
