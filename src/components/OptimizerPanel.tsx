
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Part, AVAILABLE_PANELS, PanelSize } from '@/lib/types';
import { runOptimization, OptimizationResult } from '@/lib/optimizer';
import { Progress } from '@/components/ui/progress';
import { Scissors, Loader2, Info, LayoutGrid, FileDown } from 'lucide-react';

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
    // Simular un pequeño retardo para feedback visual, aunque el cálculo es instantáneo
    setTimeout(() => {
      try {
        const cutlist = parts
          .filter(p => !p.isHardware)
          .map(p => ({
            name: p.name,
            width: p.cutLargo,
            height: p.cutAncho,
            quantity: 1,
            grainDirection: p.grainDirection
          }));

        const res = runOptimization(
          cutlist,
          selectedPanel.width - 20, // 10mm trim per side
          selectedPanel.height - 20,
          4.5 // Kerf estándar Red Arquimax
        );
        setResult(res);
      } catch (e) {
        console.error("Error en optimización:", e);
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  return (
    <div className="flex h-full flex-col md:flex-row gap-4 p-6 overflow-hidden">
      <div className="w-full md:w-80 flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Scissors className="w-4 h-4" /> Motor de Optimización Local
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Medida Comercial</label>
              <Select 
                value={selectedPanel.id} 
                onValueChange={(id) => onPanelChange(AVAILABLE_PANELS.find(p => p.id === id)!)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_PANELS.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border text-[10px] space-y-1 text-slate-600">
              <p className="flex justify-between"><span>Trim Perimetral:</span> <b>10 mm</b></p>
              <p className="flex justify-between"><span>Espesor de Sierra (Kerf):</span> <b>4.5 mm</b></p>
            </div>
            <Button className="w-full" onClick={handleOptimize} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Optimizar Corte Local'}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-primary">Resultados del Algoritmo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>Optimización Total</span>
                  <span>{result.totalEfficiency.toFixed(1)}%</span>
                </div>
                <Progress value={result.totalEfficiency} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-medium">
                <div className="p-2 bg-white rounded border">
                  Tableros: <span className="text-primary font-bold block text-sm">{result.totalPanels}</span>
                </div>
                <div className="p-2 bg-white rounded border">
                  Piezas: <span className="text-primary font-bold block text-sm">{parts.filter(p => !p.isHardware).length}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic flex items-start gap-1">
                <Info className="w-3 h-3 shrink-0" /> {result.summary}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex-1 bg-white border rounded-xl shadow-inner overflow-auto p-8 relative min-h-[500px]">
        {!result ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-40">
            <LayoutGrid className="w-20 h-20" />
            <p className="font-bold">Haga clic en optimizar para generar el plano de corte</p>
          </div>
        ) : (
          <div className="space-y-12">
            {result.optimizedLayout.map((panel, idx) => (
              <div key={idx} className="space-y-4">
                <div className="flex justify-between items-end">
                  <h3 className="text-xs font-bold text-slate-400 uppercase">Tablero #{panel.panelNumber} - Eficiencia: {panel.efficiency.toFixed(1)}%</h3>
                </div>
                <div 
                  className="relative border-4 border-slate-900 bg-slate-200 shadow-2xl mx-auto origin-top-left"
                  style={{ 
                    width: selectedPanel.width / 4, 
                    height: selectedPanel.height / 4 
                  }}
                >
                  <div className="absolute inset-2 border-2 border-dashed border-red-400/30 bg-white" />
                  {panel.parts.map((p, pIdx) => (
                    <div 
                      key={pIdx}
                      className="absolute border border-slate-900 bg-[#E8D9B5] flex items-center justify-center overflow-hidden hover:bg-primary/20 transition-colors group"
                      style={{
                        left: (p.x + 10) / 4,
                        top: (p.y + 10) / 4,
                        width: p.width / 4,
                        height: p.height / 4
                      }}
                    >
                      <span className="text-[7px] font-bold text-slate-800 leading-none text-center p-0.5 pointer-events-none group-hover:hidden truncate max-w-full">
                        {p.name}<br/>{p.width}x{p.height}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
