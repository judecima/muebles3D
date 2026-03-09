'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Part, AVAILABLE_PANELS, PanelSize } from '@/lib/types';
import { runOptimization, OptimizationResult } from '@/optimizer/cutOptimizer';
import { generateCutListFromModel } from '@/utils/cutlistGenerator';
import { Progress } from '@/components/ui/progress';
import { Scissors, Loader2, LayoutGrid, FileSpreadsheet, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
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

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [parts.length, selectedPanel.id]);

  const handleOptimize = () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    // Simulamos un breve retraso para la UX del algoritmo industrial
    setTimeout(() => {
      try {
        const cutlist = generateCutListFromModel(parts);
        
        if (cutlist.length === 0) {
          setError("No hay piezas de madera para optimizar.");
          setLoading(false);
          return;
        }

        // Aplicamos Trim de 10mm por lado
        const usableWidth = selectedPanel.width - 20; 
        const usableHeight = selectedPanel.height - 20;

        const res = runOptimization(
          cutlist,
          usableWidth,
          usableHeight,
          4.5 // Kerf estándar de 4.5mm
        );

        if (!res || res.optimizedLayout.length === 0 || (res.optimizedLayout[0].parts.length === 0 && cutlist.length > 0)) {
          setError("Piezas demasiado grandes para el tablero.");
        } else {
          setResult(res);
        }
      } catch (e) {
        console.error("Optimization Error:", e);
        setError("Error en el cálculo de optimización.");
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  const exportCSV = () => {
    const cutlist = generateCutListFromModel(parts);
    const headers = "Pieza,Largo,Ancho,Cantidad,Veta\n";
    const rows = cutlist.map(p => `${p.name},${p.width},${p.height},${p.quantity},${p.grainDirection}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `red-arquimax-despiece.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full gap-4 p-4 md:p-6 bg-slate-100 overflow-hidden min-h-0">
      {/* Panel Lateral de Configuración */}
      <div className="w-full md:w-80 flex flex-col gap-4 shrink-0 overflow-y-auto pb-4 h-full">
        <Card className="shadow-lg border-slate-200 overflow-hidden bg-white">
          <CardHeader className="p-4 bg-primary text-white shrink-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Scissors className="w-4 h-4" /> Configuración Industrial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Dimensiones Tablero (mm)</label>
              <Select value={selectedPanel.id} onValueChange={(id) => onPanelChange(AVAILABLE_PANELS.find(p => p.id === id)!)}>
                <SelectTrigger className="h-10 border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_PANELS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="pt-2 flex flex-col gap-2">
              <Button 
                className="w-full h-11 font-bold uppercase text-xs shadow-md" 
                onClick={handleOptimize} 
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Optimizar Corte'}
              </Button>
              <Button variant="outline" className="w-full h-11 font-bold text-xs border-slate-300 bg-white" onClick={exportCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card className="bg-white border-primary/20 shadow-lg animate-in fade-in slide-in-from-left-4 duration-300">
            <CardHeader className="p-4 pb-2 border-b">
              <CardTitle className="text-[10px] uppercase text-primary font-bold flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" /> Reporte de Eficiencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Aprovechamiento Global</span>
                  <span className="text-primary">{result.totalEfficiency.toFixed(1)}%</span>
                </div>
                <Progress value={result.totalEfficiency} className="h-2.5 bg-slate-100" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center shadow-sm">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block mb-1">Tableros</span>
                  <span className="text-2xl font-black text-slate-900 leading-none">{result.totalPanels}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center shadow-sm">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block mb-1">Cortes</span>
                  <span className="text-2xl font-black text-primary leading-none">
                    {result.optimizedLayout.reduce((acc, p) => acc + p.parts.length, 0)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-50 space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Detalle por Tablero</span>
                <ScrollArea className="h-[120px]">
                  {result.optimizedLayout.map((p, i) => (
                    <div key={i} className="flex justify-between text-[10px] text-slate-600 py-1 border-b border-slate-50 last:border-0">
                      <span>Tablero #{p.panelNumber}</span>
                      <span className="font-bold text-primary">{p.efficiency.toFixed(1)}%</span>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Visualización del Plano de Corte */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-inner overflow-hidden relative flex flex-col h-full min-h-0">
        <ScrollArea className="flex-1 w-full h-full">
          <div className="p-6 md:p-10 flex flex-col items-center gap-16 min-h-full pb-20">
            {loading ? (
              <div className="py-24 flex flex-col items-center gap-6 text-slate-400">
                <div className="relative">
                  <Loader2 className="w-16 h-16 animate-spin text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-700">Calculando Guillotina...</p>
                  <p className="text-xs">Rotando piezas 'libre' para máxima eficiencia</p>
                </div>
              </div>
            ) : error ? (
              <div className="py-20 flex flex-col items-center gap-4 text-red-500 bg-red-50/50 p-10 rounded-3xl border border-red-100 max-w-md">
                <AlertTriangle className="w-16 h-16" />
                <p className="font-bold text-center text-lg">{error}</p>
                <Button variant="ghost" className="text-red-600 font-bold" onClick={handleOptimize}>Reintentar</Button>
              </div>
            ) : !result ? (
              <div className="py-24 flex flex-col items-center gap-6 text-slate-300">
                <LayoutGrid className="w-24 h-24 opacity-20" />
                <div className="text-center">
                  <p className="font-bold text-slate-400 text-lg">Sin Optimización</p>
                  <p className="text-sm">Configura el tablero y presiona optimizar</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-12 w-full max-w-5xl">
                {result.optimizedLayout.map((panel, idx) => (
                  <div key={idx} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2 border-l-4 border-primary pl-4">
                      <div>
                        <h3 className="text-lg font-black uppercase text-slate-800">Tablero Industrial #{panel.panelNumber}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedPanel.width} x {selectedPanel.height} mm (Trim 10mm)</p>
                      </div>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
                        {panel.efficiency.toFixed(1)}% Usado
                      </span>
                    </div>
                    
                    {/* Visualizador del Tablero con Escala Dinámica */}
                    <div className="relative border-2 border-slate-900 bg-[#f4f1ea] shadow-xl rounded-sm mx-auto overflow-hidden" 
                         style={{ 
                           width: '100%', 
                           aspectRatio: `${selectedPanel.width} / ${selectedPanel.height}`,
                           backgroundImage: 'radial-gradient(#00000008 1.5px, transparent 0)',
                           backgroundSize: '20px 20px'
                         }}>
                      
                      {/* Margen de Trim */}
                      <div className="absolute inset-0 border-[10px] border-red-500/5 pointer-events-none" />
                      
                      <div className="absolute inset-0">
                        {panel.parts.map((p, pIdx) => {
                          const scaleX = 100 / selectedPanel.width;
                          const scaleY = 100 / selectedPanel.height;
                          return (
                            <div 
                              key={pIdx} 
                              className="absolute border border-slate-800 bg-[#D4C4A8] hover:bg-primary/40 transition-colors cursor-help group flex items-center justify-center overflow-hidden" 
                              style={{ 
                                left: `${(p.x + 10) * scaleX}%`, 
                                top: `${(p.y + 10) * scaleY}%`, 
                                width: `${p.width * scaleX}%`, 
                                height: `${p.height * scaleY}%` 
                              }}
                            >
                              <div className="flex flex-col items-center justify-center p-0.5 text-center leading-none">
                                <span className="text-[min(1.8vw,11px)] font-black text-slate-900">{p.width}x{p.height}</span>
                                <span className="text-[min(1.4vw,8px)] text-slate-700 uppercase truncate w-full font-bold px-1">{p.name}</span>
                                {p.rotated && <span className="text-[7px] text-primary font-black mt-0.5">90°</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
        {result && result.totalPanels > 1 && (
          <div className="absolute bottom-4 right-8 pointer-events-none flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] py-2 px-4 rounded-full animate-bounce">
            <span>Scroll para ver más tableros</span>
            <ChevronRight className="w-3 h-3 rotate-90" />
          </div>
        )}
      </div>
    </div>
  );
}
