'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Part, AVAILABLE_PANELS, PanelSize, GrainDirection, OptimizationResult } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
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
  List,
  Cpu,
  Plus
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

export function OptimizerPanel({ parts: initialParts, selectedPanel, onPanelChange }: OptimizerPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localCutlist, setLocalCutlist] = useState<any[]>([]);
  const [isPartsListOpen, setIsPartsListOpen] = useState(true);
  const [isDetailedListOpen, setIsDetailedListOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [targetThickness, setTargetThickness] = useState<number>(18);

  useEffect(() => {
    // Agrupar piezas si vienen de un mueble, o mantener las actuales
    const woodParts = initialParts.filter(p => !p.isHardware);
    if (woodParts.length > 0) {
      const aggregated = woodParts.reduce((acc, part) => {
        const l = Math.round(part.cutLargo);
        const a = Math.round(part.cutAncho);
        const e = Math.round(part.cutEspesor);
        const key = `${part.name}-${l}-${a}-${e}-${part.grainDirection}`;
        if (!acc[key]) {
          acc[key] = { name: part.name, width: l, height: a, quantity: 0, grainDirection: part.grainDirection, thickness: e };
        }
        acc[key].quantity += 1;
        return acc;
      }, {} as Record<string, any>);
      setLocalCutlist(Object.values(aggregated));
    } else if (localCutlist.length === 0) {
      // Ejemplo inicial si no hay piezas
      setLocalCutlist([
        { name: "Lateral Izquierdo", width: 720, height: 560, quantity: 4, grainDirection: 'vertical', thickness: 18 },
        { name: "Piso/Techo", width: 1164, height: 560, quantity: 2, grainDirection: 'horizontal', thickness: 18 },
        { name: "Estante", width: 1162, height: 500, quantity: 1, grainDirection: 'horizontal', thickness: 18 }
      ]);
    }
  }, [initialParts]);

  const availableThicknesses = Array.from(new Set(localCutlist.map(p => p.thickness))).sort((a, b) => b - a);
  const safeThickness = availableThicknesses.length > 0 ? (availableThicknesses.includes(targetThickness) ? targetThickness : availableThicknesses[0]) : 18;

  const updatePart = (index: number, field: string, value: any) => {
    const updated = [...localCutlist];
    updated[index] = { ...updated[index], [field]: value };
    setLocalCutlist(updated);
    setResult(null);
  };

  const addManualPart = () => {
    setLocalCutlist([...localCutlist, { name: "Nueva Pieza", width: 500, height: 300, quantity: 1, grainDirection: 'libre', thickness: 18 }]);
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
          width: selectedPanel.width,
          height: selectedPanel.height,
          thickness: targetThickness,
          kerf: 4.5,
          trim: 10
        })
      });
      const data = await res.json();
      if (data.optimizedLayout.length === 0) {
        setError("Piezas demasiado grandes para el panel.");
      } else {
        setResult(data);
      }
    } catch (e) {
      console.error(e);
      setError("Error en cálculo industrial.");
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
    doc.text("JADSI", 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text("Plano de Optimización de Corte", 105, 28, { align: 'center' });
    
    (doc as any).autoTable({
      head: [['Pieza', 'Base (mm)', 'Altura (mm)', 'Cant.', 'Veta']],
      body: localCutlist.filter(p => p.thickness === targetThickness).map(p => [p.name, p.width, p.height, p.quantity, p.grainDirection]),
      startY: 40,
      headStyles: { fillColor: BRAND_COLOR, fontStyle: 'bold' }
    });

    doc.save(`jadsi-optimizacion-${targetThickness}mm.pdf`);
  };

  return (
    <div className="flex-1 w-full bg-slate-50 overflow-y-auto">
      <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto pb-40">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm border-slate-200 bg-white">
            <CardHeader className="p-4 bg-slate-900 text-white rounded-t-lg flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" /> JADSI NESTING ENGINE v12.1
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white" onClick={() => setZoom(z => Math.max(0.4, z - 0.1))}><ZoomOut className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}><ZoomIn className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Espesor del Material</Label>
                  <Select value={targetThickness.toString()} onValueChange={(v) => { setTargetThickness(parseInt(v)); setResult(null); }}>
                    <SelectTrigger className="bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 12, 15, 18, 25].map(t => <SelectItem key={t} value={t.toString()}>{t} mm</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Dimensiones de Tablero</Label>
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
                <Button className="flex-1 font-black uppercase text-xs bg-primary hover:bg-primary/90 text-white h-11" onClick={handleOptimize} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Ejecutar Optimización Industrial'}
                </Button>
                {result && <Button variant="outline" className="border-primary text-primary h-11 px-4" onClick={exportPDF}><FileDown className="w-4 h-4" /></Button>}
              </div>

              <Collapsible open={isPartsListOpen} onOpenChange={setIsPartsListOpen} className="border rounded-xl overflow-hidden shadow-inner">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex justify-between px-4 py-3 bg-slate-50 text-slate-600 hover:bg-slate-100">
                    <span className="text-xs font-black flex items-center gap-2 uppercase tracking-tighter"><Ruler className="w-3.5 h-3.5" /> Listado de Piezas ({localCutlist.length})</span>
                    {isPartsListOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 bg-white border-t">
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2 text-[9px] font-black uppercase text-slate-400 px-2">
                      <div className="col-span-4">Nombre</div>
                      <div className="col-span-2 text-center">Largo</div>
                      <div className="col-span-2 text-center">Ancho</div>
                      <div className="col-span-2 text-center">Cant</div>
                      <div className="col-span-2 text-center">Veta</div>
                    </div>
                    {localCutlist.map((part, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg border">
                        <div className="col-span-4"><input className="w-full bg-transparent font-bold text-[10px] focus:outline-none" value={part.name} onChange={(e) => updatePart(idx, 'name', e.target.value)} /></div>
                        <div className="col-span-2"><input type="number" className="w-full bg-white border rounded px-1 text-center font-mono text-[10px]" value={part.width} onChange={(e) => updatePart(idx, 'width', parseInt(e.target.value))} /></div>
                        <div className="col-span-2"><input type="number" className="w-full bg-white border rounded px-1 text-center font-mono text-[10px]" value={part.height} onChange={(e) => updatePart(idx, 'height', parseInt(e.target.value))} /></div>
                        <div className="col-span-2"><input type="number" className="w-full bg-white border rounded px-1 text-center font-bold text-[10px] text-primary" value={part.quantity} onChange={(e) => updatePart(idx, 'quantity', parseInt(e.target.value))} /></div>
                        <div className="col-span-2">
                          <select className="w-full bg-white border rounded text-[9px] font-bold" value={part.grainDirection} onChange={(e) => updatePart(idx, 'grainDirection', e.target.value)}>
                            <option value="libre">Libre</option>
                            <option value="vertical">Veta L</option>
                            <option value="horizontal">Veta A</option>
                          </select>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full mt-2 border-dashed border-2 font-bold uppercase text-[9px]" onClick={addManualPart}>
                      <Plus className="w-3 h-3 mr-2" /> Agregar Pieza Manualmente
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className={`shadow-sm border-slate-200 bg-white flex flex-col ${result ? 'opacity-100' : 'opacity-50'}`}>
              <CardHeader className="py-4 px-6 border-b">
                <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Eficiencia Global JADSI</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col justify-center gap-4">
                <div className="space-y-2 text-center">
                  <div className="text-4xl font-black text-primary tracking-tighter">{result ? result.totalEfficiency.toFixed(1) : '0.0'}%</div>
                  <Progress value={result ? result.totalEfficiency : 0} className="h-2" />
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Aprovechamiento del Tablero</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="p-3 bg-slate-50 rounded-lg border text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Paneles</p>
                    <p className="text-lg font-black text-slate-700">{result ? result.totalPanels : '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Hoja Kerf</p>
                    <p className="text-lg font-black text-slate-700">4.5mm</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {result && (
              <Card className="shadow-sm border-slate-200 bg-white">
                <Collapsible open={isDetailedListOpen} onOpenChange={setIsDetailedListOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full flex justify-between px-4 py-4 text-slate-600 hover:bg-slate-50">
                      <div className="flex items-center gap-2"><List className="w-4 h-4 text-primary" /><span className="text-[10px] font-black uppercase">Coordenadas de Montaje</span></div>
                      {isDetailedListOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-0 border-t">
                    <div className="max-h-[400px] overflow-auto">
                      <Table>
                        <TableHeader className="bg-slate-50 sticky top-0">
                          <TableRow className="h-7">
                            <TableHead className="text-[9px] py-1 px-2 font-black">Pieza</TableHead>
                            <TableHead className="text-[9px] py-1 px-2 text-right font-black">Pos X</TableHead>
                            <TableHead className="text-[9px] py-1 px-2 text-right font-black">Pos Y</TableHead>
                            <TableHead className="text-[9px] py-1 px-2 text-center font-black">Rot</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.optimizedLayout.flatMap(panel => 
                            panel.parts.map((p, i) => (
                              <TableRow key={`${panel.panelNumber}-${i}`} className="h-7 hover:bg-blue-50 transition-colors">
                                <TableCell className="text-[9px] py-1 px-2 font-medium truncate max-w-[100px]">{p.name}</TableCell>
                                <TableCell className="text-[9px] py-1 px-2 text-right font-mono">{Math.round(p.x)}</TableCell>
                                <TableCell className="text-[9px] py-1 px-2 text-right font-mono">{Math.round(p.y)}</TableCell>
                                <TableCell className="text-[9px] py-1 px-2 text-center">{p.rotated ? <Badge className="text-[7px] h-3 px-1 bg-primary">SÍ</Badge> : '-'}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}
          </div>
        </div>

        <div className="w-full">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-3 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
              <p className="text-sm font-bold uppercase tracking-tighter">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="py-32 flex flex-col items-center gap-6 text-slate-400 bg-white rounded-2xl border-2 border-dashed mx-4">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <p className="font-black text-slate-700 uppercase tracking-widest">Calculando Algoritmo JADSI Nesting...</p>
            </div>
          ) : !result ? (
            <div className="py-40 flex flex-col items-center gap-6 text-slate-300 bg-white rounded-2xl border-2 border-dashed mx-4">
              <LayoutGrid className="w-24 h-24 opacity-10" />
              <Button variant="secondary" onClick={handleOptimize} className="font-black uppercase tracking-widest text-xs h-12 px-8">Iniciar Cálculo de Optimización</Button>
            </div>
          ) : (
            <div className="space-y-12 py-8 px-4" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              {result.optimizedLayout.map((panel, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="flex items-center justify-between px-6 py-3 bg-slate-900 text-white rounded-xl shadow-lg border-b-4 border-primary">
                    <h3 className="text-xs font-black uppercase tracking-widest">Hoja de Corte #{panel.panelNumber} — Espesor: {targetThickness}mm — {selectedPanel.width}x{selectedPanel.height}mm</h3>
                    <span className="text-xs font-black text-primary">{panel.efficiency.toFixed(1)}% USO</span>
                  </div>
                  
                  <div className="relative bg-white shadow-2xl rounded-sm mx-auto overflow-hidden border border-slate-300" 
                       style={{ width: '100%', aspectRatio: `${selectedPanel.width} / ${selectedPanel.height}` }}>
                    
                    {/* Área Útil de Trabajo (Considerando Trim) */}
                    <div className="absolute bg-slate-50" style={{ 
                      left: `${(result.trim / selectedPanel.width) * 100}%`, 
                      top: `${(result.trim / selectedPanel.height) * 100}%`, 
                      width: `${((selectedPanel.width - 2 * result.trim) / selectedPanel.width) * 100}%`, 
                      height: `${((selectedPanel.height - 2 * result.trim) / selectedPanel.height) * 100}%`,
                      backgroundImage: 'linear-gradient(rgba(0,0,0,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.05) 1px, transparent 1px)',
                      backgroundSize: '50px 50px'
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
                          <div className="relative w-full h-full overflow-hidden pointer-events-none p-1 flex flex-col justify-center items-center">
                            <span className="text-[min(1.8vw,10px)] font-black text-slate-900 leading-none whitespace-nowrap">{Math.round(p.width)} x {Math.round(p.height)}</span>
                            <div className="mt-1 text-center"><span className="text-[min(1.4vw,8px)] text-slate-600 uppercase font-black truncate block w-full px-1">{p.name}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4 items-center px-2">
                    <Info className="w-3 h-3 text-slate-400" />
                    <p className="text-[9px] text-slate-400 font-bold uppercase italic tracking-wider">Algoritmo JADSI v12.1: Nesting de 3 etapas con compactación perimetral activa.</p>
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