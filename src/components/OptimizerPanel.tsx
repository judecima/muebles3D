'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Part, AVAILABLE_PANELS, PanelSize, GrainDirection, OptimizationResult } from '@/lib/types';
import { runOptimization } from '@/optimizer/cutOptimizer';
import { generateCutListFromModel, CutlistPart } from '@/utils/cutlistGenerator';
import { Progress } from '@/components/ui/progress';
import { 
  Scissors, 
  Loader2, 
  LayoutGrid, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Ruler, 
  Settings2,
  FileDown,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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
  const [isPartsListOpen, setIsPartsListOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

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
    setResult(null);
  };

  const handleOptimize = () => {
    if (localCutlist.length === 0) {
      setError("No hay piezas para optimizar.");
      return;
    }

    setLoading(true);
    setError(null);
    
    // Ejecución asíncrona para no bloquear el hilo de la UI durante 3000 ciclos
    setTimeout(() => {
      try {
        const res = runOptimization(
          localCutlist,
          selectedPanel.width,
          selectedPanel.height,
          4.5, // Kerf
          10   // Trim
        );

        if (res.optimizedLayout.length === 0) {
          setError("Piezas demasiado grandes para el tablero.");
        } else {
          setResult(res);
        }
      } catch (e) {
        console.error(e);
        setError("Error industrial en el cálculo de optimización.");
      } finally {
        setLoading(false);
      }
    }, 100);
  };

  const exportPDF = async () => {
    if (!result) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const BRAND_COLOR = [174, 26, 226];

    doc.setFontSize(22);
    doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.text("RED ARQUIMAX - Plano de Corte Industrial", 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(`Tablero: ${selectedPanel.name} | Eficiencia: ${result.totalEfficiency.toFixed(1)}% | Kerf: 4.5mm`, 20, 50);

    (doc as any).autoTable({
      head: [['Pieza', 'Largo (mm)', 'Ancho (mm)', 'Cant.', 'Veta']],
      body: localCutlist.map(p => [p.name, p.width, p.height, p.quantity, p.grainDirection]),
      startY: 60,
      headStyles: { fillColor: BRAND_COLOR }
    });

    doc.save(`planocorte-arquimax-${Date.now()}.pdf`);
  };

  return (
    <div className="flex-1 w-full bg-slate-50 overflow-y-auto">
      <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto pb-40">
        
        {/* Panel de Control Industrial */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm border-slate-200 bg-white">
            <CardHeader className="p-4 bg-primary text-white rounded-t-lg flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> ArquiMax Industrial v3.0
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => setZoom(z => Math.max(0.4, z - 0.1))}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-end gap-4">
                <div className="flex-1 space-y-2 w-full">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Selección de Tablero</Label>
                  <Select value={selectedPanel.id} onValueChange={(id) => onPanelChange(AVAILABLE_PANELS.find(p => p.id === id)!)}>
                    <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_PANELS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    className="flex-1 sm:w-48 font-bold uppercase text-xs h-10 shadow-lg bg-slate-900 hover:bg-black" 
                    onClick={handleOptimize} 
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Optimizar 3000 Ciclos'}
                  </Button>
                  {result && (
                    <Button variant="outline" className="h-10 border-primary text-primary" onClick={exportPDF}>
                      <FileDown className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <Collapsible open={isPartsListOpen} onOpenChange={setIsPartsListOpen} className="border rounded-lg overflow-hidden">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex justify-between items-center px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-none">
                    <span className="text-xs font-bold flex items-center gap-2">
                      <Ruler className="w-3.5 h-3.5" /> Editar Vetas Individuales
                    </span>
                    {isPartsListOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 bg-white border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {localCutlist.map((part, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded border border-slate-100 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold truncate max-w-[120px]">{part.name}</span>
                          <span className="text-[10px] font-black text-primary px-1.5 py-0.5 bg-white rounded border">x{part.quantity}</span>
                        </div>
                        <Select value={part.grainDirection} onValueChange={(val) => updateGrain(idx, val as GrainDirection)}>
                          <SelectTrigger className="h-8 text-[9px] bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="libre">Veta: Libre (Auto)</SelectItem>
                            <SelectItem value="vertical">Veta: Vertical</SelectItem>
                            <SelectItem value="horizontal">Veta: Horizontal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          <Card className={`shadow-sm border-slate-200 bg-white transition-all flex flex-col ${result ? 'opacity-100 translate-y-0' : 'opacity-50'}`}>
            <CardHeader className="py-4 px-6 border-b">
              <CardTitle className="text-xs font-bold uppercase text-slate-500">Resumen Industrial</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-center gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">Eficiencia de Área</Label>
                  <span className="text-2xl font-black text-primary">{result ? result.totalEfficiency.toFixed(1) : '0.0'}%</span>
                </div>
                <Progress value={result ? result.totalEfficiency : 0} className="h-2.5 bg-slate-100" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Tableros</p>
                  <p className="text-lg font-black text-slate-700">{result ? result.totalPanels : '-'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Desperdicio</p>
                  <p className="text-lg font-black text-slate-700">{result ? (100 - result.totalEfficiency).toFixed(1) : '-'}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visualización de Tableros Optimizado */}
        <div className="w-full">
          {loading ? (
            <div className="py-32 flex flex-col items-center gap-6 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-inner">
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <Scissors className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-black text-slate-700 uppercase tracking-tight text-lg">Procesando 3000 Combinaciones</p>
                <p className="text-xs text-slate-400 font-medium italic">Buscando el mejor aprovechamiento industrial para Red Arquimax...</p>
              </div>
            </div>
          ) : error ? (
            <div className="py-20 flex flex-col items-center gap-4 text-red-500 bg-red-50 p-10 rounded-2xl border border-red-100 shadow-sm">
              <AlertTriangle className="w-12 h-12" />
              <p className="font-bold text-center text-lg">{error}</p>
              <Button variant="outline" onClick={() => setError(null)} className="mt-2">Reintentar</Button>
            </div>
          ) : !result ? (
            <div className="py-40 flex flex-col items-center gap-6 text-slate-300 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm">
              <LayoutGrid className="w-24 h-24 opacity-10" />
              <div className="text-center">
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Motor de Optimización Desactivado</p>
                <Button variant="secondary" onClick={handleOptimize} className="font-bold">Iniciar Cálculo Industrial</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-16 py-8" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              {result.optimizedLayout.map((panel, idx) => (
                <div key={idx} className="space-y-4 max-w-full">
                  <div className="flex items-center justify-between px-6 py-3 bg-slate-900 text-white rounded-xl shadow-lg border-b-4 border-primary">
                    <div className="flex flex-col">
                      <h3 className="text-xs font-black uppercase tracking-tight">Tablero #{panel.panelNumber}</h3>
                      <span className="text-[10px] text-slate-400 font-bold">{selectedPanel.width} x {selectedPanel.height} mm</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Uso del Panel</p>
                        <p className="text-xs font-black text-primary">{panel.efficiency.toFixed(1)}%</p>
                      </div>
                      <div className="h-10 w-10 rounded-full border-2 border-primary/30 flex items-center justify-center bg-white/5">
                        <span className="text-[10px] font-black">{panel.panelNumber}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative border-8 border-slate-900 bg-[#fefdfa] shadow-2xl rounded-sm mx-auto overflow-hidden" 
                       style={{ 
                         width: '100%', 
                         aspectRatio: `${selectedPanel.width} / ${selectedPanel.height}`,
                         backgroundImage: 'linear-gradient(rgba(0,0,0,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.03) 1px, transparent 1px)',
                         backgroundSize: '40px 40px'
                       }}>
                    
                    {/* El Trim (Zona de limpieza) */}
                    <div className="absolute inset-0 pointer-events-none opacity-20" style={{ border: `${result.trim}px solid #ae1ae2` }}></div>

                    <div className="absolute inset-0">
                      {panel.parts.map((p, pIdx) => {
                        const scaleX = 100 / selectedPanel.width;
                        const scaleY = 100 / selectedPanel.height;
                        const vX = (p.x + result.trim) * scaleX;
                        const vY = (p.y + result.trim) * scaleY;
                        const vW = p.width * scaleX;
                        const vH = p.height * scaleY;

                        return (
                          <div 
                            key={pIdx} 
                            title={`${p.name}: ${p.width}x${p.height}mm`}
                            className="absolute border border-slate-900/40 flex items-center justify-center overflow-hidden hover:brightness-90 transition-all cursor-help group" 
                            style={{ 
                              left: `${vX}%`, 
                              top: `${vY}%`, 
                              width: `${vW}%`, 
                              height: `${vH}%`,
                              backgroundColor: p.color || 'rgba(174, 26, 226, 0.1)'
                            }}
                          >
                            <div className="flex flex-col items-center justify-center p-0.5 text-center leading-none group-hover:scale-110 transition-transform">
                              <span className="text-[min(1.8vw,11px)] font-black text-slate-900">{p.width}x{p.height}</span>
                              <span className="text-[min(1.4vw,8px)] text-slate-700 uppercase truncate w-full font-bold px-1">{p.name}</span>
                              {p.rotated && (
                                <span className="text-[6px] text-primary font-black mt-0.5 px-1 bg-white/80 rounded-full uppercase">Rotada</span>
                              )}
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
      </div>
    </div>
  );
}
