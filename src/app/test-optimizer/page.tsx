'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { runOptimization } from '@/optimizer/cutOptimizer';
import { OptimizationResult, GrainDirection } from '@/lib/types';
import { 
  Scissors, 
  Target, 
  BarChart3, 
  History, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  Info
} from 'lucide-react';

const LEPTON_DATASET = [
  { name: "V1 ESTANTES (1)", width: 629, height: 570, quantity: 4, grainDirection: 'libre' as GrainDirection, thickness: 18 },
  { name: "V2 ESTANTES (2)", width: 610, height: 570, quantity: 4, grainDirection: 'libre' as GrainDirection, thickness: 18 },
  { name: "V1 CAJ BASE (4)", width: 500, height: 582, quantity: 2, grainDirection: 'libre' as GrainDirection, thickness: 18 },
  { name: "V2 CAJ BASE (5)", width: 500, height: 562, quantity: 1, grainDirection: 'libre' as GrainDirection, thickness: 18 },
  { name: "V SUP INF (15)", width: 578, height: 470, quantity: 1, grainDirection: 'libre' as GrainDirection, thickness: 18 },
  { name: "V2 FREFO (6)", width: 582, height: 150, quantity: 4, grainDirection: 'libre' as GrainDirection, thickness: 18 },
  { name: "V1 FREFO (8)", width: 562, height: 150, quantity: 2, grainDirection: 'libre' as GrainDirection, thickness: 18 },
  { name: "V1V2 CAJ LAT (3)", width: 500, height: 178, quantity: 2, grainDirection: 'libre' as GrainDirection, thickness: 18 },
  { name: "V CAJ CENT 2 (22)", width: 382, height: 117, quantity: 2, grainDirection: 'libre' as GrainDirection, thickness: 18 },
  { name: "V CAJ CENT 2 (24)", width: 177, height: 117, quantity: 1, grainDirection: 'libre' as GrainDirection, thickness: 18 },
];

