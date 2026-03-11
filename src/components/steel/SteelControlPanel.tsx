'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SteelHouseConfig, RoofType, LayerVisibility } from '@/lib/steel/types';
import { 
  Home, 
  Layers,
  Maximize2,
  Compass,
  ArrowUpCircle,
  Settings2
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

interface SteelControlPanelProps {
  config: SteelHouseConfig;
  onConfigChange: (config: SteelHouseConfig) => void;
  onResetCamera?: () => void;
}

export function SteelControlPanel({ config, onConfigChange, onResetCamera }: SteelControlPanelProps) {
  
  const toggleLayer = (layer: keyof LayerVisibility) => {
    onConfigChange({
      ...config,
      layers: { ...config.layers, [layer]: !config.layers[layer] }
    });
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
            <span>ArquiMax Steel v2.9</span>
          </div>
          <span className="text-[10px] opacity-70 font-normal uppercase tracking-widest">Configuración Técnica</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6 px-4 pb-20">
        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-9 text-[10px] font-bold" onClick={onResetCamera}>
            <Compass className="w-4 h-4 text-blue-500" /> RECENTRAR CÁMARA
          </Button>
        </div>

        <Accordion type="multiple" defaultValue={['geometry', 'layers']} className="w-full">
          
          <AccordionItem value="geometry" className="border rounded-lg mb-2 overflow-hidden bg-slate-50/50 px-3">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2 text-left">
                <Maximize2 className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-black uppercase tracking-tight">Geometría Base</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Ancho (X)</Label>
                  <Input type="number" value={config.width} onChange={(e) => onConfigChange({ ...config, width: parseInt(e.target.value) || 0 })} className="h-8 text-xs font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Largo (Z)</Label>
                  <Input type="number" value={config.length} onChange={(e) => onConfigChange({ ...config, length: parseInt(e.target.value) || 0 })} className="h-8 text-xs font-bold" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase text-slate-500">Altura Muros (mm)</Label>
                <Input type="number" value={config.globalWallHeight} onChange={(e) => onConfigChange({ ...config, globalWallHeight: parseInt(e.target.value) || 0 })} className="h-8 text-xs font-bold" />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="roof" className="border rounded-lg mb-2 overflow-hidden bg-slate-50/50 px-3">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2 text-left">
                <ArrowUpCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs font-black uppercase tracking-tight">Techumbre</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase text-slate-500">Tipo de Techo</Label>
                <Select value={config.roof.type} onValueChange={(val) => updateRoof('type', val as RoofType)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin Techo</SelectItem>
                    <SelectItem value="one-side">Una Agua</SelectItem>
                    <SelectItem value="two-sides">Dos Aguas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.roof.type !== 'none' && (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-[9px] font-black uppercase text-slate-500">Pendiente: {config.roof.pitch}°</Label>
                    </div>
                    <Slider value={[config.roof.pitch]} min={5} max={45} step={1} onValueChange={(v) => updateRoof('pitch', v[0])} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-500">Alero (Voladizo mm)</Label>
                    <Input type="number" value={config.roof.overhang} onChange={(e) => updateRoof('overhang', parseInt(e.target.value) || 0)} className="h-8 text-xs font-bold" />
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="layers" className="border rounded-lg mb-2 overflow-hidden bg-slate-50/50 px-3">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2 text-left">
                <Layers className="w-4 h-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-tight">Capas y Vistas</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <div className="flex items-center justify-between p-2 bg-white rounded border">
                <span className="text-[10px] font-bold uppercase text-slate-600">Estructura Desnuda</span>
                <Switch checked={config.structuralMode} onCheckedChange={(val) => onConfigChange({ ...config, structuralMode: val })} />
              </div>
              <div className="grid grid-cols-1 gap-2 pt-2">
                {[
                  { id: 'steelProfiles', label: 'Perfiles Muros' },
                  { id: 'roofStructure', label: 'Cerchas Techo' },
                  { id: 'exteriorPanels', label: 'Paneles Exterior' },
                  { id: 'interiorPanels', label: 'Paneles Interior' },
                  { id: 'roofPanels', label: 'Chapas Cubierta' },
                ].map((layer) => (
                  <div key={layer.id} className="flex items-center gap-2">
                    <Checkbox 
                      id={layer.id} 
                      checked={config.layers[layer.id as keyof LayerVisibility]} 
                      onCheckedChange={() => toggleLayer(layer.id as keyof LayerVisibility)} 
                    />
                    <Label htmlFor={layer.id} className="text-[10px] font-bold uppercase cursor-pointer">{layer.label}</Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
