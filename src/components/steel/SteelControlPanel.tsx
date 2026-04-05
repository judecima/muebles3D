'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SteelHouseConfig, SteelWall, LayerVisibility } from '@/lib/steel/types';
import { 
  Home, 
  Layout,
  Layers,
  Maximize2,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { exportFullProject } from '@/server/steel/exportPackager';

interface SteelControlPanelProps {
  config: SteelHouseConfig;
  onConfigChange: (config: SteelHouseConfig) => void;
  structuralAlerts: { status: 'ok' | 'warning' | 'error', message: string }[];
  structuralResult?: any;
  viewerRef?: any;
}

export const SteelControlPanel = ({ 
  config, 
  onConfigChange, 
  structuralAlerts = [], 
  structuralResult,
  viewerRef
}: SteelControlPanelProps) => {
  const [activeTab, setActiveTab] = useState('settings');
  
  const toggleLayer = (layer: keyof LayerVisibility) => {
    onConfigChange({
      ...config,
      layers: { ...config.layers, [layer]: !config.layers[layer] }
    });
  };

  const updateWall = (id: string, field: keyof SteelWall, value: any) => {
    let updatedConfig = { ...config };
    
    if (field === 'length') {
      if (id === 'w1' || id === 'w3') updatedConfig.width = value;
      if (id === 'w2' || id === 'w4') updatedConfig.length = value;
    }

    const newWalls = updatedConfig.walls.map(w => w.id === id ? { ...w, [field]: value } : w);
    onConfigChange({ ...updatedConfig, walls: newWalls });
  };

  return (
    <Card className="h-full border-none shadow-none rounded-none bg-white overflow-y-auto">
      <CardHeader className="bg-slate-900 text-white py-4 sticky top-0 z-10 shadow-sm">
        <CardTitle className="text-lg font-bold flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" /> 
            <span>JADSI STRUCTURAL</span>
          </div>
          <span className="text-[10px] opacity-70 font-normal uppercase tracking-widest">Motor AISI v16.0</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0 pb-20">
        <Accordion type="multiple" defaultValue={['alerts', 'global', 'layers']} className="w-full">
          
          {structuralAlerts.length > 0 && (
            <AccordionItem value="alerts" className="border-b px-4 bg-amber-50/30">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-black uppercase text-amber-700">Informe de Auditoría ({structuralAlerts.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-4">
                {structuralAlerts.map((alert, i) => (
                  <div key={i} className={`p-2 rounded border text-[9px] font-bold flex gap-2 items-start ${alert.status === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${alert.status === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    {alert.message}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}

          {structuralAlerts.length === 0 && (
            <div className="px-4 py-3 bg-emerald-50 border-b flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Estructura Validada AISI</span>
            </div>
          )}

          <AccordionItem value="global" className="border-b px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-black uppercase tracking-tighter">Parámetros de Diseño</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid grid-cols-3 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
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
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-blue-600">Altura (Y)</Label>
                  <Input 
                    type="number" 
                    value={config.globalWallHeight} 
                    onChange={(e) => onConfigChange({ ...config, globalWallHeight: parseInt(e.target.value) || 0 })}
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
            <AccordionContent className="p-4 space-y-4">
              <div className="p-4 bg-gradient-to-br from-blue-700 to-indigo-900 rounded-2xl shadow-2xl border border-white/20">
                <p className="text-[10px] font-black uppercase text-blue-200 tracking-widest mb-2">Finalizar Proyecto</p>
                <button 
                  onClick={() => {
                    const screenshot = viewerRef?.current?.getScreenshot();
                    if (screenshot) {
                        exportFullProject(config, structuralResult, screenshot);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-blue-50 text-blue-900 py-3 rounded-xl font-bold shadow-lg transition-all transform hover:scale-[1.02] active:scale-95"
                >
                  <span className="text-xl">📦</span>
                  <div className="text-left">
                    <p className="text-[11px] font-black uppercase leading-none">Exportación Total</p>
                    <p className="text-[9px] font-medium opacity-70">PDF + ZIP + BLUEPRINTS</p>
                  </div>
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Herramientas de Auditoría</span>
                  </div>
                  <div className="space-y-4 p-3 bg-slate-900 text-white rounded-xl border border-slate-700 shadow-xl">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase">
                        <span className="text-cyan-400">Modo Rayos X (Transparencia)</span>
                        <span>{Math.round((config.xRayMode ? 0.8 : 0) * 100)}%</span>
                      </div>
                      <Switch 
                        checked={config.xRayMode || false} 
                        onCheckedChange={(val) => onConfigChange({ ...config, xRayMode: val })} 
                      />
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex justify-between text-[10px] font-black uppercase">
                        <span className="text-amber-400">Despiece Técnico (Explosión)</span>
                        <span>{Math.round((config.explosionFactor || 0) * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.01" 
                        value={config.explosionFactor || 0} 
                        onChange={(e) => onConfigChange({ ...config, explosionFactor: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Configuración de Cargas (kN/m²)</span>
                  </div>
                  <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold">
                        <span>Nieve: {config.loads.snowKpa}</span>
                        <input 
                          type="range" min="0" max="2" step="0.1" 
                          value={config.loads.snowKpa} 
                          onChange={(e) => onConfigChange({ ...config, loads: { ...config.loads, snowKpa: parseFloat(e.target.value) } })}
                          className="w-20 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold">
                        <span>Viento: {config.loads.windKpa}</span>
                        <input 
                          type="range" min="0" max="3" step="0.1" 
                          value={config.loads.windKpa} 
                          onChange={(e) => onConfigChange({ ...config, loads: { ...config.loads, windKpa: parseFloat(e.target.value) } })}
                          className="w-20 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold">
                        <span>Vibración/Uso: {config.loads.floorLiveKpa}</span>
                        <input 
                          type="range" min="1" max="5" step="0.5" 
                          value={config.loads.floorLiveKpa} 
                          onChange={(e) => onConfigChange({ ...config, loads: { ...config.loads, floorLiveKpa: parseFloat(e.target.value) } })}
                          className="w-20 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Visualización Técnica</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between p-2 bg-slate-900 text-white rounded-lg mb-1">
                      <span className="text-[9px] font-black uppercase">Modo Estructural</span>
                      <Switch 
                        checked={config.structuralMode} 
                        onCheckedChange={(val) => onConfigChange({ ...config, structuralMode: val })} 
                      />
                    </div>
                    {[
                      { id: 'ext-pan', label: 'Placas OSB', key: 'exteriorPanels' },
                      { id: 'int-pan', label: 'Placas Yeso', key: 'interiorPanels' },
                      { id: 'profiles', label: 'Perfilería', key: 'steelProfiles' },
                      { id: 'diagrams', label: 'Vectores de Carga', key: 'structuralDiagrams', color: 'text-emerald-600' },
                      { id: 'foundation', label: 'Cimentación', key: 'foundation', color: 'text-blue-600' },
                      { id: 'budget', label: 'Presupuesto', key: 'budget', color: 'text-amber-600' }
                    ].map(layer => (
                      <div key={layer.id} className="flex items-center gap-2 px-1">
                        <Checkbox 
                          id={layer.id} 
                          checked={config.layers[layer.key as keyof LayerVisibility]} 
                          onCheckedChange={() => toggleLayer(layer.key as keyof LayerVisibility)} 
                        />
                        <Label htmlFor={layer.id} className={`text-[9px] font-black uppercase cursor-pointer ${layer.color || ''}`}>{layer.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
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
                  <div key={wall.id} className="border rounded-xl p-3 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-700">Muro #{idx + 1}</span>
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
                          <SelectContent><SelectItem value="400">400mm</SelectItem><SelectItem value="600">600mm</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[8px] font-bold uppercase text-slate-400">Alto Inicio (mm)</Label>
                        <Input type="number" value={Math.round(wall.heightStart || wall.height)} onChange={(e) => updateWall(wall.id, 'heightStart', parseInt(e.target.value) || 0)} className="h-7 text-[10px] font-bold" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[8px] font-bold uppercase text-slate-400">Alto Fin (mm)</Label>
                        <Input type="number" value={Math.round(wall.heightEnd || wall.height)} onChange={(e) => updateWall(wall.id, 'heightEnd', parseInt(e.target.value) || 0)} className="h-7 text-[10px] font-bold" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="foundation" className="border-b px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black uppercase tracking-tighter">Cimentación y Suelo</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase text-slate-500">Tipo de Suelo (Capacidad Portante)</Label>
                <Select 
                  value={config.foundation?.soil.type || 'arcilloso'} 
                  onValueChange={(val) => onConfigChange({ 
                    ...config, 
                    foundation: { ...config.foundation!, soil: { ...config.foundation!.soil, type: val as any } } 
                  })}>
                  <SelectTrigger className="h-8 text-[10px] font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arcilloso">Suelo Arcilloso (150 kPa)</SelectItem>
                    <SelectItem value="limoso">Suelo Limoso (100 kPa)</SelectItem>
                    <SelectItem value="arenoso">Suelo Arenoso (200 kPa)</SelectItem>
                    <SelectItem value="rocoso">Suelo Rocoso (500 kPa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[8px] font-bold uppercase text-slate-400">Espesor Plata (mm)</Label>
                  <Input type="number" value={config.foundation?.slabThickness || 120} onChange={(e) => onConfigChange({...config, foundation: {...config.foundation!, slabThickness: parseInt(e.target.value) || 0}})} className="h-7 text-[10px] font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[8px] font-bold uppercase text-slate-400">Prof. Pilote (mm)</Label>
                  <Input type="number" value={config.foundation?.pileDepth || 3000} onChange={(e) => onConfigChange({...config, foundation: {...config.foundation!, pileDepth: parseInt(e.target.value) || 0}})} className="h-7 text-[10px] font-bold" />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="p-4 bg-slate-50 border-t sticky bottom-0 z-20">
          <Button variant="outline" className="w-full h-9 text-[10px] font-black uppercase tracking-widest gap-2 bg-white border-slate-200" onClick={() => onConfigChange({ ...config })}>
            <Camera className="w-3.5 h-3.5 text-primary" /> Recentrar Cámara
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}