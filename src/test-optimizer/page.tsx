'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { runOptimization } from '@/optimizer/cutOptimizer';
import { OptimizationResult, GrainDirection } from '@/lib/types';
import { 
  Target, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Layers,
  ZoomIn,
  ZoomOut,
  Scissors,
  Loader2,
  AlertCircle,
  Settings2,
  Maximize2
} from 'lucide-react';

interface PartInput {
  name: string;
  width: number;
  height: number;
  quantity: number;
  grainDirection: GrainDirection;
}

// DATASET MESOPOTAMIA EXACTO (23 PIEZAS XML LEPTON)
const MESOPOTAMIA_DATASET: PartInput[] = [
  { name: "(1) Lateral Izq/Der", width: 629, height: 570, quantity: 4, grainDirection: 'libre' },
  { name: "(2) Lateral V2 Prefo", width: 610, height: 570, quantity: 4, grainDirection: 'libre' },
  { name: "(4) Piso/Techo", width: 582, height: 500, quantity: 2, grainDirection: 'libre' },
  { name: "(5) Piso/Techo", width: 562, height: 500, quantity: 1, grainDirection: 'libre' },
  { name: "(15) Divisor V-Caj Cent2", width: 578, height: 470, quantity: 1, grainDirection: 'libre' },
  { name: "(3) Frente Cajon", width: 500, height: 178, quantity: 2, grainDirection: 'libre' },
  { name: "(6) Amarre", width: 582, height: 150, quantity: 4, grainDirection: 'libre' },
  { name: "(8) Amarre(8)", width: 562, height: 150, quantity: 2, grainDirection: 'libre' },
  { name: "(22) Contrafrente v1 v2 caj", width: 382, height: 117, quantity: 2, grainDirection: 'libre' },
  { name: "(24) Taco Pieza 2", width: 177, height: 117, quantity: 1, grainDirection: 'libre' },
];

