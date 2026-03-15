'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Part, AVAILABLE_PANELS, PanelSize, OptimizationResult } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  LayoutGrid, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Ruler, 
  FileDown, 
  ZoomIn, 
  ZoomOut, 
  Info, 
  List, 
  Cpu, 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Maximize,
  Trash2,
  Database,
  RotateCcw,
  ArrowDownToLine,
  ArrowRightToLine,
  PackageCheck
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Image from 'next/image';

interface OptimizerPanelProps {
  parts: Part[];
  selectedPanel: PanelSize;
  onPanelChange: (panel: PanelSize) => void;
}

const FURNITURE_PRESETS = [
  {
    id: 'test-dataset',
    name: "Valores de Prueba (73 Piezas)",
    parts: [
      { name: "(1) Lateral Izq/Der", width: 629, height: 570, quantity: 4, grainDirection: 'vertical' },
      { name: "(2) Lateral V2 Prefo", width: 610, height: 570, quantity: 4, grainDirection: 'vertical' },
      { name: "(3) Frente Cajon", width: 500, height: 178, quantity: 6, grainDirection: 'vertical' },
      { name: "(4) Piso/Techo", width: 582, height: 500, quantity: 2, grainDirection: 'vertical' },
      { name: "(5) Piso/Techo", width: 562, height: 500, quantity: 1, grainDirection: 'vertical' },
      { name: "(6) Amarre", width: 582, height: 150, quantity: 4, grainDirection: 'vertical' },
      { name: "(8) Amarre(8)", width: 562, height: 150, quantity: 2, grainDirection: 'vertical' },
      { name: "(15) Divisor V-Caj Cent2", width: 578, height: 470, quantity: 1, grainDirection: 'vertical' },
      { name: "Pieza 622x245", width: 622, height: 245, quantity: 2, grainDirection: 'vertical' },
      { name: "Pieza 602x245", width: 602, height: 245, quantity: 1, grainDirection: 'vertical' },
      { name: "Pieza 70x482", width: 70, height: 482, quantity: 6, grainDirection: 'vertical' },
      { name: "Pieza 470x490", width: 470, height: 490, quantity: 2, grainDirection: 'vertical' },
      { name: "Pieza 495x490", width: 495, height: 490, quantity: 1, grainDirection: 'vertical' },
      { name: "Pieza 577x453", width: 577, height: 453, quantity: 1, grainDirection: 'vertical' },
      { name: "Pieza 578x470", width: 578, height: 470, quantity: 2, grainDirection: 'vertical' },
      { name: "Pieza 234x606", width: 234, height: 606, quantity: 1, grainDirection: 'vertical' },
      { name: "Pieza 248x606", width: 248, height: 606, quantity: 1, grainDirection: 'vertical' },
      { name: "Pieza 100x490", width: 100, height: 490, quantity: 1, grainDirection: 'vertical' },
      { name: "Pieza 530x400", width: 530, height: 400, quantity: 2, grainDirection: 'vertical' },
      { name: "Pieza 145x400", width: 145, height: 400, quantity: 2, grainDirection: 'vertical' },
      { name: "Pieza 530x117", width: 530, height: 117, quantity: 1, grainDirection: 'vertical' },
      { name: "(22) Contrafrente v1 v2 caj", width: 382, height: 117, quantity: 2, grainDirection: 'vertical' },
      { name: "Pieza 193x117", width: 193, height: 117, quantity: 1, grainDirection: 'vertical' },
      { name: "(24) Taco Pieza 2", width: 177, height: 117, quantity: 1, grainDirection: 'vertical' },
      { name: "Pieza 124x117", width: 124, height: 117, quantity: 1, grainDirection: 'vertical' },
      { name: "Pieza 400x128", width: 400, height: 128, quantity: 2, grainDirection: 'vertical' },
      { name: "Pieza 530x100", width: 530, height: 100, quantity: 1, grainDirection: 'vertical' },
      { name: "Pieza 250x100", width: 250, height: 100, quantity: 1, grainDirection: 'vertical' },
      { name: "Pieza 315x100", width: 315, height: 100, quantity: 1, grainDirection: 'vertical' },
      { name: "Pieza 382x100", width: 382, height: 100, quantity: 1, grainDirection: 'vertical' },
      { name: "Pieza 197x100", width: 197, height: 100, quantity: 1, grainDirection: 'vertical' }
    ]
  }
];

