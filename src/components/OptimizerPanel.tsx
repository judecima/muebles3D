'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Part, AVAILABLE_PANELS, PanelSize, GrainDirection } from '@/lib/types';
import { runOptimization, OptimizationResult } from '@/optimizer/cutOptimizer';
import { generateCutListFromModel, CutlistPart } from '@/utils/cutlistGenerator';
import { Progress } from '@/components/ui/progress';
import { Scissors, Loader2, LayoutGrid, FileSpreadsheet, AlertTriangle, CheckCircle2, ChevronRight, Ruler, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';

interface OptimizerPanelProps {
  parts: Part[];
  selectedPanel: PanelSize;
  onPanelChange: (panel: PanelSize) => void;
}

export function OptimizerPanel({ parts, selectedPanel, onPanelChange }: OptimizerPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localCutlist, setLocalCutlist] = useState<CutlistPart[]>([]);

  // Sincronizar lista de corte local con las piezas del modelo cuando cambien
  useEffect(() => {
    const newList = generateCutListFromModel(parts);
    setLocalCutlist(newList);
    setResult(null);
    setError(null);
  }, [parts]);

  const updateGrain = (index: number, grain: GrainDirection) => {
    const updated = [...localCutlist];
    updated[index] = { ...updated[index], grainDirection: grain };
    setLocalCutlist(updated);
    setResult(null); // Reset result when grain changes to force re-optimize
  };

  const handleOptimize = () => {
    if (localCutlist.length === 0) {
      setError("No hay piezas de madera para optimizar.");
      return;
    }

    setLoading(true);
    setError(null);
    
    // Simulación de cálculo pesado
    setTimeout(() => {
      try {
        const usableWidth = selectedPanel.width - 20; 
        const usableHeight = selectedPanel.height - 20;

        const res = runOptimization(
          localCutlist,
          usableWidth,
          usableHeight,
          4.5
        );

        if (res.optimizedLayout.length === 0 || (res.optimizedLayout[0].parts.length === 0 && localCutlist.length > 0)) {
          setError("Piezas demasiado grandes para el tablero.");
        } else {
          setResult(res);
        }
      } catch (e) {
        console.error("Optimization Error:", e);
        setError("Error en el cálculo de optimización industrial.");
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  const exportCSV = () => {
    const headers = "Pieza,Largo,Ancho,Cantidad,Veta\n";
    const rows = localCutlist.map(p => `${p.name},${p.width},${p.height},${p.quantity},${p.grainDirection}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `red-arquimax-despiece.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full gap-4 p-4 md:p-6 bg-slate-100 overflow-hidden">
      {/* Panel Lateral de Configuración y Lista de Piezas */}
      <div className="w-full md:w-96 flex flex-col gap-4 shrink-0 overflow-hidden h-full pb-4">
        <Card className="shadow-lg border-slate-200 bg-white shrink-0">
          <CardHeader className="p-4 bg-primary text-white">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Scissors className="w-4 h-4" /> Configuración de Corte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-500 uppercase">Tablero Base</Label>
              <Select value={selectedPanel.id} onValueChange={(id) => onPanelChange(AVAILABLE_PANELS.find(p => p.id === id)!)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_PANELS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button 
                className="font-bold uppercase text-[10px] shadow-md h-10" 
                onClick={handleOptimize} 
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Calcular'}
              </Button>
              <Button variant="outline" className="font-bold text-[10px] h-10" onClick={exportCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Piezas con Selector de Veta */}
        <Card className="flex-1 shadow-lg border-slate-200 bg-white overflow-hidden flex flex-col min-h-0">
          <CardHeader className="p-4 border-b shrink-0">
            <CardTitle className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-2">
              <Ruler className="w-3 h-3" /> Listado para Optimizar
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {localCutlist.map((part, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-black text-slate-700 leading-tight truncate pr-2">{part.name}</span>
                    <span className="text-[11px] font-bold text-primary">x{part.quantity}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] text-slate-500 font-medium">{part.width} x {part.height} mm</span>
                    <Select value={part.grainDirection} onValueChange={(val) => updateGrain(idx, val as GrainDirection)}>
                      <SelectTrigger className="h-7 w-24 text-[9px] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="libre" className="text-[10px]">Veta Libre</SelectItem>
                        <SelectItem value="vertical" className="text-[10px]">Vertical</SelectItem>
                        <SelectItem value="horizontal" className="text-[10px]">Horizontal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {result && (
          <Card className="bg-white border-primary/20 shadow-lg shrink-0">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-[11px] font-bold text-slate-700">
                <span>Eficiencia Global</span>
                <span className="text-primary">{result.totalEfficiency.toFixed(1)}%</span>
              </div>
              <Progress value={result.totalEfficiency} className="h-2" />
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-400 uppercase">Tableros: {result.totalPanels}</span>
                <span className="text-slate-400 uppercase">Cortes: {result.optimizedLayout.reduce((acc, p) => acc + p.parts.length, 0)}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Visualización de los Planos de Corte */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-inner overflow-hidden relative flex flex-col min-h-0">
        <ScrollArea className="flex-1">
          <div className="p-6 md:p-10 flex flex-col items-center gap-12 pb-24 min-h-full">
            {loading ? (
              <div className="py-24 flex flex-col items-center gap-6 text-slate-400">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-bold text-slate-700">Aplicando Algoritmo Guillotina...</p>
                  <p className="text-xs">Probando 100 iteraciones para máxima eficiencia</p>
                </div>
              </div>
            ) : error ? (
              <div className="py-20 flex flex-col items-center gap-4 text-red-500 bg-red-50 p-10 rounded-2xl border border-red-100 max-w-md">
                <AlertTriangle className="w-12 h-12" />
                <p className="font-bold text-center">{error}</p>
                <Button variant="ghost" className="text-red-600" onClick={handleOptimize}>Reintentar</Button>
              </div>
            ) : !result ? (
              <div className="py-32 flex flex-col items-center gap-6 text-slate-200">
                <LayoutGrid className="w-24 h-24 opacity-20" />
                <div className="text-center">
                  <p className="font-bold text-slate-400 text-lg uppercase tracking-widest">Plano de Corte</p>
                  <p className="text-sm">Configura las vetas y presiona Calcular</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-16 w-full max-w-5xl">
                {result.optimizedLayout.map((panel, idx) => (
                  <div key={idx} className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between px-4 border-l-4 border-primary bg-slate-50 py-2 rounded-r-md">
                      <div>
                        <h3 className="text-sm font-black uppercase text-slate-800 tracking-tighter">Tablero Industrial #{panel.panelNumber}</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{selectedPanel.width}x{selectedPanel.height}mm (Útil: {selectedPanel.width-20}x{selectedPanel.height-20}mm)</p>
                      </div>
                      <span className="text-[11px] font-black text-primary bg-white px-3 py-1 rounded-full border border-primary/20 shadow-sm">
                        {panel.efficiency.toFixed(1)}% Usado
                      </span>
                    </div>
                    
                    <div className="relative border-2 border-slate-900 bg-[#f4f1ea] shadow-2xl rounded-sm mx-auto overflow-hidden" 
                         style={{ 
                           width: '100%', 
                           aspectRatio: `${selectedPanel.width} / ${selectedPanel.height}`,
                           backgroundImage: 'radial-gradient(#00000008 1.5px, transparent 0)',
                           backgroundSize: '24px 24px'
                         }}>
                      
                      {/* Margen de Trim (Red dashed) */}
                      <div className="absolute inset-0 border-[10px] border-red-500/10 pointer-events-none border-dashed" />
                      
                      <div className="absolute inset-0">
                        {panel.parts.map((p, pIdx) => {
                          const scaleX = 100 / selectedPanel.width;
                          const scaleY = 100 / selectedPanel.height;
                          return (
                            <div 
                              key={pIdx} 
                              className="absolute border border-slate-900/60 bg-primary/20 hover:bg-primary/40 transition-all cursor-help group flex items-center justify-center overflow-hidden shadow-sm" 
                              style={{ 
                                left: `${(p.x + 10) * scaleX}%`, 
                                top: `${(p.y + 10) * scaleY}%`, 
                                width: `${p.width * scaleX}%`, 
                                height: `${p.height * scaleY}%` 
                              }}
                            >
                              <div className="flex flex-col items-center justify-center p-0.5 text-center leading-none select-none">
                                <span className="text-[min(1.6vw,10px)] font-black text-slate-900">{p.width}x{p.height}</span>
                                <span className="text-[min(1.2vw,8px)] text-slate-700 uppercase truncate w-full font-bold px-0.5">{p.name}</span>
                                {p.rotated && <span className="text-[7px] text-primary font-black mt-0.5 px-1 bg-white rounded-full">ROT 90°</span>}
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
          <div className="absolute bottom-6 right-10 pointer-events-none flex items-center gap-2 bg-slate-900/90 backdrop-blur text-white text-[10px] py-2 px-5 rounded-full shadow-2xl animate-bounce border border-white/10">
            <span className="font-bold uppercase tracking-wider">Scroll para ver más tableros</span>
            <ChevronRight className="w-3 h-3 rotate-90" />
          </div>
        )}
      </div>
    </div>
  );
}
