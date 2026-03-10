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
  Maximize2
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

  return (
    <Card className="h-full border-none shadow-none rounded-none bg-white overflow-y-auto">
      <CardHeader className="bg-slate-900 text-white py-4 sticky top-0 z-10 shadow-sm">
        <CardTitle className="text-lg font-bold flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-blue-400" /> 
            <span>Steel Framing v2.8</span>
          </div>
          <span className="text-[10px] opacity-70 font-normal">INGENIERÍA ESTRUCTURAL</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6 px-4 pb-20">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Maximize2 className="w-4 h-4 text-blue-500" />
            <Label className="text-xs font-bold uppercase text-slate-500">Dimensiones Globales (mm)</Label>
          </div>
          <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase text-blue-600">Ancho (X)</Label>
              <Input 
                type="number" 
                value={config.width} 
                onChange={(e) => onConfigChange({ ...config, width: parseInt(e.target.value) || 0 })}
                className="h-8 text-xs font-bold border-blue-200 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase text-blue-600">Largo (Z)</Label>
              <Input 
                type="number" 
                value={config.length} 
                onChange={(e) => onConfigChange({ ...config, length: parseInt(e.target.value) || 0 })}
                className="h-8 text-xs font-bold border-blue-200 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-primary" />
            <Label className="text-xs font-bold uppercase text-slate-500">Capas de Visualización</Label>
          </div>
          
          <div className="grid grid-cols-1 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-600">Modo Estructural</span>
              <Switch 
                checked={config.structuralMode} 
                onCheckedChange={(val) => onConfigChange({ ...config, structuralMode: val })} 
              />
            </div>
            <Separator className="my-1" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="ext-pan" checked={config.layers.exteriorPanels} onCheckedChange={() => toggleLayer('exteriorPanels')} />
                <Label htmlFor="ext-pan" className="text-[10px] font-bold uppercase cursor-pointer">Paneles Exteriores</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="profiles" checked={config.layers.steelProfiles} onCheckedChange={() => toggleLayer('steelProfiles')} />
                <Label htmlFor="profiles" className="text-[10px] font-bold uppercase cursor-pointer">Perfilería (PGC/PGU)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="bracing" checked={config.layers.crossBracing} onCheckedChange={() => toggleLayer('crossBracing')} />
                <Label htmlFor="bracing" className="text-[10px] font-bold uppercase cursor-pointer text-red-500">Cruces San Andrés</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="blocking" checked={config.layers.horizontalBlocking} onCheckedChange={() => toggleLayer('horizontalBlocking')} />
                <Label htmlFor="blocking" className="text-[10px] font-bold uppercase cursor-pointer text-amber-600">Rigidizadores / Blocking</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="lintels" checked={config.layers.lintels} onCheckedChange={() => toggleLayer('lintels')} />
                <Label htmlFor="lintels" className="text-[10px] font-bold uppercase cursor-pointer text-blue-500">Dinteles y Refuerzos</Label>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-500">Altura Global Muros (mm)</Label>
          <Input 
            type="number" 
            value={config.globalWallHeight} 
            onChange={(e) => onConfigChange({ ...config, globalWallHeight: parseInt(e.target.value) || 0 })}
            className="h-10 border-slate-200"
          />
        </div>

        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-bold uppercase text-slate-500">Muros del Proyecto</Label>
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={addWall}>
            <Plus className="w-3 h-3" /> AÑADIR MURO
          </Button>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {config.walls.map((wall, idx) => (
            <AccordionItem key={wall.id} value={wall.id} className="border rounded-lg mb-2 overflow-hidden bg-slate-50/50">
              <AccordionTrigger className="px-4 hover:no-underline py-3">
                <div className="flex items-center gap-2 text-left">
                  <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                    {idx + 1}
                  </div>
                  <span className="text-xs font-bold text-slate-700">Muro {Math.round(wall.length)}mm</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Longitud (mm)</Label>
                    <Input type="number" value={Math.round(wall.length)} onChange={(e) => updateWall(wall.id, 'length', parseInt(e.target.value))} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Espaciado Mont.</Label>
                    <Select value={wall.studSpacing.toString()} onValueChange={(val) => updateWall(wall.id, 'studSpacing', parseInt(val))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="400">400 mm</SelectItem>
                        <SelectItem value="600">600 mm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Posición X</Label>
                    <Input type="number" value={Math.round(wall.x)} onChange={(e) => updateWall(wall.id, 'x', parseInt(e.target.value))} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Posición Z</Label>
                    <Input type="number" value={Math.round(wall.z)} onChange={(e) => updateWall(wall.id, 'z', parseInt(e.target.value))} className="h-8 text-xs" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-400">Rotación (°)</Label>
                  <Input type="number" value={wall.rotation} onChange={(e) => updateWall(wall.id, 'rotation', parseInt(e.target.value))} className="h-8 text-xs" />
                </div>

                <div className="pt-2 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Aberturas</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" title="Añadir Puerta" onClick={() => addOpening(wall.id, 'door')}>
                        <DoorOpen className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" title="Añadir Ventana" onClick={() => addOpening(wall.id, 'window')}>
                        <Layout className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {wall.openings.map(op => (
                    <div key={op.id} className="p-2 bg-white rounded border border-slate-200 relative group">
                      <div className="flex items-center gap-2 mb-2">
                        {op.type === 'door' ? <DoorOpen className="w-3 h-3 text-blue-500" /> : <Layout className="w-3 h-3 text-green-500" />}
                        <span className="text-[10px] font-bold uppercase">{op.type === 'door' ? 'Puerta' : 'Ventana'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[8px] font-bold uppercase text-slate-400">Ancho</Label>
                          <Input 
                            type="number" 
                            value={op.width} 
                            onChange={(e) => {
                              const newOps = wall.openings.map(o => o.id === op.id ? { ...o, width: parseInt(e.target.value) } : o);
                              updateWall(wall.id, 'openings', newOps);
                            }}
                            className="h-7 text-[10px]"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[8px] font-bold uppercase text-slate-400">Pos. Izq</Label>
                          <Input 
                            type="number" 
                            value={op.position} 
                            onChange={(e) => {
                              const newOps = wall.openings.map(o => o.id === op.id ? { ...o, position: parseInt(e.target.value) } : o);
                              updateWall(wall.id, 'openings', newOps);
                            }}
                            className="h-7 text-[10px]"
                          />
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"
                        onClick={() => removeOpening(wall.id, op.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button variant="ghost" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 text-[10px] font-bold h-8" onClick={() => removeWall(wall.id)}>
                  <Trash2 className="w-3 h-3 mr-2" /> ELIMINAR MURO
                </Button>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {config.walls.length === 0 && (
          <div className="py-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 text-center px-4">
            <Box className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-[10px] font-bold uppercase tracking-widest">No hay muros definidos</p>
            <Button variant="link" size="sm" onClick={addWall} className="text-[10px] font-bold">Comenzar trazado</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
