'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Part, AVAILABLE_PANELS, PanelSize } from '@/lib/types';
import { runOptimization, OptimizationResult } from '@/optimizer/cutOptimizer';
import { generateCutListFromModel } from '@/utils/cutlistGenerator';
import { Progress } from '@/components/ui/progress';
import { Scissors, Loader2, LayoutGrid, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
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

  // Reset results only if pieces change in number or panel size changes
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [parts.length, selectedPanel.id]);

  const handleOptimize = () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    // Pequeño delay para feedback visual
    setTimeout(() => {
      try {
        const cutlist = generateCutListFromModel(parts);
        
        if (cutlist.length === 0) {
          setError("No hay piezas de madera para optimizar.");
          setLoading(false);
          return;
        }

        // Aplicar Trim de 10mm por lado (Total 20mm)
        const usableWidth = selectedPanel.width - 20; 
        const usableHeight = selectedPanel.height - 20;

        const res = runOptimization(
          cutlist,
          usableWidth,
          usableHeight,
          4.5 // Kerf estándar de sierra industrial
        );

        if (!res || res.optimizedLayout.length === 0 || res.optimizedLayout[0].parts.length === 0) {
          setError("Las piezas son demasiado grandes para el tablero.");
        } else {
          setResult(res);
        }
      } catch (e) {
        console.error("Optimization Error:", e);
        setError("Error en el cálculo de optimización.");
      } finally {
        setLoading(false);
      }
    }, 600);
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
    <div className="flex flex-col md:flex-row h-full w-full gap-4 p-4 md:p-6 bg-slate-50 overflow-hidden">
      {/* Panel Lateral de Configuración */}
      <div className="w-full md:w-80 flex flex-col gap-4 shrink-0 h-fit">
        <Card className="shadow-lg border-slate-200 overflow-hidden">
          <CardHeader className="p-4 bg-primary text-white">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Scissors className="w-4 h-4" /> Configuración de Corte
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
              <Button variant="outline" className="w-full h-11 font-bold text-xs border-slate-300" onClick={exportCSV}>
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
            </CardContent>
          </Card>
        )}
      </div>

      {/* Visualización del Plano de Corte */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-inner overflow-hidden relative min-h-[400px]">
        <ScrollArea className="h-full w-full">
          <div className="p-6 md:p-10 flex flex-col items-center gap-10">
            {loading ? (
              <div className="py-24 flex flex-col items-center gap-6 text-slate-400">
                <div className="relative">
                  <Loader2 className="w-16 h-16 animate-spin text-primary" />
                  <Scissors className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-700">Calculando Algoritmo de Guillotina...</p>
                  <p className="text-xs">Probando 100 combinaciones para máxima eficiencia</p>
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
                <div className="bg-slate-50 p-10 rounded-full">
                  <LayoutGrid className="w-24 h-24 opacity-20" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-400 text-lg">Plano de Corte Vacío</p>
                  <p className="text-sm">Configura el tablero y presiona optimizar para ver los cortes</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-10 w-full max-w-screen-xl">
                {result.optimizedLayout.map((panel, idx) => (
                  <div key={idx} className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                        Tablero Industrial #{panel.panelNumber} 
                      </h3>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                        {panel.efficiency.toFixed(1)}% de aprovechamiento
                      </span>
                    </div>
                    
                    {/* Visualizador del Tablero con Escala Dinámica */}
                    <div className="relative border-4 border-slate-900 bg-[#f8f5ee] shadow-2xl rounded-sm mx-auto overflow-hidden transition-all duration-300" 
                         style={{ 
                           width: '100%', 
                           maxWidth: selectedPanel.width / 3, 
                           aspectRatio: `${selectedPanel.width} / ${selectedPanel.height}`,
                           backgroundImage: 'radial-gradient(#00000010 1px, transparent 0)',
                           backgroundSize: '20px 20px'
                         }}>
                      
                      {/* Margen de Trim Perimetral (Visualización del área desperdiciada) */}
                      <div className="absolute inset-0 border-[8px] border-red-500/5 pointer-events-none" />
                      <div className="absolute inset-[3px] border border-dashed border-red-500/10 pointer-events-none" />
                      
                      {/* Contenedor de piezas relativas al tablero */}
                      <div className="absolute inset-0" style={{ transform: 'scale(1)' }}>
                        {panel.parts.map((p, pIdx) => {
                          const scale = 100 / selectedPanel.width;
                          const scaleY = 100 / selectedPanel.height;
                          return (
                            <div 
                              key={pIdx} 
                              className="absolute border border-slate-800 bg-[#E8D9B5] hover:bg-primary/30 hover:z-20 transition-all cursor-help group shadow-sm" 
                              style={{ 
                                left: `${(p.x + 10) * scale}%`, 
                                top: `${(p.y + 10) * scaleY}%`, 
                                width: `${p.width * scale}%`, 
                                height: `${p.height * scaleY}%` 
                              }}
                            >
                              <div className="flex flex-col items-center justify-center h-full w-full p-1 overflow-hidden">
                                 <span className="text-[min(1.2vw,10px)] font-black leading-none text-slate-900 mb-0.5">
                                   {p.width}x{p.height}
                                 </span>
                                 <span className="text-[min(1vw,8px)] text-slate-600 uppercase truncate max-w-full font-bold">
                                   {p.name}
                                 </span>
                                 {/* Tooltip personalizado */}
                                 <div className="hidden group-hover:flex absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-30 font-bold">
                                   {p.name} ({p.width}x{p.height}mm)
                                 </div>
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
      </div>
    </div>
  );
}