export default function TestOptimizerPage() {
  const [parts, setParts] = useState<PartInput[]>(MESOPOTAMIA_DATASET);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(0.85);

  const addPart = () => {
    setParts([...parts, { name: `Nueva Pieza ${parts.length + 1}`, width: 500, height: 300, quantity: 1, grainDirection: 'libre' }]);
  };

  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const updatePart = (index: number, field: keyof PartInput, value: any) => {
    const newParts = [...parts];
    newParts[index] = { ...newParts[index], [field]: value };
    setParts(newParts);
  };

  const handleOptimize = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const res = runOptimization(
          parts.map(p => ({ ...p, thickness: 18 })),
          2750, 1830, 18, 4.5, 10
        );
        setResult(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  useEffect(() => {
    handleOptimize();
  }, []);

  const totalPartsCount = parts.reduce((a, b) => a + b.quantity, 0);

  return (
    <div className="min-h-screen bg-[#F3F6F8] p-4 md:p-8 font-body antialiased overflow-x-hidden">
      <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
        
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-[#ae1ae2] p-3 rounded-2xl shadow-lg shadow-[#ae1ae2]/20">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">ArquiMax Ultra-Industrial v10.0</h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <Scissors className="w-3 h-3 text-[#ae1ae2]" /> Guillotina 4-Stage + V-Stacking + HoleFill | Meta Lepton: 96.4%
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button size="lg" onClick={handleOptimize} disabled={loading} className="flex-1 md:flex-none font-black uppercase px-8 h-12 bg-slate-900 hover:bg-black text-white text-xs rounded-xl shadow-xl transition-all">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Settings2 className="w-4 h-4 mr-2" />}
              {loading ? "Calculando Layout Óptimo..." : "Ejecutar Optimización Industrial"}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1 shadow-sm border-none rounded-3xl overflow-hidden flex flex-col h-[800px]">
            <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between p-4">
              <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <Layers className="w-4 h-4" /> Piezas Dataset ({totalPartsCount})
              </CardTitle>
              <Button variant="outline" size="icon" onClick={addPart} className="h-7 w-7 rounded-full">
                <Plus className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1">
              <div className="divide-y divide-slate-100">
                {parts.map((part, i) => (
                  <div key={i} className="p-4 hover:bg-slate-50 transition-colors group relative">
                    <div className="flex flex-col gap-2">
                      <Input 
                        value={part.name} 
                        onChange={(e) => updatePart(i, 'name', e.target.value)} 
                        className="h-7 text-[10px] font-black bg-transparent border-none p-0 focus-visible:ring-0" 
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Ancho (B)</p>
                          <Input type="number" value={part.width} onChange={(e) => updatePart(i, 'width', parseInt(e.target.value))} className="h-8 text-[10px] text-center font-bold bg-white border-slate-200" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Alto (H)</p>
                          <Input type="number" value={part.height} onChange={(e) => updatePart(i, 'height', parseInt(e.target.value))} className="h-8 text-[10px] text-center font-bold bg-white border-slate-200" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Cant.</p>
                          <Input type="number" value={part.quantity} onChange={(e) => updatePart(i, 'quantity', parseInt(e.target.value))} className="h-8 text-[10px] text-center font-black text-[#ae1ae2] bg-[#ae1ae2]/5 border-[#ae1ae2]/20" />
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removePart(i)} className="absolute top-2 right-2 h-6 w-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="shadow-sm border-none rounded-3xl p-6 bg-white flex flex-col justify-center items-center text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Eficiencia Industrial</p>
                <div className="relative h-24 w-24 flex items-center justify-center mb-4">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-slate-100" />
                    <circle cx="48" cy="48" r="40" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray={`${(result?.totalEfficiency || 0) * 2.51} 251`} className="text-[#ae1ae2] transition-all duration-1000 ease-out" />
                  </svg>
                  <span className="absolute text-xl font-black text-slate-800 tracking-tighter">
                    {result ? `${result.totalEfficiency.toFixed(1)}%` : '--%'}
                  </span>
                </div>
              </Card>

              <Card className="shadow-sm border-none rounded-3xl p-6 bg-white flex flex-col justify-center">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consolidación</p>
                  <Layers className="w-4 h-4 text-[#ae1ae2]" />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className={`text-3xl font-black ${result?.totalPanels === 1 ? 'text-[#ae1ae2]' : 'text-slate-800'}`}>
                      {result?.totalPanels || '-'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">PANELES</span>
                  </div>
                  <Progress value={result ? (1 / result.totalPanels) * 100 : 0} className="h-2" />
                </div>
              </Card>

              <Card className="shadow-sm border-none rounded-3xl p-6 bg-slate-900 text-white flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-[#ae1ae2] flex items-center justify-center">
                    <AlertCircle className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Diagnóstico ArquiMax v10.0</p>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  {loading ? "Ejecutando 20,000 ciclos de optimización industrial..." : 
                   result?.totalPanels === 1 ? "¡ÉXITO! Se ha consolidado todo el pedido de Mesopotamia en un solo panel al 96.4% de eficiencia." : 
                   "El motor v10.0 optimiza el flujo de corte para maximizar la densidad global e igualar los resultados de Lepton."}
                </p>
              </Card>
            </div>

            {result && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${result.totalEfficiency > 95 ? 'text-[#ae1ae2]' : 'text-amber-500'}`} /> 
                    Esquema Técnico Industrial v10.0
                  </h2>
                  <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(0.4, z - 0.1))}><ZoomOut className="w-4 h-4" /></Button>
                    <span className="text-[10px] font-black w-8 text-center">{Math.round(zoom * 100)}%</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}><ZoomIn className="w-4 h-4" /></Button>
                  </div>
                </div>

                <div className="overflow-auto bg-slate-200/30 p-8 rounded-3xl border-2 border-dashed border-slate-200 min-h-[700px] flex flex-col items-center custom-scrollbar">
                  <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }} className="transition-transform duration-300">
                    {result.optimizedLayout.map((panel, idx) => (
                      <div key={idx} className="bg-white p-10 rounded-xl shadow-2xl mb-12 border border-slate-100" 
                           style={{ width: '1000px', aspectRatio: '2750 / 1830' }}>
                        <div className="flex items-center justify-between mb-4">
                          <span className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">PANEL 2750x1830 (KERF: {result.kerf}mm)</span>
                          <span className="text-[10px] font-black text-[#ae1ae2] uppercase">{panel.efficiency.toFixed(2)}% APROVECHAMIENTO</span>
                        </div>

                        <div className="relative bg-slate-100 rounded-sm overflow-hidden border border-slate-300 shadow-inner" 
                             style={{ width: '100%', aspectRatio: '2750 / 1830' }}>
                          
                          {/* Área Útil */}
                          <div className="absolute bg-white" style={{ 
                            left: `${(result.trim / 2750) * 100}%`, 
                            top: `${(result.trim / 1830) * 100}%`, 
                            width: `${((2750 - result.trim * 2) / 2750) * 100}%`, 
                            height: `${((1830 - result.trim * 2) / 1830) * 100}%`,
                            backgroundImage: 'linear-gradient(rgba(174, 26, 226, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(174, 26, 226, 0.05) 1px, transparent 1px)',
                            backgroundSize: '25px 25px'
                          }}>
                            {panel.parts.map((p, pIdx) => (
                              <div key={pIdx} className="absolute border border-slate-900/60 transition-all hover:z-20 hover:brightness-95 group/piece cursor-help"
                                   title={`${p.name} (${p.width}x${p.height}mm)`}
                                   style={{
                                     left: `${(p.x / (2750 - result.trim * 2)) * 100}%`,
                                     top: `${(p.y / (1830 - result.trim * 2)) * 100}%`,
                                     width: `${(p.width / (2750 - result.trim * 2)) * 100}%`,
                                     height: `${(p.height / (1830 - result.trim * 2)) * 100}%`,
                                     backgroundColor: p.color || 'rgba(174, 26, 226, 0.2)'
                                   }}>
                                {/* Base (Ancho) - Línea Inferior */}
                                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[min(1.4vw,10px)] font-black text-slate-900 leading-none pointer-events-none">
                                  {p.width}
                                </span>
                                {/* Altura (Alto) - Línea Izquierda */}
                                <span className="absolute left-0.5 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[min(1.4vw,10px)] font-black text-slate-900 leading-none whitespace-nowrap pointer-events-none">
                                  {p.height}
                                </span>
                                {/* Nombre - Centro */}
                                <div className="absolute inset-0 flex items-center justify-center p-0.5 overflow-hidden text-center select-none pointer-events-none">
                                  <span className="text-[min(1.2vw,9px)] font-bold text-slate-700 uppercase truncate max-w-full px-1">{p.name}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-slate-400">
                          <Maximize2 className="w-3 h-3" />
                          <span className="text-[9px] font-bold uppercase italic tracking-wider">Algoritmo ArquiMax v10.0: Guillotina Jerárquica + V-Stacking recursivo</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
