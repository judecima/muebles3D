'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Part, AVAILABLE_PANELS, PanelSize } from '@/lib/types';
import { runOptimization, OptimizationResult } from '@/lib/optimizer';
import { Progress } from '@/components/ui/progress';
import { Scissors, Loader2, Info, LayoutGrid } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OptimizerPanelProps {
  parts: Part[];
  selectedPanel: PanelSize;
  onPanelChange: (panel: PanelSize) => void;
}

export function OptimizerPanel({ parts, selectedPanel, onPanelChange }: OptimizerPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const handleOptimize = () => {
    setLoading(true);
    setResult(null); // Limpiar resultado previo para forzar re-renderizado
    
    // Simular tiempo de cálculo para mostrar el spinner
    setTimeout(() => {
      try {
        const cutlist = parts
          .filter(p => !p.isHardware)
          .map(p => ({
            name: p.name,
            width: p.cutLargo,
            height: p.cutAncho,
            quantity: 1,
            grainDirection: p.grainDirection || 'libre'
          }));

        const res = runOptimization(
          cutlist,
          selectedPanel.width - 20, // Trim de 10mm por lado
          selectedPanel.height - 20,
          4.5 // Kerf de 4.5mm
        );
        setResult(res);
      } catch (e) {
        console.error("Error en optimización local:", e);
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="flex h-full flex-col md:flex-row gap-4 p-4 md:p-6 overflow-hidden bg-slate-50">
      {/* Configuración - Columna Izquierda */}
      <div className="w-full md:w-80 flex flex-col gap-4 shrink-0 overflow-y-auto">
        <Card className="shadow-md">
          <CardHeader className="p-4 bg-slate-900 text-white rounded-t-lg">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Scissors className="w-4 h-4" /> Motor Local v2.0
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Medida Comercial</label>
              <Select 
                value={selectedPanel.id} 
                onValueChange={(id) => onPanelChange(AVAILABLE_PANELS.find(p => p.id === id)!)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_PANELS.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-slate-100 p-3 rounded-lg border text-[10px] space-y-1 text-slate-600">
              <p className="flex justify-between"><span>Trim Perimetral:</span> <b>10 mm</b></p>
              <p className="flex justify-between"><span>Espesor Sierra (Kerf):</span> <b>4.5 mm</b></p>
            </div>
            <Button className="w-full h-9 text-xs font-bold" onClick={handleOptimize} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Optimizar Corte'}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="bg-primary/5 border-primary/20 shadow-md">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] uppercase text-primary font-bold">Estadísticas de Uso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Eficiencia Global</span>
                  <span>{result.totalEfficiency.toFixed(1)}%</span>
                </div>
                <Progress value={result.totalEfficiency} className="h-2 bg-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-medium">
                <div className="p-2 bg-white rounded border border-slate-200">
                  Tableros: <span className="text-primary font-bold block text-sm">{result.totalPanels}</span>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  Piezas: <span className="text-primary font-bold block text-sm">{parts.filter(p => !p.isHardware).length}</span>
                </div>
              </div>
              <p className="text-[9px] text-slate-500 italic flex items-start gap-1 leading-tight">
                <Info className="w-3 h-3 shrink-0" /> {result.summary}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Visualización - Columna Derecha */}
      <div className="flex-1 bg-white border rounded-xl shadow-inner overflow-hidden flex flex-col relative">
        <ScrollArea className="flex-1 p-4 md:p-8">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="font-bold text-sm">Calculando cortes optimizados...</p>
            </div>
          ) : !result ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 py-20 opacity-40">
              <LayoutGrid className="w-16 h-16 md:w-20 md:h-20" />
              <p className="font-bold text-center text-sm md:text-base px-10">Haz clic en optimizar para generar el plano técnico</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-12 pb-20">
              {result.optimizedLayout.map((panel, idx) => (
                <div key={idx} className="space-y-4 w-fit bg-white p-4 rounded-xl border shadow-sm">
                  <div className="flex justify-between items-end border-b pb-2">
                    <h3 className="text-[10px] font-bold text-slate-600 uppercase">Tablero #{panel.panelNumber} - {panel.efficiency.toFixed(1)}% de aprovechamiento</h3>
                  </div>
                  <div 
                    className="relative border-2 border-slate-800 bg-slate-200 shadow-xl overflow-hidden"
                    style={{ 
                      width: selectedPanel.width / 4, 
                      height: selectedPanel.height / 4 
                    }}
                  >
                    {/* Área de Trim */}
                    <div className="absolute inset-2 border-2 border-dashed border-red-400/20 bg-white" />
                    
                    {panel.parts.map((p, pIdx) => (
                      <div 
                        key={pIdx}
                        className="absolute border border-slate-800 bg-[#E8D9B5] flex items-center justify-center overflow-hidden hover:bg-primary/20 transition-colors group cursor-help"
                        title={`${p.name}: ${p.width}x${p.height}mm`}
                        style={{
                          left: (p.x + 10) / 4,
                          top: (p.y + 10) / 4,
                          width: p.width / 4,
                          height: p.height / 4
                        }}
                      >
                        <div className="flex flex-col items-center justify-center p-0.5 pointer-events-none">
                           <span className="text-[7px] md:text-[8px] font-bold text-slate-800 leading-none text-center truncate max-w-full">
                            {p.width}x{p.height}
                          </span>
                          <span className="text-[6px] text-slate-600 hidden group-hover:block truncate max-w-full uppercase">
                            {p.name}
                          </span>
                        </div>
                      </div>
                    ))}
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
