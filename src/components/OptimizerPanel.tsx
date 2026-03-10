'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Part, AVAILABLE_PANELS, PanelSize, GrainDirection, OptimizationResult } from '@/lib/types';
import { runOptimization } from '@/optimizer/cutOptimizer';
import { generateCutListFromModel, CutlistPart } from '@/utils/cutlistGenerator';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  ZoomOut,
  Info,
  Layers,
  Maximize2,
  List,
  CheckCircle2
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
  const [isDetailedListOpen, setIsDetailedListOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [targetThickness, setTargetThickness] = useState<number>(18);

  const availableThicknesses = Array.from(new Set(parts.map(p => p.cutEspesor))).sort((a, b) => b - a);

  useEffect(() => {
    const newList = generateCutListFromModel(parts);
    setLocalCutlist(newList);
    setResult(null);
    setError(null);
    
    if (!availableThicknesses.includes(targetThickness) && availableThicknesses.length > 0) {
      setTargetThickness(availableThicknesses[0]);
    }
  }, [parts]);

  const updateGrain = (index: number, grain: GrainDirection) => {
    const updated = [...localCutlist];
    updated[index] = { ...updated[index], grainDirection: grain };
    setLocalCutlist(updated);
    setResult(null);
  };

  const handleOptimize = () => {
    const filteredParts = localCutlist.filter(p => p.thickness === targetThickness);
    
    if (filteredParts.length === 0) {
      setError(`No hay piezas de ${targetThickness}mm para optimizar.`);
      return;
    }

    setLoading(true);
    setError(null);
    
    setTimeout(() => {
      try {
        const res = runOptimization(
          localCutlist,
          selectedPanel.width,
          selectedPanel.height,
          targetThickness,
          4.5, // Kerf industrial
          10   // Trim estándar
        );

        if (res.optimizedLayout.length === 0) {
          setError("Piezas demasiado grandes para el tablero.");
        } else {
          setResult(res);
        }
      } catch (e) {
        console.error(e);
        setError("Error en el cálculo industrial v12.1.");
      } finally {
        setLoading(false);
      }
    }, 100);
  };

  const drawWatermark = (doc: jsPDF) => {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setTextColor(235, 235, 235);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(40);
      for (let y = -100; y < 500; y += 130) {
        for (let x = -100; x < 400; x += 200) {
          doc.text("RED ARQUIMAX", x, y, { angle: 45 });
        }
      }
    }
  };

  const exportPDF = async () => {
    if (!result) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const BRAND_COLOR = [174, 26, 226];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.text("RED ARQUIMAX", 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text("Plano de Optimización Industrial", 105, 28, { align: 'center' });
    
    doc.setDrawColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.setLineWidth(0.5);
    doc.line(20, 32, 190, 32);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const summaryText = `Material: MDF ${targetThickness}mm | Tablero: ${selectedPanel.name} | Aprovechamiento: ${result.totalEfficiency.toFixed(1)}%`;
    doc.text(summaryText, 20, 42);

    (doc as any).autoTable({
      head: [['Pieza', 'Ancho (mm)', 'Alto (mm)', 'Cant.', 'Veta']],
      body: localCutlist.filter(p => p.thickness === targetThickness).map(p => [p.name, p.width, p.height, p.quantity, p.grainDirection]),
      startY: 48,
      headStyles: { fillColor: BRAND_COLOR, font: 'helvetica', fontStyle: 'bold' },
      styles: { font: 'helvetica', fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 248, 248] }
    });

    drawWatermark(doc);
    doc.save(`planocorte-arquimax-${targetThickness}mm-${Date.now()}.pdf`);
  };

  return (
    <div className="flex-1 w-full bg-slate-50 overflow-y-auto">
      <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto pb-40">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm border-slate-200 bg-white">
            <CardHeader className="p-4 bg-primary text-white rounded-t-lg flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> ArquiMax Industrial v12.1
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Espesor de Material</Label>
                  <Select value={targetThickness.toString()} onValueChange={(v) => { setTargetThickness(parseInt(v)); setResult(null); }}>
                    <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
                      <Layers className="w-4 h-4 mr-2 text-slate-400" />
                      <SelectValue placeholder="Espesor" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableThicknesses.map(t => <SelectItem key={t} value={t.toString()}>{t} mm</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
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
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 font-bold uppercase text-xs h-10 bg-slate-900 hover:bg-black" onClick={handleOptimize} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Ejecutar Optimización Industrial'}
                </Button>
                {result && (
                  <Button variant="outline" className="h-10 border-primary text-primary" onClick={exportPDF}>
                    <FileDown className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <Collapsible open={isPartsListOpen} onOpenChange={setIsPartsListOpen} className="border rounded-lg overflow-hidden">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex justify-between items-center px-4 py-2 bg-slate-50 text-slate-600 rounded-none">
                    <span className="text-xs font-bold flex items-center gap-2">
                      <Ruler className="w-3.5 h-3.5" /> Editar Orientación y Vetas ({targetThickness}mm)
                    </span>
                    {isPartsListOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 bg-white border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {localCutlist.filter(p => p.thickness === targetThickness).map((part, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded border border-slate-100 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold truncate">{part.name}</span>
                          <span className="text-[10px] font-black text-primary px-1.5 py-0.5 bg-white rounded border">x{part.quantity}</span>
                        </div>
                        <Select value={part.grainDirection} onValueChange={(val) => updateGrain(localCutlist.findIndex(p => p === part), val as GrainDirection)}>
                          <SelectTrigger className="h-8 text-[9px] bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="libre">Veta: Libre / Rotar</SelectItem>
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

          <Card className={`shadow-sm border-slate-200 bg-white transition-all flex flex-col ${result ? 'opacity-100' : 'opacity-50'}`}>
            <CardHeader className="py-4 px-6 border-b">
              <CardTitle className="text-xs font-bold uppercase text-slate-500">Métricas de Producción</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-center gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">Eficiencia Total</Label>
                  <span className="text-2xl font-black text-primary">{result ? result.totalEfficiency.toFixed(1) : '0.0'}%</span>
                </div>
                <Progress value={result ? result.totalEfficiency : 0} className="h-2.5 bg-slate-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Tableros</p>
                  <p className="text-lg font-black text-slate-700">{result ? result.totalPanels : '-'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Aprovechamiento</p>
                  <p className="text-lg font-black text-slate-700">{result ? `${result.totalEfficiency.toFixed(1)}%` : '-'}</p>
                </div>
              </div>

              {result && (
                <Collapsible open={isDetailedListOpen} onOpenChange={setIsDetailedListOpen} className="mt-2 border rounded-xl bg-white overflow-hidden shadow-sm">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full flex justify-between items-center px-4 py-3 text-slate-600 hover:bg-slate-50 h-auto">
                      <div className="flex items-center gap-2">
                        <List className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-tight">Ver Listado de Colocación</span>
                      </div>
                      {isDetailedListOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-0 border-t">
                    <div className="max-h-[300px] overflow-auto custom-scrollbar">
                      <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                          <TableRow className="h-8">
                            <TableHead className="text-[9px] font-bold uppercase py-1 px-2 h-auto">Pieza</TableHead>
                            <TableHead className="text-[9px] font-bold uppercase py-1 px-2 h-auto text-right">Base</TableHead>
                            <TableHead className="text-[9px] font-bold uppercase py-1 px-2 h-auto text-right">Altura</TableHead>
                            <TableHead className="text-[9px] font-bold uppercase py-1 px-2 h-auto text-center">Rot.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.optimizedLayout.flatMap(panel => 
                            panel.parts.map((part, pIdx) => (
                              <TableRow key={`${panel.panelNumber}-${pIdx}`} className="h-7 hover:bg-slate-50">
                                <TableCell className="text-[9px] py-1 px-2 font-medium truncate max-w-[100px]">{part.name}</TableCell>
                                <TableCell className="text-[9px] py-1 px-2 text-right">{part.width}</TableCell>
                                <TableCell className="text-[9px] py-1 px-2 text-right">{part.height}</TableCell>
                                <TableCell className="text-[9px] py-1 px-2 text-center">
                                  {part.rotated ? (
                                    <Badge variant="outline" className="text-[8px] h-3 px-1 border-amber-200 text-amber-700 bg-amber-50 leading-none">SI</Badge>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="w-full">
          {loading ? (
            <div className="py-32 flex flex-col items-center gap-6 text-slate-400 bg-white rounded-2xl border-2 border-dashed">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <p className="font-black text-slate-700 uppercase text-lg">Ejecutando Simulador Industrial v12.1...</p>
            </div>
          ) : error ? (
            <div className="py-20 flex flex-col items-center gap-4 text-red-500 bg-red-50 p-10 rounded-2xl border border-red-100">
              <AlertTriangle className="w-12 h-12" />
              <p className="font-bold text-center text-lg">{error}</p>
              <Button variant="outline" onClick={() => setError(null)}>Reintentar</Button>
            </div>
          ) : !result ? (
            <div className="py-40 flex flex-col items-center gap-6 text-slate-300 bg-white rounded-2xl border-2 border-dashed">
              <LayoutGrid className="w-24 h-24 opacity-10" />
              <Button variant="secondary" onClick={handleOptimize} className="font-bold uppercase tracking-wider">Calcular Optimización Industrial</Button>
            </div>
          ) : (
            <div className="space-y-12 py-8" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              {result.optimizedLayout.map((panel, idx) => {
                const scaleX = 100 / selectedPanel.width;
                const scaleY = 100 / selectedPanel.height;
                const trimPctX = result.trim * scaleX;
                const trimPctY = result.trim * scaleY;
                const usableWidthPct = (selectedPanel.width - 2 * result.trim) * scaleX;
                const usableHeightPct = (selectedPanel.height - 2 * result.trim) * scaleY;

                return (
                  <div key={idx} className="space-y-4">
                    <div className="flex items-center justify-between px-6 py-3 bg-slate-900 text-white rounded-xl shadow-lg border-b-4 border-primary">
                      <div className="flex flex-col">
                        <h3 className="text-xs font-black uppercase">Plano de Corte Industrial #{panel.panelNumber} ({targetThickness}mm)</h3>
                        <span className="text-[10px] text-slate-400 font-bold">{selectedPanel.width}x{selectedPanel.height}mm | Kerf: {result.kerf}mm</span>
                      </div>
                      <span className="text-xs font-black text-primary">{panel.efficiency.toFixed(1)}% USO</span>
                    </div>
                    
                    <div className="relative bg-slate-200 shadow-2xl rounded-sm mx-auto overflow-hidden" 
                         style={{ width: '100%', aspectRatio: `${selectedPanel.width} / ${selectedPanel.height}` }}>
                      
                      {/* Zona de Descarte (Trim) */}
                      <div className="absolute inset-0 bg-slate-400/20 pointer-events-none z-10 border-slate-500/30" 
                           style={{ borderStyle: 'solid', borderWidth: `${trimPctY}% ${trimPctX}%` }}>
                      </div>

                      <div className="absolute bg-white" style={{ 
                        left: `${trimPctX}%`, 
                        top: `${trimPctY}%`, 
                        width: `${usableWidthPct}%`, 
                        height: `${usableHeightPct}%`,
                        backgroundImage: 'linear-gradient(rgba(0,0,0,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.02) 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                      }}>
                        {panel.parts.map((p, pIdx) => (
                          <div key={pIdx} title={`${p.name}: ${p.width}x${p.height}mm`}
                               className="absolute border border-slate-900/60 transition-all hover:brightness-90 cursor-help" 
                               style={{ 
                                 left: `${(p.x / (selectedPanel.width - 2 * result.trim)) * 100}%`, 
                                 top: `${(p.y / (selectedPanel.height - 2 * result.trim)) * 100}%`, 
                                 width: `${(p.width / (selectedPanel.width - 2 * result.trim)) * 100}%`, 
                                 height: `${(p.height / (selectedPanel.height - 2 * result.trim)) * 100}%`,
                                 backgroundColor: p.color || 'rgba(174, 26, 226, 0.15)'
                               }}>
                            <div className="relative w-full h-full overflow-hidden pointer-events-none">
                              {/* Base (Ancho) - Línea Inferior */}
                              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[min(1.8vw,10px)] font-black text-slate-900 leading-none">
                                {p.width}
                              </span>
                              {/* Altura (Alto) - Línea Izquierda */}
                              <span className="absolute left-0.5 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[min(1.8vw,10px)] font-black text-slate-900 leading-none whitespace-nowrap">
                                {p.height}
                              </span>
                              {/* Nombre - Centro */}
                              <div className="absolute inset-0 flex items-center justify-center p-1 text-center">
                                <span className="text-[min(1.4vw,9px)] text-slate-700 uppercase font-bold truncate w-full px-2">{p.name}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex gap-4 items-center px-2">
                      <Info className="w-3 h-3 text-slate-400" />
                      <p className="text-[9px] text-slate-400 italic">Optimización ArquiMax v12.1. Estándar industrial de alta densidad.</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
