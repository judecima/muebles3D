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
  FileSpreadsheet, 
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
      setError("No hay piezas de madera para optimizar.");
      return;
    }

    setLoading(true);
    setError(null);
    
    // Simulación de proceso industrial asíncrono
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
        setError("Error en el cálculo industrial de optimización.");
      } finally {
        setLoading(false);
      }
    }, 100);
  };

  const exportPDF = async () => {
    if (!result) return;
    const doc = new jsPDF();
    const BRAND_COLOR = [174, 26, 226];

    doc.setFontSize(22);
    doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.text("RED ARQUIMAX - Plano de Corte", 105, 30, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text(`Tablero: ${selectedPanel.name} | Eficiencia: ${result.totalEfficiency.toFixed(1)}%`, 20, 50);

    (doc as any).autoTable({
      head: [['Pieza', 'Largo', 'Ancho', 'Cant.', 'Veta']],
      body: localCutlist.map(p => [p.name, p.width, p.height, p.quantity, p.grainDirection]),
      startY: 60,
      headStyles: { fillColor: BRAND_COLOR }
    });

    doc.save(`planocorte-arquimax-${Date.now()}.pdf`);
  };

  return (
    <div className="flex-1 w-full bg-slate-100 overflow-y-auto min-h-0" ref={containerRef}>
      <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto pb-32">
        
        {/* Encabezado y Configuración */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 shadow-sm border-slate-200 bg-white">
            <CardHeader className="p-4 bg-primary text-white rounded-t-lg flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Motor Industrial v2.6
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row items-end gap-4">
                <div className="flex-1 space-y-2 w-full">
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
                <div className="flex gap-2 w-full md:w-auto">
                  <Button 
                    className="flex-1 md:w-48 font-bold uppercase text-xs h-10 shadow-lg bg-slate-900 hover:bg-black" 
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

              <Collapsible open={isPartsListOpen} onOpenChange={setIsPartsListOpen} className="border rounded-lg bg-slate-50">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex justify-between items-center px-4 py-2 text-slate-600">
                    <span className="text-xs font-bold flex items-center gap-2">
                      <Ruler className="w-3.5 h-3.5" /> Ver/Editar Vetas
                    </span>
                    {isPartsListOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 border-t bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {localCutlist.map((part, idx) => (
                      <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold truncate pr-2">{part.name}</span>
                          <span className="text-[10px] font-black text-primary">x{part.quantity}</span>
                        </div>
                        <Select value={part.grainDirection} onValueChange={(val) => updateGrain(idx, val as GrainDirection)}>
                          <SelectTrigger className="h-7 text-[9px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="libre">Libre (Auto)</SelectItem>
                            <SelectItem value="vertical">Vertical</SelectItem>
                            <SelectItem value="horizontal">Horizontal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          <Card className={`shadow-sm border-slate-200 bg-white flex flex-col justify-center transition-all ${result ? 'opacity-100' : 'opacity-50'}`}>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-end">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Eficiencia Final</Label>
                <span className="text-xl font-black text-primary">{result ? result.totalEfficiency.toFixed(1) : '0.0'}%</span>
              </div>
              <Progress value={result ? result.totalEfficiency : 0} className="h-2" />
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>TABLEROS: {result ? result.totalPanels : '-'}</span>
                <span>KERF: 4.5mm</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visualización de Resultados */}
        <div className="w-full min-h-[500px]">
          {loading ? (
            <div className="py-24 flex flex-col items-center gap-6 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-bold text-slate-700 uppercase tracking-tighter">Motor ArquiMax Industrial en Acción</p>
                <p className="text-xs">Evaluando 3000 combinaciones de guillotina...</p>
              </div>
            </div>
          ) : error ? (
            <div className="py-16 flex flex-col items-center gap-4 text-red-500 bg-red-50 p-10 rounded-xl border border-red-100">
              <AlertTriangle className="w-12 h-12" />
              <p className="font-bold text-center">{error}</p>
            </div>
          ) : !result ? (
            <div className="py-32 flex flex-col items-center gap-6 text-slate-200 bg-white rounded-xl border-2 border-dashed border-slate-200">
              <LayoutGrid className="w-20 h-20 opacity-10" />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Presiona "Optimizar 3000 Ciclos"</p>
            </div>
          ) : (
            <div className="space-y-12" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              {result.optimizedLayout.map((panel, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-white rounded-lg shadow-xl">
                    <h3 className="text-xs font-black uppercase tracking-tight">Tablero #{panel.panelNumber}</h3>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold text-slate-400">{selectedPanel.width}x{selectedPanel.height}mm</span>
                      <span className="text-[10px] font-bold bg-primary px-3 py-1 rounded-full">{panel.efficiency.toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <div className="relative border-[6px] border-slate-900 bg-[#f9f7f2] shadow-2xl rounded-sm mx-auto overflow-hidden" 
                       style={{ 
                         width: '100%', 
                         aspectRatio: `${selectedPanel.width} / ${selectedPanel.height}`,
                         backgroundImage: 'radial-gradient(#00000008 1.5px, transparent 0)',
                         backgroundSize: '20px 20px'
                       }}>
                    
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
                            className="absolute border border-slate-900 flex items-center justify-center overflow-hidden hover:brightness-90 transition-all shadow-[inset_0_0_8px_rgba(0,0,0,0.05)]" 
                            style={{ 
                              left: `${vX}%`, 
                              top: `${vY}%`, 
                              width: `${vW}%`, 
                              height: `${vH}%`,
                              backgroundColor: p.color || 'rgba(174, 26, 226, 0.1)'
                            }}
                          >
                            <div className="flex flex-col items-center justify-center p-0.5 text-center leading-none">
                              <span className="text-[min(1.8vw,10px)] font-black text-slate-900">{p.width}x{p.height}</span>
                              <span className="text-[min(1.4vw,7px)] text-slate-700 uppercase truncate w-full font-bold">{p.name}</span>
                              {p.rotated && <span className="text-[6px] text-primary font-black mt-0.5 px-1 bg-white/80 rounded-full">ROT</span>}
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
