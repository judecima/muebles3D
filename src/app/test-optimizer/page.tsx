'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { runOptimization } from '@/optimizer/cutOptimizer';
import { OptimizationResult, GrainDirection } from '@/lib/types';
import { 
  Scissors, 
  Target, 
  BarChart3, 
  Plus, 
  Trash2, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  Info,
  Layers,
  ArrowRightToLine
} from 'lucide-react';

interface PartInput {
  name: string;
  width: number;
  height: number;
  quantity: number;
  grainDirection: GrainDirection;
}

const DEFAULT_PARTS: PartInput[] = [
  { name: "V1 ESTANTES (1)", width: 629, height: 570, quantity: 4, grainDirection: 'libre' },
  { name: "V2 ESTANTES (2)", width: 610, height: 570, quantity: 4, grainDirection: 'libre' },
  { name: "V1 CAJ BASE (4)", width: 582, height: 500, quantity: 2, grainDirection: 'libre' },
  { name: "V1 LATS (6)", width: 582, height: 150, quantity: 4, grainDirection: 'libre' },
  { name: "V1 FRENTES (5)", width: 562, height: 500, quantity: 1, grainDirection: 'libre' },
  { name: "V1 PUERTA (8)", width: 562, height: 150, quantity: 2, grainDirection: 'libre' },
];

