'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Part, AVAILABLE_PANELS, PanelSize } from '@/lib/types';
import { runOptimization, OptimizationResult } from '@/optimizer/cutOptimizer';
import { generateCutListFromModel } from '@/utils/cutlistGenerator';
import { Progress } from '@/components/ui/progress';
import { Scissors, Loader2, LayoutGrid, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OptimizerPanelProps {
  parts: Part[];
  selectedPanel: PanelSize;
  onPanelChange: (panel: PanelSize) => void;
}

export function OptimizerPanel({ parts, selectedPanel, onPanelChange }: OptimizerPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = () => {
    setLoading(true);
    setError(null);
    
    // Pequeño delay para asegurar que el estado de carga se refleje en la UI
    setTimeout(() => {
      try {
        const cutlist = generateCutListFromModel(parts);
        
        if (cutlist.length === 0) {
          setError("No se encontraron piezas de madera para optimizar en el modelo actual.");
          setLoading(false);
          return;
        }

        const usableWidth = selectedPanel.width - 20;
        const usableHeight = selectedPanel.height - 20;

        const res = runOptimization(
          cutlist,
          usableWidth,
          usableHeight,
          4.5
        );

        if (res.optimizedLayout.length === 0) {
          setError("Las piezas no caben en el tablero seleccionado. Intente con un tablero más grande.");
        } else {
          setResult(res);
        }
      } catch (e) {
        console.error("Optimization Error:", e);
        setError("Error inesperado en el motor de cálculo.");
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const exportCSV = () => {
    const cutlist = generateCutListFromModel(parts);
    const headers = "Pieza,Largo,Ancho,Cantidad,Veta\n";
    const rows = cutlist.map(p => `${p.name},${p.width},${p.height},${p.quantity},${p.grainDirection}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `despiece-red-arquimax.csv`;
    a.click();
  };

  return (
    <div className="flex h-full flex-col md:flex-row gap-4 p-4 md:p-6 overflow-hidden bg-slate-50">
      {/* Sidebar Config */}
      <div className="w-full md:w-80 flex flex-col gap-4 shrink-0">
        <Card className="shadow-md border-slate-200">
          <CardHeader className="p-4 bg-slate-900 text-white rounded-t-lg">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Scissors className="w-4 h-4 text-primary" /> Optimizador de Corte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tablero Seleccionado</label>
              <Select value={selectedPanel.id} onValueChange={(id) => onPanelChange(AVAILABLE_PANELS.find(p => p.id === id)!)}>
                <SelectTrigger className="h-10 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_PANELS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full h-10 font-bold uppercase text-xs" onClick={handleOptimize} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Optimizar Corte'}
            </Button>
            <Button variant="outline" className="w-full h-10 font-bold text-xs" onClick={exportCSV}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Despiece
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="bg-white border-primary/20 shadow-md">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] uppercase text-primary font-bold">Resumen de Eficiencia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Aprovechamiento</span>
                  <span>{result.totalEfficiency.toFixed(1)}%</span>
                </div>
                <Progress value={result.totalEfficiency} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">Tableros</span>
                  <span className="text-xl font-black text-slate-900">{result.totalPanels}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">Piezas</span>
                  <span className="text-xl font-black text-primary">
                    {result.optimizedLayout.reduce((acc, p) => acc + p.parts.length, 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Visualizer Area */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-inner overflow-hidden relative">
        <ScrollArea className="h-full w-full">
          <div className="p-4 md:p-8 flex flex-col items-center gap-12">
            {loading ? (
              <div className="py-20 flex flex-col items-center gap-4 text-slate-400">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="font-bold">Calculando disposición óptima...</p>
              </div>
            ) : error ? (
              <div className="py-20 flex flex-col items-center gap-4 text-red-500 bg-red-50 p-8 rounded-lg border border-red-100">
                <AlertTriangle className="w-12 h-12" />
                <p className="font-bold text-center">{error}</p>
              </div>
            ) : !result ? (
              <div className="py-20 flex flex-col items-center gap-4 text-slate-400 opacity-40">
                <LayoutGrid className="w-20 h-20" />
                <p className="font-bold">Haga clic en optimizar para generar el plano de corte</p>
              </div>
            ) : (
              result.optimizedLayout.map((panel, idx) => (
                <div key={idx} className="space-y-4 bg-white p-6 rounded-xl border shadow-lg border-slate-100 w-fit">
                  <div className="flex justify-between border-b pb-2">
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-tight">
                      Tablero #{panel.panelNumber} 
                      <span className="ml-4 text-primary">({panel.efficiency.toFixed(1)}% de uso)</span>
                    </h3>
                  </div>
                  
                  {/* Factor escala 1/4 para visualizar en mm */}
                  <div className="relative border-[2px] border-slate-800 bg-slate-50 overflow-hidden" 
                       style={{ width: selectedPanel.width / 4, height: selectedPanel.height / 4 }}>
                    
                    {/* Margen Trim 10mm / 4 = 2.5px */}
                    <div className="absolute inset-[2.5px] border border-dashed border-red-500/20 pointer-events-none" />
                    
                    {panel.parts.map((p, pIdx) => (
                      <div 
                        key={pIdx} 
                        className="absolute border border-slate-800 bg-[#E8D9B5] hover:bg-primary/20 transition-colors" 
                        title={`${p.name}: ${p.width}x${p.height}mm`} 
                        style={{ 
                          left: (p.x + 10) / 4, 
                          top: (p.y + 10) / 4, 
                          width: p.width / 4, 
                          height: p.height / 4 
                        }}
                      >
                        <div className="flex flex-col items-center justify-center h-full w-full p-0.5 overflow-hidden">
                           <span className="text-[7px] font-black leading-none text-slate-900">
                             {p.width}x{p.height}
                           </span>
                           <span className="text-[6px] text-slate-600 uppercase truncate max-w-full font-bold">
                             {p.name}
                           </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}