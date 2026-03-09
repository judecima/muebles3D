'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Part, AVAILABLE_PANELS, PanelSize } from '@/lib/types';
import { runOptimization, OptimizationResult } from '@/optimizer/cutOptimizer';
import { generateCutListFromModel } from '@/utils/cutlistGenerator';
import { Progress } from '@/components/ui/progress';
import { Scissors, Loader2, Info, LayoutGrid, FileSpreadsheet } from 'lucide-react';
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
    setTimeout(() => {
      try {
        const cutlist = generateCutListFromModel(parts);
        const res = runOptimization(
          cutlist,
          selectedPanel.width - 20, 
          selectedPanel.height - 20,
          4.5 
        );
        setResult(res);
      } catch (e) {
        console.error("Error de optimización:", e);
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  const exportCSV = () => {
    const cutlist = generateCutListFromModel(parts);
    const headers = "Pieza,Largo,Ancho,Cantidad,Veta\n";
    const rows = cutlist.map(p => `${p.name},${p.width},${p.height},${p.quantity},${p.grainDirection}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `despiece-arquimax.csv`;
    a.click();
  };

  return (
    <div className="flex h-full flex-col md:flex-row gap-4 p-4 md:p-6 overflow-hidden bg-slate-50">
      <div className="w-full md:w-80 flex flex-col gap-4 shrink-0 overflow-y-auto">
        <Card className="shadow-md">
          <CardHeader className="p-4 bg-slate-900 text-white rounded-t-lg">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Scissors className="w-4 h-4" /> Optimizador Lepton v3
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tablero Comercial</label>
              <Select value={selectedPanel.id} onValueChange={(id) => onPanelChange(AVAILABLE_PANELS.find(p => p.id === id)!)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AVAILABLE_PANELS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full h-9 text-xs font-bold" onClick={handleOptimize} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Optimizar Corte'}
            </Button>
            <Button variant="outline" className="w-full h-9 text-xs font-bold border-slate-200" onClick={exportCSV}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar CSV
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="bg-primary/5 border-primary/20 shadow-md">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] uppercase text-primary font-bold">Rendimiento</CardTitle></CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Eficiencia Global</span>
                  <span>{result.totalEfficiency.toFixed(1)}%</span>
                </div>
                <Progress value={result.totalEfficiency} className="h-2 bg-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-medium">
                <div className="p-2 bg-white rounded border border-slate-200">Tableros: <span className="text-primary font-bold block text-sm">{result.totalPanels}</span></div>
                <div className="p-2 bg-white rounded border border-slate-200">Piezas: <span className="text-primary font-bold block text-sm">{parts.filter(p => !p.isHardware).length}</span></div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex-1 bg-white border rounded-xl shadow-inner overflow-hidden flex flex-col relative">
        <ScrollArea className="flex-1 p-4 md:p-8">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="font-bold text-sm">Ejecutando algoritmos industrial...</p>
            </div>
          ) : !result ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 py-20 opacity-40">
              <LayoutGrid className="w-16 h-16" />
              <p className="font-bold text-center text-sm">Haga clic en optimizar para ver el plano técnico</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-12 pb-20">
              {result.optimizedLayout.map((panel, idx) => (
                <div key={idx} className="space-y-4 w-fit bg-white p-4 rounded-xl border shadow-sm">
                  <div className="flex justify-between items-end border-b pb-2">
                    <h3 className="text-[10px] font-bold text-slate-600 uppercase">Plano #{panel.panelNumber} - Aprovechamiento: {panel.efficiency.toFixed(1)}%</h3>
                  </div>
                  <div className="relative border-2 border-slate-800 bg-slate-200 shadow-xl overflow-hidden" style={{ width: selectedPanel.width / 4, height: selectedPanel.height / 4 }}>
                    <div className="absolute inset-2 border-2 border-dashed border-red-400/20 bg-white" />
                    {panel.parts.map((p, pIdx) => (
                      <div key={pIdx} className="absolute border border-slate-800 bg-[#E8D9B5] flex items-center justify-center group cursor-help" title={`${p.name}: ${p.width}x${p.height}mm`} style={{ left: (p.x + 10) / 4, top: (p.y + 10) / 4, width: p.width / 4, height: p.height / 4 }}>
                        <div className="flex flex-col items-center justify-center p-0.5 pointer-events-none">
                           <span className="text-[7px] font-bold text-slate-800 leading-none">{p.width}x{p.height}</span>
                           <span className="text-[6px] text-slate-600 hidden group-hover:block truncate max-w-full">{p.name}</span>
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
