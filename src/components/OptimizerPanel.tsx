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
  Printer,
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
    
    // Ejecutar motor industrial de 3000 iteraciones
    // Usamos setTimeout para permitir que el spinner de carga se renderice
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

  const exportCSV = () => {
    const headers = "Pieza,Largo (mm),Ancho (mm),Espesor (mm),Cantidad,Veta\n";
    const rows = localCutlist.map(p => `${p.name},${p.width},${p.height},${p.thickness},${p.quantity},${p.grainDirection}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `red-arquimax-industrial-cutlist.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!result) return;

    const doc = new jsPDF();
    const BRAND_COLOR = [174, 26, 226];

    doc.setFontSize(22);
    doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.text("RED ARQUIMAX - Plano de Corte Industrial", 105, 30, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text(`Tablero: ${selectedPanel.name}`, 20, 50);
    doc.text(`Eficiencia Global: ${result.totalEfficiency.toFixed(1)}%`, 20, 60);
    doc.text(`Total Tableros: ${result.totalPanels}`, 20, 70);
    doc.text(`Kerf: ${result.kerf} mm | Trim: ${result.trim} mm`, 20, 80);

    (doc as any).autoTable({
      head: [['Pieza', 'Largo', 'Ancho', 'Esp.', 'Cant.', 'Veta']],
      body: localCutlist.map(p => [p.name, p.width, p.height, p.thickness, p.quantity, p.grainDirection]),
      startY: 90,
      headStyles: { fillColor: BRAND_COLOR }
    });

    result.optimizedLayout.forEach((panel, i) => {
      doc.addPage();
      doc.text(`Tablero #${panel.panelNumber} - Aprovechamiento: ${panel.efficiency.toFixed(1)}%`, 20, 20);
      
      (doc as any).autoTable({
        head: [['Pieza en Tablero', 'X (mm)', 'Y (mm)', 'Ancho (mm)', 'Alto (mm)', 'Rotada']],
        body: panel.parts.map(p => [p.name, p.x, p.y, p.width, p.height, p.rotated ? 'SÍ' : 'NO']),
        startY: 30,
        headStyles: { fillColor: [40, 40, 40] }
      });
    });

    doc.save(`planocorte-industrial-${Date.now()}.pdf`);
  };

  return (
    <div className="flex-1 w-full bg-slate-100 overflow-y-auto" ref={containerRef}>
      <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto pb-32">
        
        {/* Encabezado y Configuración */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 shadow-sm border-slate-200 bg-white">
            <CardHeader className="p-4 bg-primary text-white rounded-t-lg flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Optimización Industrial ArquiMax
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
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
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Calcular Industrial'}
                  </Button>
                  {result && (
                    <>
                      <Button variant="outline" className="font-bold text-xs h-10 border-primary text-primary" onClick={exportPDF}>
                        <FileDown className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" className="font-bold text-xs h-10" onClick={exportCSV}>
                        <FileSpreadsheet className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Listado Colapsable de Piezas */}
              <Collapsible open={isPartsListOpen} onOpenChange={setIsPartsListOpen} className="border rounded-lg overflow-hidden bg-slate-50">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex justify-between items-center px-4 py-2 hover:bg-slate-100 text-slate-600">
                    <span className="text-xs font-bold flex items-center gap-2">
                      <Ruler className="w-3.5 h-3.5" /> 
                      Gestión de Piezas y Vetas ({localCutlist.length} tipos) 
                    </span>
                    {isPartsListOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 border-t bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {localCutlist.map((part, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold text-slate-700 truncate pr-2">{part.name}</span>
                          <span className="text-[10px] font-black text-primary">x{part.quantity}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-slate-500 font-medium">{part.width}x{part.height}mm</span>
                          <Select value={part.grainDirection} onValueChange={(val) => updateGrain(idx, val as GrainDirection)}>
                            <SelectTrigger className="h-6 w-24 text-[9px] bg-white">
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
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Resumen de Eficiencia */}
          <Card className={`shadow-sm border-slate-200 bg-white flex flex-col justify-center transition-all ${result ? 'opacity-100' : 'opacity-50'}`}>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-end">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Aprovechamiento Global</Label>
                <span className="text-xl font-black text-primary">{result ? result.totalEfficiency.toFixed(1) : '0.0'}%</span>
              </div>
              <Progress value={result ? result.totalEfficiency : 0} className="h-2" />
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>TABLEROS: {result ? result.totalPanels : '-'}</span>
                <span>KERF: {result ? result.kerf : '4.5'}mm</span>
              </div>
              {result && result.totalEfficiency < 85 && (
                <div className="flex items-center gap-1 text-[8px] text-amber-600 font-bold uppercase">
                  <AlertTriangle className="w-3 h-3" /> Eficiencia bajo target (85%)
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Visualización de Resultados */}
        <div className="w-full">
          {loading ? (
            <div className="py-24 flex flex-col items-center gap-6 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-bold text-slate-700">Motor Industrial: 3000 Iteraciones en curso...</p>
                <p className="text-xs">Buscando la mejor solución de guillotina...</p>
              </div>
            </div>
          ) : error ? (
            <div className="py-16 flex flex-col items-center gap-4 text-red-500 bg-red-50 p-10 rounded-xl border border-red-100">
              <AlertTriangle className="w-12 h-12" />
              <p className="font-bold text-center">{error}</p>
              <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-100" onClick={handleOptimize}>Reintentar Cálculo</Button>
            </div>
          ) : !result ? (
            <div className="py-32 flex flex-col items-center gap-6 text-slate-200 bg-white rounded-xl border border-dashed border-slate-300">
              <LayoutGrid className="w-20 h-20 opacity-10" />
              <div className="text-center">
                <p className="font-bold text-slate-400 text-sm uppercase tracking-widest">Plano de Corte Industrial</p>
                <p className="text-xs text-slate-300">Presiona "Calcular Industrial" para iniciar el motor de 3000 ciclos</p>
              </div>
            </div>
          ) : (
            <div className="space-y-12" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              {result.optimizedLayout.map((panel, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white rounded-lg shadow-md">
                    <div className="flex flex-col">
                      <h3 className="text-xs font-black uppercase tracking-tight">Tablero #{panel.panelNumber}</h3>
                      <span className="text-[9px] opacity-70 uppercase font-bold">{selectedPanel.width}x{selectedPanel.height}mm</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold text-slate-300">PIEZAS: {panel.parts.length}</span>
                      <span className="text-[10px] font-bold text-primary-foreground bg-primary px-3 py-1 rounded-full">
                        {panel.efficiency.toFixed(1)}% Usado
                      </span>
                    </div>
                  </div>
                  
                  <div className="relative border-4 border-slate-900 bg-[#f4f1ea] shadow-2xl rounded-sm mx-auto overflow-hidden" 
                       style={{ 
                         width: '100%', 
                         aspectRatio: `${selectedPanel.width} / ${selectedPanel.height}`,
                         backgroundImage: 'radial-gradient(#00000008 1.5px, transparent 0)',
                         backgroundSize: '20px 20px'
                       }}>
                    
                    <div 
                      className="absolute border border-red-500/20 border-dashed pointer-events-none" 
                      style={{
                        top: `${(result.trim / selectedPanel.height) * 100}%`,
                        left: `${(result.trim / selectedPanel.width) * 100}%`,
                        right: `${(result.trim / selectedPanel.width) * 100}%`,
                        bottom: `${(result.trim / selectedPanel.height) * 100}%`,
                      }}
                    />
                    
                    <div className="absolute inset-0">
                      {panel.parts.map((p, pIdx) => {
                        const scaleX = 100 / selectedPanel.width;
                        const scaleY = 100 / selectedPanel.height;
                        const visualX = (p.x + result.trim) * scaleX;
                        const visualY = (p.y + result.trim) * scaleY;
                        const visualW = p.width * scaleX;
                        const visualH = p.height * scaleY;

                        return (
                          <div 
                            key={pIdx} 
                            className="absolute border border-slate-900 transition-all hover:brightness-95 flex items-center justify-center overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,0.05)] group" 
                            style={{ 
                              left: `${visualX}%`, 
                              top: `${visualY}%`, 
                              width: `${visualW}%`, 
                              height: `${visualH}%`,
                              backgroundColor: p.color || 'rgba(174, 26, 226, 0.1)'
                            }}
                            title={`${p.name}: ${p.width}x${p.height}mm`}
                          >
                            <div className="flex flex-col items-center justify-center p-0.5 text-center leading-none select-none">
                              <span className="text-[min(2vw,10px)] font-black text-slate-900">{p.width}x{p.height}</span>
                              <span className="text-[min(1.5vw,7px)] text-slate-700 uppercase truncate w-full font-bold px-1">{p.name}</span>
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