export default function TestOptimizerPage() {
  const [parts, setParts] = useState<PartInput[]>(DEFAULT_PARTS);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const addPart = () => {
    setParts([...parts, { name: `Pieza ${parts.length + 1}`, width: 500, height: 300, quantity: 1, grainDirection: 'libre' }]);
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
    // Simulamos carga para UX industrial
    setTimeout(() => {
      const res = runOptimization(
        parts.map(p => ({ ...p, thickness: 18 })),
        2750, 1830, 18, 4.5, 10
      );
      setResult(res);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8 pb-40">
        
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-8 rounded-3xl shadow-sm border border-slate-200 gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-primary p-4 rounded-2xl shadow-lg shadow-primary/20">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Laboratorio ArquiMax v7.5</h1>
              <p className="text-slate-500 text-sm font-medium">Optimizador Industrial: Unidad de Venta 1375mm</p>
            </div>
          </div>
          <Button size="lg" onClick={handleOptimize} disabled={loading} className="font-black uppercase px-10 h-14 bg-slate-900 hover:bg-black">
            {loading ? "ANALIZANDO 3000 CICLOS..." : "OPTIMIZAR AHORA"}
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm border-slate-200">
            <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest">Listado de Piezas Personalizado</CardTitle>
              <Button variant="outline" size="sm" onClick={addPart} className="h-8 text-[10px] font-bold">
                <Plus className="w-3.5 h-3.5 mr-1" /> AGREGAR PIEZA
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white sticky top-0 border-b z-10">
                    <tr>
                      <th className="p-4 text-left font-bold text-slate-400 uppercase tracking-widest">Nombre</th>
                      <th className="p-4 text-center font-bold text-slate-400 uppercase tracking-widest">Largo (mm)</th>
                      <th className="p-4 text-center font-bold text-slate-400 uppercase tracking-widest">Ancho (mm)</th>
                      <th className="p-4 text-center font-bold text-slate-400 uppercase tracking-widest">Cant.</th>
                      <th className="p-4 text-center font-bold text-slate-400 uppercase tracking-widest">Veta</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parts.map((part, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <Input value={part.name} onChange={(e) => updatePart(i, 'name', e.target.value)} className="h-8 text-xs font-bold" />
                        </td>
                        <td className="p-3">
                          <Input type="number" value={part.width} onChange={(e) => updatePart(i, 'width', parseInt(e.target.value))} className="h-8 text-xs text-center" />
                        </td>
                        <td className="p-3">
                          <Input type="number" value={part.height} onChange={(e) => updatePart(i, 'height', parseInt(e.target.value))} className="h-8 text-xs text-center" />
                        </td>
                        <td className="p-3">
                          <Input type="number" value={part.quantity} onChange={(e) => updatePart(i, 'quantity', parseInt(e.target.value))} className="h-8 text-xs text-center" />
                        </td>
                        <td className="p-3">
                          <Select value={part.grainDirection} onValueChange={(v) => updatePart(i, 'grainDirection', v)}>
                            <SelectTrigger className="h-8 text-[10px] w-28 mx-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vertical">Vertical</SelectItem>
                              <SelectItem value="horizontal">Horizontal</SelectItem>
                              <SelectItem value="libre">Libre</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => removePart(i)} className="text-slate-300 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Métricas de Aprovechamiento
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-4xl font-black text-slate-900">{result ? `${result.totalEfficiency.toFixed(2)}%` : '--.--%'}</span>
                  <span className="text-[10px] font-black uppercase px-2 py-1 rounded bg-primary/10 text-primary">Eficiencia Global</span>
                </div>
                <Progress value={result?.totalEfficiency || 0} className="h-2.5 bg-slate-100" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-4 rounded-xl border text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Tableros</p>
                    <p className="text-lg font-black text-slate-800">{result?.totalPanels || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Unidad Venta</p>
                    <p className="text-lg font-black text-slate-800">1375mm</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-4">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest">Compromiso Industrial</p>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                El motor prioriza el <span className="text-white font-bold">Medio Panel Vertical</span>. El límite es de <span className="text-primary font-bold">1375mm</span> de ancho. El algoritmo compacta las piezas hacia la izquierda para maximizar el área libre sobrante.
              </p>
            </div>
          </div>
        </div>

        {result && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-500" /> Plano de Corte Optimizado
            </h2>
            
            {result.optimizedLayout.map((panel, idx) => (
              <div key={idx} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 items-center">
                    <span className="bg-slate-900 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">TABLERO #{panel.panelNumber}</span>
                    <span className="text-sm font-black text-slate-800">2750 x 1830 mm (Útil: {2750 - result.trim*2}x{1830 - result.trim*2}mm)</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Uso Tablero</p>
                    <p className="text-xl font-black text-primary">{panel.efficiency.toFixed(2)}%</p>
                  </div>
                </div>

                <div className="relative bg-slate-100 rounded-lg mx-auto overflow-hidden shadow-inner border border-slate-300" 
                     style={{ width: '100%', aspectRatio: '2750 / 1830' }}>
                  
                  {/* Línea de Medio Panel (División Vertical a 1375mm) */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-0 border-l-2 border-dashed border-red-500/50 z-30 pointer-events-none">
                    <span className="absolute top-4 left-2 bg-red-500 text-white px-3 py-1 rounded text-[8px] font-black uppercase shadow-lg">Límite Medio Panel (1375mm)</span>
                  </div>

                  {/* Área Útil (Descontando Trim) */}
                  <div className="absolute bg-white" style={{ 
                    left: `${(result.trim / 2750) * 100}%`, 
                    top: `${(result.trim / 1830) * 100}%`, 
                    width: `${((2750 - result.trim * 2) / 2750) * 100}%`, 
                    height: `${((1830 - result.trim * 2) / 1830) * 100}%`,
                    backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
                    backgroundSize: '24px 24px'
                  }}>
                    {panel.parts.map((p, pIdx) => (
                      <div key={pIdx} className="absolute border border-slate-900/60 flex items-center justify-center transition-all hover:brightness-90 group"
                           style={{
                             left: `${(p.x / (2750 - result.trim * 2)) * 100}%`,
                             top: `${(p.y / (1830 - result.trim * 2)) * 100}%`,
                             width: `${(p.width / (2750 - result.trim * 2)) * 100}%`,
                             height: `${(p.height / (1830 - result.trim * 2)) * 100}%`,
                             backgroundColor: p.color || 'rgba(174, 26, 226, 0.15)'
                           }}>
                        <div className="flex flex-col items-center leading-none p-1 pointer-events-none overflow-hidden text-center">
                          <span className="text-[min(1.5vw,10px)] font-black text-slate-900">{p.width}x{p.height}</span>
                          <span className="text-[min(1vw,7px)] font-bold text-slate-700 uppercase truncate w-full mt-0.5">{p.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 items-center">
                  <ArrowRightToLine className="w-5 h-5 text-primary" />
                  <p className="text-[10px] text-slate-500 font-medium italic">
                    El motor ArquiMax v7.5 ha compactado las piezas hacia la izquierda. Si el bloque total no supera los 1375mm, el operario puede realizar un único corte vertical para liberar el medio panel restante para reventa.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
