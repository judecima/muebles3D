'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SteelHouseConfig, SteelWall, SteelOpening, OpeningType, LayerVisibility } from '@/lib/steel/types';
import { 
  Plus, 
  Trash2, 
  Home, 
  Layout,
  DoorOpen,
  Box,
  Layers,
  Maximize2,
  Mountain,
  Ruler,
  Maximize,
  ChevronDown,
  Camera
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';

interface SteelControlPanelProps {
  config: SteelHouseConfig;
  onConfigChange: (config: SteelHouseConfig) => void;
}

export function SteelControlPanel({ config, onConfigChange }: SteelControlPanelProps) {
  
  const addWall = () => {
    const newWall: SteelWall = {
      id: Math.random().toString(36).substr(2, 9),
      length: 4000,
      height: config.globalWallHeight,
      thickness: 100,
      x: 0,
      z: 0,
      rotation: 0,
      openings: [],
      studSpacing: 400
    };
    onConfigChange({ ...config, walls: [...config.walls, newWall] });
  };

  const removeWall = (id: string) => {
    onConfigChange({ ...config, walls: config.walls.filter(w => w.id !== id) });
  };

  const updateWall = (id: string, field: keyof SteelWall, value: any) => {
    const newWalls = config.walls.map(w => w.id === id ? { ...w, [field]: value } : w);
    onConfigChange({ ...config, walls: newWalls });
  };

  const toggleLayer = (layer: keyof LayerVisibility) => {
    onConfigChange({
      ...config,
      layers: { ...config.layers, [layer]: !config.layers[layer] }
    });
  };

  const addOpening = (wallId: string, type: OpeningType) => {
    const wall = config.walls.find(w => w.id === wallId);
    if (!wall) return;

    const newOpening: SteelOpening = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      width: type === 'door' ? 900 : 1200,
      height: type === 'door' ? 2050 : 1100,
      position: 500,
      sillHeight: type === 'window' ? 900 : 0
    };

    updateWall(wallId, 'openings', [...wall.openings, newOpening]);
  };

  const removeOpening = (wallId: string, opId: string) => {
    const wall = config.walls.find(w => w.id === wallId);
    if (!wall) return;
    updateWall(wallId, 'openings', wall.openings.filter(op => op.id !== opId));
  };

  const updateRoof = (field: string, value: any) => {
    onConfigChange({
      ...config,
      roof: { ...config.roof, [field]: value }
    });
  };

  return (
    <Card className="h-full border-none shadow-none rounded-none bg-white overflow-y-auto">
      <CardHeader className="bg-slate-900 text-white py-4 sticky top-0 z-10 shadow-sm">
        <CardTitle className="text-lg font-bold flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-blue-400" /> 
            <span>Steel Framing v2.9</span>
          </div>
          <span className="text-[10px] opacity-70 font-normal uppercase tracking-widest">Ingeniería Estructural</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0 pb-20">
        <Accordion type="multiple" defaultValue={['global', 'layers', 'roof']} className="w-full">
          
          {/* SECCIÓN: DIMENSIONES GLOBALES */}
          <AccordionItem value="global" className="border-b px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-black uppercase tracking-tighter">Dimensiones Base</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-blue-600">Ancho (X)</Label>
                  <Input 
                    type="number" 
                    value={config.width} 
                    onChange={(e) => onConfigChange({ ...config, width: parseInt(e.target.value) || 0 })}
                    className="h-8 text-xs font-bold border-blue-200 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-blue-600">Largo (Z)</Label>
                  <Input 
                    type="number" 
                    value={config.length} 
                    onChange={(e) => onConfigChange({ ...config, length: parseInt(e.target.value) || 0 })}
                    className="h-8 text-xs font-bold border-blue-200 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Altura Muros (mm)</Label>
                <Input 
                  type="number" 
                  value={config.globalWallHeight} 
                  onChange={(e) => onConfigChange({ ...config, globalWallHeight: parseInt(e.target.value) || 0 })}
                  className="h-9 border-slate-200"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* SECCIÓN: TECHO ESTRUCTURAL */}
          <AccordionItem value="roof" className="border-b px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Mountain className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-black uppercase tracking-tighter">Sistema de Techo</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="space-y-3 p-3 bg-amber-50/30 rounded-xl border border-amber-100/50">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-amber-700">Tipo de Cubierta</Label>
                  <Select value={config.roof.type} onValueChange={(v) => updateRoof('type', v)}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin Techo</SelectItem>
                      <SelectItem value="one-side">Una Agua (Shed)</SelectItem>
                      <SelectItem value="two-sides">Dos Aguas (Gable)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-amber-700">Diseño de Cercha</Label>
                  <Select value={config.roof.trussType} onValueChange={(v) => updateRoof('trussType', v)}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kingPost">King Post (Simple)</SelectItem>
                      <SelectItem value="fink">Fink (Reforzada)</SelectItem>
                      <SelectItem value="mono">Mono (Un Agua)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-amber-700">Pendiente (°)</Label>
                    <Input 
                      type="number" 
                      value={config.roof.pitch} 
                      onChange={(e) => updateRoof('pitch', parseInt(e.target.value) || 0)}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-amber-700">Voladizo (mm)</Label>
                    <Input 
                      type="number" 
                      value={config.roof.overhang} 
                      onChange={(e) => updateRoof('overhang', parseInt(e.target.value) || 0)}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* SECCIÓN: CAPAS Y VISIBILIDAD */}
          <AccordionItem value="layers" className="border-b px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-tighter">Capas Visuales</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <div className="flex items-center justify-between p-2 bg-slate-900 text-white rounded-lg mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest">Estructura Pura</span>
                <Switch 
                  checked={config.structuralMode} 
                  onCheckedChange={(val) => onConfigChange({ ...config, structuralMode: val })} 
                />
              </div>
              <div className="grid grid-cols-1 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="space-y-2">
                  {[
                    { id: 'ext-pan', label: 'OSB Exterior', key: 'exteriorPanels' },
                    { id: 'int-pan', label: 'Yeso Interior', key: 'interiorPanels' },
                    { id: 'profiles', label: 'Perfilería Acero', key: 'steelProfiles' },
                    { id: 'bracing', label: 'Cruces San Andrés', key: 'crossBracing', color: 'text-red-500' },
                    { id: 'blocking', label: 'Blocking Horiz.', key: 'horizontalBlocking', color: 'text-amber-600' },
                    { id: 'lintels', label: 'Dinteles/Vanos', key: 'lintels', color: 'text-blue-500' }
                  ].map(layer => (
                    <div key={layer.id} className="flex items-center gap-2">
                      <Checkbox id={layer.id} checked={config.layers[layer.key as keyof LayerVisibility]} onCheckedChange={() => toggleLayer(layer.key as keyof LayerVisibility)} />
                      <Label htmlFor={layer.id} className={`text-[10px] font-bold uppercase cursor-pointer ${layer.color || ''}`}>{layer.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* SECCIÓN: MUROS */}
          <AccordionItem value="walls" className="border-b px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-black uppercase tracking-tighter">Plano de Muros</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <Button size="sm" variant="outline" className="w-full mb-4 h-8 text-[10px] gap-1 font-black" onClick={addWall}>
                <Plus className="w-3 h-3" /> AÑADIR MURO NUEVO
              </Button>

              <div className="space-y-3">
                {config.walls.map((wall, idx) => (
                  <div key={wall.id} className="border rounded-xl p-3 bg-slate-50/50 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center text-[9px] font-black text-slate-600">
                          {idx + 1}
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-700">Muro Individual</span>
                      </div>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeWall(wall.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase text-slate-400">Largo (mm)</Label>
                        <Input type="number" value={Math.round(wall.length)} onChange={(e) => updateWall(wall.id, 'length', parseInt(e.target.value) || 0)} className="h-7 text-[10px] font-bold" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase text-slate-400">Montantes</Label>
                        <Select value={wall.studSpacing.toString()} onValueChange={(val) => updateWall(wall.id, 'studSpacing', parseInt(val))}>
                          <SelectTrigger className="h-7 text-[9px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="400">400mm</SelectItem>
                            <SelectItem value="600">600mm</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-slate-500">Vanos y Aberturas</span>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-blue-100" onClick={() => addOpening(wall.id, 'door')}>
                            <DoorOpen className="w-3.5 h-3.5 text-blue-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-green-100" onClick={() => addOpening(wall.id, 'window')}>
                            <Layout className="w-3.5 h-3.5 text-green-600" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {wall.openings.map(op => (
                          <div key={op.id} className="p-2 bg-white rounded-lg border border-slate-200 relative group/op">
                            <div className="flex items-center gap-2 mb-1.5">
                              {op.type === 'door' ? <DoorOpen className="w-3 h-3 text-blue-500" /> : <Layout className="w-3 h-3 text-green-500" />}
                              <span className="text-[9px] font-black uppercase text-slate-600">{op.type === 'door' ? 'Puerta' : 'Ventana'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[7px] font-black uppercase text-slate-400">Ancho</Label>
                                <Input type="number" value={op.width} onChange={(e) => {
                                  const newOps = wall.openings.map(o => o.id === op.id ? { ...o, width: parseInt(e.target.value) || 0 } : o);
                                  updateWall(wall.id, 'openings', newOps);
                                }} className="h-6 text-[9px] font-bold" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[7px] font-black uppercase text-slate-400">Alto</Label>
                                <Input type="number" value={op.height} onChange={(e) => {
                                  const newOps = wall.openings.map(o => o.id === op.id ? { ...o, height: parseInt(e.target.value) || 0 } : o);
                                  updateWall(wall.id, 'openings', newOps);
                                }} className="h-6 text-[9px] font-bold" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[7px] font-black uppercase text-slate-400">Posición</Label>
                                <Input type="number" value={op.position} onChange={(e) => {
                                  const newOps = wall.openings.map(o => o.id === op.id ? { ...o, position: parseInt(e.target.value) || 0 } : o);
                                  updateWall(wall.id, 'openings', newOps);
                                }} className="h-6 text-[9px] font-bold" />
                              </div>
                              {op.type === 'window' && (
                                <div className="space-y-1">
                                  <Label className="text-[7px] font-black uppercase text-slate-400">Antepecho</Label>
                                  <Input type="number" value={op.sillHeight} onChange={(e) => {
                                    const newOps = wall.openings.map(o => o.id === op.id ? { ...o, sillHeight: parseInt(e.target.value) || 0 } : o);
                                    updateWall(wall.id, 'openings', newOps);
                                  }} className="h-6 text-[9px] font-bold" />
                                </div>
                              )}
                            </div>
                            <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover/op:opacity-100 text-red-400" onClick={() => removeOpening(wall.id, op.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* ACCIONES RÁPIDAS PIE DE PANEL */}
        <div className="p-4 bg-slate-50 border-t sticky bottom-0 z-20 space-y-2">
          <Button variant="outline" className="w-full h-9 text-[10px] font-black uppercase tracking-widest gap-2 bg-white" onClick={() => onConfigChange({ ...config })}>
            <Camera className="w-3.5 h-3.5 text-blue-600" /> Recentrar Cámara
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