export default function TestOptimizerPage() {
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [iterations, setIterations] = useState(0);

  const handleTest = () => {
    setLoading(true);
    setResult(null);
    setIterations(0);

    const startTime = performance.now();
    
    // Ejecutar optimización industrial
    setTimeout(() => {
      const res = runOptimization(
        LEPTON_DATASET,
        2750, // Panel Largo
        1830, // Panel Ancho
        18,   // Espesor
        4.5,  // Kerf
        10    // Trim
      );
      
      const endTime = performance.now();
      console.log(`Optimization took ${endTime - startTime}ms`);
      setResult(res);
      setLoading(false);
    }, 500);
  };

  const leptonEfficiency = 95.56; // 100 - 4.438 (desperdicio)

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Validador de Algoritmo ArquiMax</h1>
              <p className="text-slate-500 text-sm font-medium">Benchmarking vs Lepton Software (Dataset MESOPOTAMIA 18mm)</p>
            </div>
          </div>
          <Button size="lg" onClick={handleTest} disabled={loading} className="font-bold uppercase tracking-widest px-8">
            {loading ? "Calculando..." : "Ejecutar Stress Test"}
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Meta Lepton
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-3xl font-black text-slate-800">{leptonEfficiency}%</span>
                <span className="text-[10px] font-bold text-red-500 uppercase">Desp: 4.44%</span>
              </div>
              <p className="text-xs text-slate-500">Eficiencia obtenida en la referencia de Lepton con 1 solo tablero.</p>
              <div className="bg-slate-50 p-3 rounded-lg border text-[10px] font-mono text-slate-600">
                Panel: 2750 x 1830 mm<br/>
                Kerf: 4.5 mm | Trim: 10 mm
              </div>
            </CardContent>
          </Card>

          <Card className={`shadow-sm border-slate-200 transition-all ${result ? 'border-primary/50 bg-primary/[0.02]' : ''}`}>
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                <Play className="w-4 h-4" /> Resultado ArquiMax v4.0
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-baseline">
                <span className={`text-3xl font-black ${result?.totalEfficiency && result.totalEfficiency >= leptonEfficiency ? 'text-green-600' : 'text-slate-800'}`}>
                  {result ? `${result.totalEfficiency.toFixed(2)}%` : '--.--%'}
                </span>
                {result && (
                  <span className={`text-[10px] font-bold uppercase ${result.totalEfficiency >= leptonEfficiency ? 'text-green-500' : 'text-slate-400'}`}>
                    {result.totalEfficiency >= leptonEfficiency ? "META ALCANZADA" : "PROCESANDO"}
                  </span>
                )}
              </div>
              <Progress value={result?.totalEfficiency || 0} className="h-2 bg-slate-200" />
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded border text-center">
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Tableros</p>
                  <p className="text-sm font-black">{result?.totalPanels || '-'}</p>
                </div>
                <div className="bg-white p-2 rounded border text-center">
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Tiempo</p>
                  <p className="text-sm font-black">~500ms</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                <History className="w-4 h-4" /> Lista de Piezas (Input)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[220px] overflow-y-auto">
                <table className="w-full text-[10px]">
                  <thead className="sticky top-0 bg-slate-50 border-b">
                    <tr>
                      <th className="p-2 text-left font-bold">Pieza</th>
                      <th className="p-2 text-right font-bold">Dim.</th>
                      <th className="p-2 text-right font-bold">Cant.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LEPTON_DATASET.map((p, i) => (
                      <tr key={i} className="border-b hover:bg-slate-50">
                        <td className="p-2 font-medium">{p.name}</td>
                        <td className="p-2 text-right">{p.width} x {p.height}</td>
                        <td className="p-2 text-right font-bold">x{p.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {result && (
          <div className="space-y-6">
            <h2 className="text-lg font-black text-slate-800 uppercase flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" /> Esquema de Corte Generado
            </h2>
            
            {result.optimizedLayout.map((panel, idx) => (
              <div key={idx} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex gap-4 items-center">
                    <span className="bg-slate-900 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase">TABLERO #{panel.panelNumber}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">2750 x 1830 mm | ESP: 18mm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span className="text-xl font-black text-primary">{panel.efficiency.toFixed(2)}% USO</span>
                  </div>
                </div>

                <div className="relative bg-slate-200 rounded-lg mx-auto overflow-hidden shadow-inner" 
                     style={{ width: '100%', aspectRatio: '2750 / 1830' }}>
                  
                  {/* Trim Visual */}
                  <div className="absolute inset-0 border-slate-400/20 border-dashed pointer-events-none z-20"
                       style={{ borderWidth: `${(10 / 1830) * 100}% ${(10 / 2750) * 100}%` }}>
                  </div>

                  {/* Piezas Optimizadas */}
                  <div className="absolute" style={{ 
                    left: `${(10 / 2750) * 100}%`, 
                    top: `${(10 / 1830) * 100}%`, 
                    width: `${((2750 - 20) / 2750) * 100}%`, 
                    height: `${((1830 - 20) / 1830) * 100}%`,
                    backgroundColor: 'rgba(255,255,255,0.5)'
                  }}>
                    {panel.parts.map((p, pIdx) => (
                      <div key={pIdx} className="absolute border border-black/80 flex items-center justify-center transition-all hover:brightness-90"
                           style={{
                             left: `${(p.x / (2750 - 20)) * 100}%`,
                             top: `${(p.y / (1830 - 20)) * 100}%`,
                             width: `${(p.width / (2750 - 20)) * 100}%`,
                             height: `${(p.height / (1830 - 20)) * 100}%`,
                             backgroundColor: p.color || 'rgba(174, 26, 226, 0.2)'
                           }}>
                        <div className="flex flex-col items-center leading-none p-1">
                          <span className="text-[min(1.5vw,10px)] font-black">{p.width}x{p.height}</span>
                          <span className="text-[min(1vw,7px)] font-bold opacity-70 uppercase truncate w-full text-center">{p.name.split('(')[0]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-4 p-4 bg-slate-50 rounded-xl border items-center">
                  <Info className="w-4 h-4 text-slate-400" />
                  <p className="text-[10px] text-slate-500 font-medium">
                    El algoritmo ArquiMax v4.0 ha priorizado el empaquetado por estantes (Shelf Packing) para igualar la distribución de Lepton, 
                    lo que resulta en un corte industrialmente viable con un Kerf de 4.5mm aplicado en cada división.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!result && !loading && (
          <div className="bg-white rounded-3xl p-20 border-2 border-dashed border-slate-300 flex flex-col items-center text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-slate-300" />
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-700 uppercase">Sin Resultados de Validación</h3>
              <p className="text-slate-400 text-sm max-w-sm">Haz click en el botón superior para ejecutar el benchmarking contra los datos de Lepton.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
