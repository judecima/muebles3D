'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SteelHouseConfig, SteelWall, LayerVisibility } from '@/lib/steel/types';
import { 
  Plus, 
  Trash2, 
  Home, 
  Layout,
  Layers,
  Maximize2,
  Camera
} from 'lucide-react';
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

  return (
    <Card className="h-full border-none shadow-none rounded-none bg-white overflow-y-auto">
      <CardHeader className="bg-slate-900 text-white py-4 sticky top-0 z-10 shadow-sm">
        <CardTitle className="text-lg font-bold flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-blue-400" /> 
            <span>ArquiMax Structural v8.5</span>
          </div>
          <span className="text-[10px] opacity-70 font-normal uppercase tracking-widest">Motor de Cargas e Interiores</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0 pb-20">
        <Accordion type="multiple" defaultValue={['global', 'layers', 'walls']} className="w-full">
          
          <AccordionItem value="global" className="border-b px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-black uppercase tracking-tighter">Parámetros de Diseño</span>
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
                    className="h-8 text-xs font-bold border-blue-200 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-blue-600">Largo (Z)</Label>
                  <Input 
                    type="number" 
                    value={config.length} 
                    onChange={(e) => onConfigChange({ ...config, length: parseInt(e.target.value) || 0 })}
                    className="h-8 text-xs font-bold border-blue-200 bg-white"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="layers" className="border-b px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-tighter">Capas de Ingeniería</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <div className="flex items-center justify-between p-2 bg-slate-900 text-white rounded-lg mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest">Ver Estructura Pura</span>
                <Switch 
                  checked={config.structuralMode} 
                  onCheckedChange={(val) => onConfigChange({ ...config, structuralMode: val })} 
                />
              </div>
              <div className="grid grid-cols-1 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                {[
                  { id: 'ext-pan', label: 'Placas Exteriores (OSB)', key: 'exteriorPanels' },
                  { id: 'int-pan', label: 'Placas Interiores (Yeso)', key: 'interiorPanels' },
                  { id: 'profiles', label: 'Perfilería PGC/PGU', key: 'steelProfiles' },
                  { id: 'blocking', label: 'Blocking Estructural', key: 'horizontalBlocking', color: 'text-green-600' },
                  { id: 'bracing', label: 'Cruces de San Andrés', key: 'bracing', color: 'text-amber-600' },
                  { id: 'junctions', label: 'Uniones y Refuerzos', key: 'reinforcements', color: 'text-blue-600' }
                ].map(layer => (
                  <div key={layer.id} className="flex items-center gap-2">
                    <Checkbox id={layer.id} checked={config.layers[layer.key as keyof LayerVisibility]} onCheckedChange={() => toggleLayer(layer.key as keyof LayerVisibility)} />
                    <Label htmlFor={layer.id} className={`text-[10px] font-bold uppercase cursor-pointer ${layer.color || ''}`}>{layer.label}</Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="walls" className="border-b px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-black uppercase tracking-tighter">Muros Perimetrales</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-3">
                {config.walls.map((wall, idx) => (
                  <div key={wall.id} className="border rounded-xl p-3 bg-slate-50/50 space-y-3 group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-700">Muro Perímetro #{idx + 1}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[8px] font-bold uppercase text-slate-400">Largo</Label>
                        <Input type="number" value={Math.round(wall.length)} onChange={(e) => updateWall(wall.id, 'length', parseInt(e.target.value) || 0)} className="h-7 text-[10px] font-bold" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[8px] font-bold uppercase text-slate-400">Modulación</Label>
                        <Select value={wall.studSpacing.toString()} onValueChange={(val) => updateWall(wall.id, 'studSpacing', parseInt(val))}>
                          <SelectTrigger className="h-7 text-[9px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="400">400mm</SelectItem>
                            <SelectItem value="600">600mm</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="p-4 bg-slate-50 border-t sticky bottom-0 z-20">
          <Button variant="outline" className="w-full h-9 text-[10px] font-black uppercase tracking-widest gap-2 bg-white" onClick={() => onConfigChange({ ...config })}>
            <Camera className="w-3.5 h-3.5 text-blue-600" /> Recentrar Cámara
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
