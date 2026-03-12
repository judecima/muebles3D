
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Part, AVAILABLE_PANELS, PanelSize, GrainDirection, OptimizationResult } from '@/lib/types';
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
  List
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

  const handleOptimize = async () => {
    const filteredParts = localCutlist.filter(p => p.thickness === targetThickness);
    
    if (filteredParts.length === 0) {
      setError(`No hay piezas de ${targetThickness}mm.`);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/cutting/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parts: localCutlist,
          panelWidth: selectedPanel.width,
          panelHeight: selectedPanel.height,
          thickness: targetThickness
        })
      });
      
      const data = await res.json();

      if (data.error || data.optimizedLayout.length === 0) {
        setError(data.error || "Piezas demasiado grandes para el panel.");
      } else {
        setResult(data);
      }
    } catch (e) {
      console.error(e);
      setError("Error de conexión con el motor industrial.");
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    if (!result) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const BRAND_COLOR = [13, 110, 253];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.text("JADSI INDUSTRIAL", 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text("Plano de Optimización de Corte", 105, 28, { align: 'center' });
    
    (doc as any).autoTable({
      head: [['Pieza', 'Base (mm)', 'Altura (mm)', 'Cant.', 'Veta']],
      body: localCutlist.filter(p => p.thickness === targetThickness).map(p => [p.name, p.width, p.height, p.quantity, p.grainDirection]),
      startY: 40,
      headStyles: { fillColor: BRAND_COLOR, fontStyle: 'bold' }
    });

    doc.save(`jadsi-corte-${targetThickness}mm.pdf`);
  };

  return (
    <div className="flex-1 w-full bg-slate-50 overflow-y-auto">
      <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto pb-40">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm border-slate-200 bg-white">
            <CardHeader className="p-4 bg-primary text-white rounded-t-lg flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> JADSI Engine v12.1.1 Industrial
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white" onClick={() => setZoom(z => Math.max(0.4, z - 0.1))}><ZoomOut className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}><ZoomIn className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Espesor</Label>
                  <Select value={targetThickness.toString()} onValueChange={(v) => { setTargetThickness(parseInt(v)); setResult(null); }}>
                    <SelectTrigger className="bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableThicknesses.map(t => <SelectItem key={t} value={t.toString()}>{t} mm</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Tablero</Label>
                  <Select value={selectedPanel.id} onValueChange={(id) => onPanelChange(AVAILABLE_PANELS.find(p => p.id === id)!)}>
                    <SelectTrigger className="bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_PANELS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 font-bold uppercase text-xs bg-slate-900 hover:bg-black" onClick={handleOptimize} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Optimizar'}
                </Button>
                {result && <Button variant="outline" className="border-primary text-primary" onClick={exportPDF}><FileDown className="w-4 h-4" /></Button>}
              </div>

              <Collapsible open={isPartsListOpen} onOpenChange={setIsPartsListOpen} className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex justify-between px-4 py-2 bg-slate-50 text-slate-600">
                    <span className="text-xs font-bold flex items-center gap-2"><Ruler className="w-3.5 h-3.5" /> Editar Orientación</span>
                    {isPartsListOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 bg-white border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {localCutlist.filter(p => p.thickness === targetThickness).map((part, idx) => (
                      <div key={idx} className="p-2 bg-slate-50 rounded border flex flex-col gap-1">
                        <span className="text-[9px] font-bold truncate">{part.name} (x{part.quantity})</span>
                        <Select value={part.grainDirection} onValueChange={(val) => updateGrain(localCutlist.findIndex(p => p === part), val as GrainDirection)}>
                          <SelectTrigger className="h-7 text-[9px] bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="libre">Libre</SelectItem>
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

          <Card className={`shadow-sm border-slate-200 bg-white flex flex-col ${result ? 'opacity-100' : 'opacity-50'}`}>
            <CardHeader className="py-4 px-6 border-b">
              <CardTitle className="text-[10px] font-black uppercase text-slate-500">Métricas de Producción</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-center gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">Eficiencia</Label>
                  <span className="text-2xl font-black text-primary">{result ? result.totalEfficiency.toFixed(1) : '0.0'}%</span>
                </div>
                <Progress value={result ? result.totalEfficiency : 0} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-lg border text-center">
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Paneles</p>
                  <p className="text-lg font-black text-slate-700">{result ? result.totalPanels : '-'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border text-center">
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Kerf</p>
                  <p className="text-lg font-black text-slate-700">4.5mm</p>
                </div>
              </div>

              {result && (
                <Collapsible open={isDetailedListOpen} onOpenChange={setIsDetailedListOpen} className="mt-2 border rounded-xl overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full flex justify-between px-4 py-3 text-slate-600 hover:bg-slate-50">
                      <div className="flex items-center gap-2"><List className="w-4 h-4 text-primary" /><span className="text-[10px] font-bold uppercase">Listado de Colocación</span></div>
                      {isDetailedListOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-0 border-t">
                    <div className="max-h-[300px] overflow-auto">
                      <Table>
                        <TableHeader className="bg-slate-50 sticky top-0">
                          <TableRow className="h-7">
                            <TableHead className="text-[9px] py-1 px-2">Pieza</TableHead>
                            <TableHead className="text-[9px] py-1 px-2 text-right">Base</TableHead>
                            <TableHead className="text-[9px] py-1 px-2 text-right">Altura</TableHead>
                            <TableHead className="text-[9px] py-1 px-2 text-center">Rot.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.optimizedLayout.flatMap(panel => 
                            panel.parts.map((p, i) => (
                              <TableRow key={`${panel.panelNumber}-${i}`} className="h-7">
                                <TableCell className="text-[9px] py-1 px-2 font-medium truncate max-w-[100px]">{p.name}</TableCell>
                                <TableCell className="text-[9px] py-1 px-2 text-right">{p.width}</TableCell>
                                <TableCell className="text-[9px] py-1 px-2 text-right">{p.height}</TableCell>
                                <TableCell className="text-[9px] py-1 px-2 text-center">{p.rotated ? <Badge variant="outline" className="text-[7px] h-3 px-1">SÍ</Badge> : '-'}</TableCell>
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
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="py-32 flex flex-col items-center gap-6 text-slate-400 bg-white rounded-2xl border-2 border-dashed">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <p className="font-black text-slate-700 uppercase">Procesando JADSI Engine...</p>
            </div>
          ) : !result ? (
            <div className="py-40 flex flex-col items-center gap-6 text-slate-300 bg-white rounded-2xl border-2 border-dashed">
              <LayoutGrid className="w-24 h-24 opacity-10" />
              <Button variant="secondary" onClick={handleOptimize} className="font-bold uppercase">Calcular Optimización Industrial</Button>
            </div>
          ) : (
            <div className="space-y-12 py-8" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              {result.optimizedLayout.map((panel, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="flex items-center justify-between px-6 py-3 bg-slate-900 text-white rounded-xl shadow-lg border-b-4 border-primary">
                    <h3 className="text-xs font-black uppercase">Plano #{panel.panelNumber} ({targetThickness}mm) - {selectedPanel.width}x{selectedPanel.height}mm</h3>
                    <span className="text-xs font-black text-primary">{panel.efficiency.toFixed(1)}% USO</span>
                  </div>
                  
                  <div className="relative bg-slate-200 shadow-2xl rounded-sm mx-auto overflow-hidden" 
                       style={{ width: '100%', aspectRatio: `${selectedPanel.width} / ${selectedPanel.height}` }}>
                    
                    <div className="absolute inset-0 bg-slate-400/20 pointer-events-none z-10" 
                         style={{ 
                           borderStyle: 'solid', 
                           borderWidth: `${(result.trim / selectedPanel.height) * 100}% ${(result.trim / selectedPanel.width) * 100}%` 
                         }}>
                    </div>

                    <div className="absolute bg-white" style={{ 
                      left: `${(result.trim / selectedPanel.width) * 100}%`, 
                      top: `${(result.trim / selectedPanel.height) * 100}%`, 
                      width: `${((selectedPanel.width - 2 * result.trim) / selectedPanel.width) * 100}%`, 
                      height: `${((selectedPanel.height - 2 * result.trim) / selectedPanel.height) * 100}%`,
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
                               backgroundColor: p.color || 'rgba(13, 110, 253, 0.15)'
                             }}>
                          <div className="relative w-full h-full overflow-hidden pointer-events-none">
                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[min(1.8vw,10px)] font-black text-slate-900 leading-none">{p.width}</span>
                            <span className="absolute left-0.5 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[min(1.8vw,10px)] font-black text-slate-900 leading-none whitespace-nowrap">{p.height}</span>
                            <div className="absolute inset-0 flex items-center justify-center p-1 text-center"><span className="text-[min(1.4vw,9px)] text-slate-700 uppercase font-bold truncate w-full px-2">{p.name}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4 items-center px-2">
                    <Info className="w-3 h-3 text-slate-400" />
                    <p className="text-[9px] text-slate-400 italic">Cálculo por JADSI Industrial v12.1.1.</p>
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
