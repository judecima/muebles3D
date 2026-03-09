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
    setResult(null);
    
    // Timeout para simular proceso industrial y asegurar render del spinner
    setTimeout(() => {
      try {
        const cutlist = generateCutListFromModel(parts);
        
        if (cutlist.length === 0) {
          setError("No hay piezas de madera para optimizar.");
          setLoading(false);
          return;
        }

        const res = runOptimization(
          cutlist,
          selectedPanel.width - 20, // Trim 10mm cada lado
          selectedPanel.height - 20,
          4.5 // Kerf estándar
        );

        if (res.optimizedLayout.length === 0) {
          setError("Algunas piezas son más grandes que el tablero seleccionado.");
        } else {
          setResult(res);
        }
      } catch (e) {
        console.error("Error de optimización:", e);
        setError("Ocurrió un error inesperado al calcular los cortes.");
      } finally {
        setLoading(false);
      }
    }, 600);
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
      {/* Sidebar de Configuración */}
      <div className="w-full md:w-80 flex flex-col gap-4 shrink-0 overflow-y-auto">
        <Card className="shadow-md border-slate-200">
          <CardHeader className="p-4 bg-slate-900 text-white rounded-t-lg">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Scissors className="w-4 h-4 text-primary" /> Optimizador Industrial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tablero MDF 18mm</label>
              <Select value={selectedPanel.id} onValueChange={(id) => onPanelChange(AVAILABLE_PANELS.find(p => p.id === id)!)}>
                <SelectTrigger className="h-10 border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AVAILABLE_PANELS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full h-10 text-xs font-bold uppercase tracking-tight" onClick={handleOptimize} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Ejecutar Optimización'}
            </Button>
            <Button variant="outline" className="w-full h-10 text-xs font-bold border-slate-200" onClick={exportCSV}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Despiece
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="bg-white border-primary/20 shadow-md">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] uppercase text-primary font-bold">Estadísticas Técnicas</CardTitle></CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Aprovechamiento</span>
                  <span>{result.totalEfficiency.toFixed(1)}%</span>
                </div>
                <Progress value={result.totalEfficiency} className="h-2 bg-slate-100" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">Tableros</span>
                  <span className="text-xl font-black text-slate-900">{result.totalPanels}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">Eficiencia</span>
                  <span className="text-xl font-black text-primary">{result.totalEfficiency.toFixed(0)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Visualizador del Plano de Corte */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-inner overflow-hidden flex flex-col relative">
        <ScrollArea className="flex-1 p-4 md:p-8">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="font-bold text-sm animate-pulse">Calculando plano de corte óptimo...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-red-500 gap-4 py-20 bg-red-50/50 rounded-lg border border-dashed border-red-200 m-4">
              <AlertTriangle className="w-12 h-12" />
              <p className="font-bold text-center text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={() => setError(null)}>Reintentar</Button>
            </div>
          ) : !result ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 py-20">
              <LayoutGrid className="w-16 h-16 opacity-20" />
              <p className="font-bold text-center text-sm text-slate-400">Configure los parámetros y presione "Ejecutar Optimización"</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-16 pb-20">
              {result.optimizedLayout.map((panel, idx) => (
                <div key={idx} className="space-y-6 w-fit bg-white p-6 rounded-2xl border shadow-lg border-slate-100">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-tighter">
                      Plano de Corte #{panel.panelNumber} 
                      <span className="ml-3 text-primary font-bold">({panel.efficiency.toFixed(1)}% Útil)</span>
                    </h3>
                  </div>
                  {/* El factor /4 escala el tablero de 2600mm a ~650px para visualización */}
                  <div className="relative border-[3px] border-slate-900 bg-slate-50 shadow-2xl overflow-hidden" 
                       style={{ width: (selectedPanel.width) / 4, height: (selectedPanel.height) / 4 }}>
                    
                    {/* Visualización del Trim (Margen de limpieza) */}
                    <div className="absolute inset-[2.5px] border border-dashed border-red-500/30 bg-white pointer-events-none" />
                    
                    {panel.parts.map((p, pIdx) => (
                      <div 
                        key={pIdx} 
                        className="absolute border border-slate-900 bg-[#E8D9B5] hover:bg-primary/20 transition-colors flex items-center justify-center group cursor-help overflow-hidden" 
                        title={`${p.name}: ${p.width}x${p.height}mm`} 
                        style={{ 
                          left: (p.x + 10) / 4, 
                          top: (p.y + 10) / 4, 
                          width: p.width / 4, 
                          height: p.height / 4 
                        }}
                      >
                        <div className="flex flex-col items-center justify-center p-1 pointer-events-none text-center">
                           <span className="text-[8px] font-black text-slate-900 leading-tight">
                             {p.width}<span className="text-[6px] mx-0.5 text-slate-500">x</span>{p.height}
                           </span>
                           <span className="text-[7px] text-slate-600 font-bold uppercase truncate max-w-full hidden sm:block">
                             {p.name}
                           </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 text-[9px] text-slate-400 font-bold uppercase">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#E8D9B5] border border-slate-400" /> Piezas MDF</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 border border-dashed border-red-500/30" /> Trim (10mm)</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