export function OptimizerPanel({ parts: initialParts, selectedPanel, onPanelChange }: OptimizerPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localCutlist, setLocalCutlist] = useState<any[]>([]);
  const [isPartsListOpen, setIsPartsListOpen] = useState(true);
  const [isDetailedListOpen, setIsDetailedListOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [targetThickness, setTargetThickness] = useState<number>(18);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
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
      loadPreset('test-dataset');
    }
  }, [initialParts]);

  const updatePart = (index: number, field: string, value: any) => {
    const updated = [...localCutlist];
    updated[index] = { ...updated[index], [field]: value };
    setLocalCutlist(updated);
    setResult(null);
  };

  const removePart = (index: number) => {
    setLocalCutlist(localCutlist.filter((_, i) => i !== index));
    setResult(null);
  };

  const addManualPart = () => {
    setLocalCutlist([...localCutlist, { name: "Nueva Pieza", width: 500, height: 300, quantity: 1, grainDirection: 'vertical', thickness: targetThickness }]);
  };

  const loadPreset = (presetId: string) => {
    const preset = FURNITURE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    
    const newParts = preset.parts.map(p => ({
      ...p,
      thickness: targetThickness
    }));
    
    setLocalCutlist(newParts);
    setResult(null);
  };

  const clearAllParts = () => {
    setLocalCutlist([]);
    setResult(null);
  };

  const handleOptimize = async () => {
    const filteredParts = localCutlist.filter(p => p.thickness === targetThickness);
    if (filteredParts.length === 0) {
      setError(`No hay piezas de ${targetThickness}mm en la lista.`);
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
          hasGrain: selectedPanel.hasGrain,
          kerf: 4.5,
          trim: 10
        })
      });
      const data = await res.json();
      if (!res.ok || !data || data.error) {
        setError(data?.error || "Error en el cálculo industrial.");
      } else {
        setResult(data);
      }
    } catch (e) {
      setError("Error de comunicación con el motor.");
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
      body: localCutlist.filter(p => p.thickness === targetThickness).map(p => [p.name, p.width, p.height, p.quantity, p.grainDirection === 'libre' ? 'Rotación Libre' : 'Respetar Veta']),
      startY: 40,
      headStyles: { fillColor: BRAND_COLOR, fontStyle: 'bold' }
    });
    doc.save(`jadsi-optimizacion-${targetThickness}mm.pdf`);
  };

  const filteredPanels = AVAILABLE_PANELS.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.ceil(filteredPanels.length / ITEMS_PER_PAGE);
  const paginatedPanels = filteredPanels.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePanelSelect = (panel: PanelSize) => {
    onPanelChange(panel);
    setTargetThickness(panel.thickness);
    setResult(null);
    setIsModalOpen(false);
  };

  return (
    <div className="flex-1 w-full bg-slate-50 overflow-y-auto">
      <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto pb-40">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm border-slate-200 bg-white">
            <CardHeader className="p-4 bg-slate-900 text-white rounded-t-lg flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" /> JADSI INDUSTRIAL v26.0
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white" onClick={() => setZoom(z => Math.max(0.4, z - 0.1))}><ZoomOut className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}><ZoomIn className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Material Industrial</Label>
                  <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full justify-between h-14 bg-slate-50 border-slate-200 group hover:border-primary transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded border overflow-hidden relative bg-white">
                            {selectedPanel.idTextura !== -1 && (
                              <Image 
                                src={`https://optionline-prod-files.s3.amazonaws.com/${selectedPanel.idEmpresa}-${selectedPanel.idTextura}-thumbnail.jpg`}
                                alt="Material"
                                fill
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div className="text-left">
                            <div className="text-[10px] font-black text-primary uppercase">{selectedPanel.name}</div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase">{selectedPanel.width}x{selectedPanel.height}mm — {selectedPanel.thickness}mm</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {selectedPanel.hasGrain ? (
                            <Badge variant="outline" className="text-[7px] font-black uppercase text-amber-600 border-amber-200 bg-amber-50">Con Veta</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[7px] font-black uppercase text-blue-600 border-blue-200 bg-blue-50">Liso</Badge>
                          )}
                          <Maximize className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary" />
                        </div>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
                      <DialogHeader className="p-6 bg-slate-900 text-white shrink-0">
                        <DialogTitle className="flex items-center gap-2 uppercase tracking-tighter font-black">
                          <LayoutGrid className="w-5 h-5 text-primary" /> Catálogo de Materiales
                        </DialogTitle>
                        <div className="relative mt-4">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input 
                            placeholder="Buscar material..." 
                            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                          />
                        </div>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {paginatedPanels.map((panel) => (
                            <Card 
                              key={panel.id} 
                              className={`cursor-pointer transition-all hover:shadow-lg border-2 ${selectedPanel.id === panel.id ? 'border-primary shadow-primary/10' : 'border-transparent'}`}
                              onClick={() => handlePanelSelect(panel)}
                            >
                              <div className="aspect-[4/3] relative bg-white border-b overflow-hidden">
                                {panel.idTextura !== -1 ? (
                                  <Image 
                                    src={`https://optionline-prod-files.s3.amazonaws.com/${panel.idEmpresa}-${panel.idTextura}-thumbnail.jpg`}
                                    alt={panel.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-300">
                                    <Ruler className="w-8 h-8" />
                                  </div>
                                )}
                                <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                                  <div className="bg-slate-900/80 text-white px-2 py-1 rounded text-[8px] font-black uppercase">
                                    {panel.thickness} mm
                                  </div>
                                  {panel.hasGrain ? (
                                    <Badge className="text-[7px] bg-amber-500 hover:bg-amber-500 font-black uppercase">Veta</Badge>
                                  ) : (
                                    <Badge className="text-[7px] bg-blue-500 hover:bg-blue-500 font-black uppercase">Liso</Badge>
                                  )}
                                </div>
                              </div>
                              <CardContent className="p-3">
                                <h4 className="text-[9px] font-black text-slate-800 uppercase leading-tight line-clamp-2 h-6">{panel.name}</h4>
                                <p className="text-[8px] text-slate-400 mt-1 font-bold uppercase">{panel.width}x{panel.height}mm</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 bg-white border-t flex items-center justify-between shrink-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Página {currentPage} de {totalPages}</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Cargar Modelo Predefinido</Label>
                  <Select onValueChange={loadPreset}>
                    <SelectTrigger className="h-14 bg-slate-50 border-slate-200">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-primary" />
                        <SelectValue placeholder="Seleccionar mueble..." />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {FURNITURE_PRESETS.map(preset => (
                        <SelectItem key={preset.id} value={preset.id}>{preset.name}</SelectItem>
                      ))}
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

              <Collapsible open={isPartsListOpen} onOpenChange={setIsPartsListOpen} className="border rounded-xl overflow-hidden">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex justify-between px-4 py-3 bg-slate-50 text-slate-600">
                    <span className="text-xs font-black flex items-center gap-2 uppercase"><Ruler className="w-3.5 h-3.5" /> Piezas a Cortar ({localCutlist.length})</span>
                    {isPartsListOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 bg-white border-t">
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2 px-2 mb-1">
                      <span className="col-span-3 text-[8px] font-bold text-slate-400 uppercase">Nombre</span>
                      <span className="col-span-2 text-[8px] font-bold text-slate-400 uppercase text-center">Largo</span>
                      <span className="col-span-2 text-[8px] font-bold text-slate-400 uppercase text-center">Ancho</span>
                      <span className="col-span-2 text-[8px] font-bold text-slate-400 uppercase text-center">Cant.</span>
                      <span className="col-span-2 text-[8px] font-bold text-slate-400 uppercase text-center">Resp. Veta</span>
                      <span className="col-span-1"></span>
                    </div>
                    {localCutlist.map((part, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg border group hover:border-primary transition-colors">
                        <div className="col-span-3">
                          <Input 
                            className="h-8 bg-transparent font-bold text-[10px] border-none shadow-none focus-visible:ring-0 p-0" 
                            value={part.name} 
                            onChange={(e) => updatePart(idx, 'name', e.target.value)} 
                          />
                        </div>
                        <div className="col-span-2">
                          <Input 
                            type="number" 
                            className="h-8 bg-white border rounded text-center text-[10px]" 
                            value={part.width} 
                            onChange={(e) => updatePart(idx, 'width', parseInt(e.target.value) || 0)} 
                          />
                        </div>
                        <div className="col-span-2">
                          <Input 
                            type="number" 
                            className="h-8 bg-white border rounded text-center text-[10px]" 
                            value={part.height} 
                            onChange={(e) => updatePart(idx, 'height', parseInt(e.target.value) || 0)} 
                          />
                        </div>
                        <div className="col-span-2">
                          <Input 
                            type="number" 
                            className="h-8 bg-white border rounded text-center text-[10px]" 
                            value={part.quantity} 
                            onChange={(e) => updatePart(idx, 'quantity', parseInt(e.target.value) || 0)} 
                          />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <Checkbox 
                            checked={part.grainDirection !== 'libre'} 
                            onCheckedChange={(checked) => updatePart(idx, 'grainDirection', checked ? 'vertical' : 'libre')}
                            disabled={!selectedPanel.hasGrain}
                            className={!selectedPanel.hasGrain ? "opacity-20" : ""}
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50"
                            onClick={() => removePart(idx)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {!selectedPanel.hasGrain && (
                      <p className="text-[8px] text-blue-500 font-bold uppercase text-center mt-2 italic">* Material liso: rotación libre activada automáticamente (veta no aplica).</p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1 border-dashed font-bold uppercase text-[9px]" onClick={addManualPart}>
                        <Plus className="w-3 h-3 mr-2" /> Agregar Pieza
                      </Button>
                      <Button variant="ghost" size="sm" className="font-bold uppercase text-[9px] text-slate-400 hover:text-red-500" onClick={clearAllParts}>
                        <RotateCcw className="w-3 h-3 mr-2" /> Limpiar Todo
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className={`shadow-sm border-slate-200 bg-white flex flex-col ${result ? 'opacity-100' : 'opacity-50'}`}>
              <CardHeader className="py-4 px-6 border-b">
                <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Aprovechamiento Global</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col justify-center gap-4">
                <div className="space-y-2 text-center">
                  <div className="text-4xl font-black text-primary tracking-tighter">{result ? result.totalEfficiency.toFixed(1) : '0.0'}%</div>
                  <Progress value={result ? result.totalEfficiency : 0} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="p-3 bg-slate-50 rounded-lg border text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Paneles</p>
                    <p className="text-lg font-black text-slate-700">{result ? result.totalPanels : '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Sobrantes</p>
                    <p className="text-lg font-black text-slate-700">{result?.optimizedLayout.reduce((acc, p) => acc + (p.leftovers?.length || 0), 0) || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {result && (
              <div className="space-y-4">
                <Card className="shadow-sm border-slate-200 bg-white">
                  <Collapsible open={isDetailedListOpen} onOpenChange={setIsDetailedListOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full flex justify-between px-4 py-4 text-slate-600">
                        <div className="flex items-center gap-2"><List className="w-4 h-4 text-primary" /><span className="text-[10px] font-black uppercase">Detalle de Posiciones</span></div>
                        {isDetailedListOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-0 border-t">
                      <div className="max-h-[300px] overflow-auto">
                        <Table>
                          <TableHeader className="bg-slate-50 sticky top-0">
                            <TableRow className="h-7">
                              <TableHead className="text-[9px] py-1 px-2 font-black">Pieza</TableHead>
                              <TableHead className="text-[9px] py-1 px-2 text-right font-black">Ancho</TableHead>
                              <TableHead className="text-[9px] py-1 px-2 text-right font-black">Alto</TableHead>
                              <TableHead className="text-[9px] py-1 px-2 text-center font-black">Tipo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.optimizedLayout.flatMap(panel => [
                              ...panel.parts.map((p, i) => (
                                <TableRow key={`${panel.panelNumber}-p-${i}`} className="h-7">
                                  <TableCell className="text-[9px] py-1 px-2 font-medium truncate max-w-[100px]">{p.name}</TableCell>
                                  <TableCell className="text-[9px] py-1 px-2 text-right">{Math.round(p.width)}</TableCell>
                                  <TableCell className="text-[9px] py-1 px-2 text-right">{Math.round(p.height)}</TableCell>
                                  <TableCell className="text-[9px] py-1 px-2 text-center text-primary font-bold">PIEZA</TableCell>
                                </TableRow>
                              ))
                            ])}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>

                <Card className="shadow-sm border-slate-200 bg-white">
                  <Collapsible open={isStockOpen} onOpenChange={setIsStockOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full flex justify-between px-4 py-4 text-slate-600">
                        <div className="flex items-center gap-2"><PackageCheck className="w-4 h-4 text-emerald-600" /><span className="text-[10px] font-black uppercase">Inventario de Sobrantes</span></div>
                        {isStockOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-0 border-t">
                      <div className="max-h-[300px] overflow-auto">
                        <Table>
                          <TableHeader className="bg-slate-50 sticky top-0">
                            <TableRow className="h-7">
                              <TableHead className="text-[9px] py-1 px-2 font-black">ID</TableHead>
                              <TableHead className="text-[9px] py-1 px-2 text-right font-black">Base</TableHead>
                              <TableHead className="text-[9px] py-1 px-2 text-right font-black">Altura</TableHead>
                              <TableHead className="text-[9px] py-1 px-2 text-center font-black">Panel</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.optimizedLayout.flatMap(panel => 
                              (panel.leftovers || []).map((l, i) => (
                                <TableRow key={`${panel.panelNumber}-l-${i}`} className="h-7 bg-emerald-50/20">
                                  <TableCell className="text-[9px] py-1 px-2 font-black text-emerald-700">{l.name}</TableCell>
                                  <TableCell className="text-[9px] py-1 px-2 text-right font-bold">{Math.round(l.width)}</TableCell>
                                  <TableCell className="text-[9px] py-1 px-2 text-right font-bold">{Math.round(l.height)}</TableCell>
                                  <TableCell className="text-[9px] py-1 px-2 text-center text-slate-400">#{panel.panelNumber}</TableCell>
                                </TableRow>
                              ))
                            )}
                            {result.optimizedLayout.every(p => !p.leftovers || p.leftovers.length === 0) && (
                              <TableRow><TableCell colSpan={4} className="text-center py-4 text-[9px] text-slate-400 italic">No hay sobrantes reutilizables ({">"}60mm)</TableCell></TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </div>
            )}
          </div>
        </div>

        <div className="w-full">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" />
              <p className="text-sm font-bold uppercase">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="py-32 flex flex-col items-center gap-6 bg-white rounded-2xl border-2 border-dashed">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <p className="font-black text-slate-700 uppercase tracking-widest">Ejecutando Simulación JADSI DGP v26.0...</p>
            </div>
          ) : !result ? (
            <div className="py-40 flex flex-col items-center gap-6 text-slate-300 bg-white rounded-2xl border-2 border-dashed">
              <LayoutGrid className="w-24 h-24 opacity-10" />
              <Button variant="secondary" onClick={handleOptimize} className="font-black uppercase tracking-widest text-xs h-12 px-8">Iniciar Optimización</Button>
            </div>
          ) : (
            <div className="space-y-12 py-8 px-4" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              {result.optimizedLayout.map((panel, idx) => {
                const isVertical = result.summary.toLowerCase().includes('vertical');
                return (
                  <div key={idx} className="space-y-4">
                    <div className="flex items-center justify-between px-6 py-3 bg-slate-900 text-white rounded-xl shadow-lg border-b-4 border-primary">
                      <div className="flex flex-col gap-0.5">
                        <h3 className="text-xs font-black uppercase tracking-widest">Hoja de Corte #{panel.panelNumber} — {selectedPanel.width}x{selectedPanel.height}mm</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`border-primary text-primary text-[8px] font-black uppercase px-1.5 h-4 flex items-center gap-1 bg-primary/10`}>
                            {isVertical ? <ArrowDownToLine className="w-2.5 h-2.5" /> : <ArrowRightToLine className="w-2.5 h-2.5" />}
                            Primer Corte: {isVertical ? 'Vertical (Columna)' : 'Horizontal (Tira)'}
                          </Badge>
                          {selectedPanel.hasGrain && <Badge variant="outline" className="text-[8px] border-amber-500 text-amber-500 bg-amber-500/5">RESPETANDO VETA</Badge>}
                        </div>
                      </div>
                      <span className="text-xs font-black text-primary">{panel.efficiency.toFixed(1)}% USO</span>
                    </div>
                    
                    <div className="relative bg-white shadow-2xl rounded-sm mx-auto overflow-hidden border border-slate-300" 
                         style={{ width: '100%', aspectRatio: `${selectedPanel.width} / ${selectedPanel.height}` }}>
                      
                      <div className="absolute bg-slate-50" style={{ 
                        left: `${(result.trim / selectedPanel.width) * 100}%`, 
                        top: `${(result.trim / selectedPanel.height) * 100}%`, 
                        width: `${((selectedPanel.width - 2 * result.trim) / selectedPanel.width) * 100}%`, 
                        height: `${((selectedPanel.height - 2 * result.trim) / selectedPanel.height) * 100}%`,
                        backgroundImage: 'linear-gradient(rgba(0,0,0,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.05) 1px, transparent 1px)',
                        backgroundSize: '50px 50px'
                      }}>
                        {/* Renderizado de Piezas */}
                        {panel.parts.map((p, pIdx) => (
                          <div key={`p-${pIdx}`} title={`${p.name}: ${p.width}x${p.height}mm`}
                               className="absolute border border-slate-900/60 shadow-sm transition-all hover:brightness-90 flex flex-col justify-center items-center overflow-hidden" 
                               style={{ 
                                 left: `${((p.x - result.trim) / (selectedPanel.width - 2 * result.trim)) * 100}%`, 
                                 top: `${((p.y - result.trim) / (selectedPanel.height - 2 * result.trim)) * 100}%`, 
                                 width: `${(p.width / (selectedPanel.width - 2 * result.trim)) * 100}%`, 
                                 height: `${(p.height / (selectedPanel.height - 2 * result.trim)) * 100}%`,
                                 backgroundColor: p.color || 'rgba(13, 110, 253, 0.15)'
                               }}>
                            <span className="text-[min(1.8vw,10px)] font-black text-slate-900 leading-none">{Math.round(p.width)} x {Math.round(p.height)}</span>
                            <span className="text-[min(1.4vw,8px)] text-slate-600 uppercase font-bold truncate block w-full px-1 text-center mt-1">{p.name}</span>
                          </div>
                        ))}

                        {/* Renderizado de Sobrantes (S1, S2...) */}
                        {panel.leftovers?.map((l, lIdx) => (
                          <div key={`l-${lIdx}`} title={`Sobrante ${l.name}: ${l.width}x${l.height}mm`}
                               className="absolute border border-dashed border-slate-400 bg-white/90 flex flex-col justify-center items-center overflow-hidden group/stock" 
                               style={{ 
                                 left: `${((l.x - result.trim) / (selectedPanel.width - 2 * result.trim)) * 100}%`, 
                                 top: `${((l.y - result.trim) / (selectedPanel.height - 2 * result.trim)) * 100}%`, 
                                 width: `${(l.width / (selectedPanel.width - 2 * result.trim)) * 100}%`, 
                                 height: `${(l.height / (selectedPanel.height - 2 * result.trim)) * 100}%`,
                               }}>
                            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover/stock:opacity-100 transition-opacity" />
                            <span className="text-[min(1.8vw,10px)] font-black text-emerald-600 leading-none">({l.name})</span>
                            <span className="text-[min(1.2vw,7px)] text-slate-400 font-bold uppercase mt-1">{Math.round(l.width)}x{Math.round(l.height)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-4 items-center px-2">
                      <Info className="w-3 h-3 text-slate-400" />
                      <p className="text-[9px] text-slate-400 font-bold uppercase italic tracking-wider">
                        Flujo JADSI Industrial: Las líneas de guillotina {isVertical ? 'verticales' : 'horizontales'} definen los cortes primarios de seccionadora.
                      </p>
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
