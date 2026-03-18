'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Part, AVAILABLE_PANELS, PanelSize, OptimizationResult } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  LayoutGrid, 
  Ruler, 
  FileDown, 
  ZoomIn, 
  ZoomOut, 
  Cpu, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Trash2,
  Database,
  ArrowRightToLine,
  PackageCheck,
  FileCode
} from 'lucide-react';
import { Label } from '@/components/ui/label';
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
    id: 'bajo-mesada',
    name: "Bajo Mesada Estándar (1.20m)",
    parts: [
      { name: "Lateral Izquierdo", width: 720, height: 580, quantity: 1, grainDirection: 'vertical' },
      { name: "Lateral Derecho", width: 720, height: 580, quantity: 1, grainDirection: 'vertical' },
      { name: "Piso", width: 1164, height: 580, quantity: 1, grainDirection: 'horizontal' },
      { name: "Estante", width: 1163, height: 550, quantity: 1, grainDirection: 'horizontal' },
      { name: "Amarre Frontal", width: 1164, height: 100, quantity: 1, grainDirection: 'horizontal' },
      { name: "Amarre Trasero", width: 1164, height: 100, quantity: 1, grainDirection: 'horizontal' },
      { name: "Puerta", width: 597, height: 715, quantity: 2, grainDirection: 'vertical' },
    ]
  },
  {
    id: 'alacena',
    name: "Alacena Superior (0.80m)",
    parts: [
      { name: "Lateral Izq/Der", width: 600, height: 300, quantity: 2, grainDirection: 'vertical' },
      { name: "Techo/Piso", width: 764, height: 300, quantity: 2, grainDirection: 'horizontal' },
      { name: "Estante", width: 763, height: 280, quantity: 1, grainDirection: 'horizontal' },
      { name: "Puerta", width: 397, height: 595, quantity: 2, grainDirection: 'vertical' },
    ]
  },
  {
    id: 'placard-mod',
    name: "Módulo Placard (2 Cajones)",
    parts: [
      { name: "Lateral", width: 2100, height: 550, quantity: 2, grainDirection: 'vertical' },
      { name: "Techo/Piso", width: 564, height: 550, quantity: 2, grainDirection: 'horizontal' },
      { name: "Divisor", width: 564, height: 550, quantity: 1, grainDirection: 'horizontal' },
      { name: "Frente Cajón", width: 560, height: 200, quantity: 2, grainDirection: 'horizontal' },
      { name: "Lat. Cajón", width: 450, height: 140, quantity: 4, grainDirection: 'vertical' },
      { name: "Fdo/Cont. Cajón", width: 508, height: 140, quantity: 4, grainDirection: 'horizontal' },
    ]
  }
];

export function OptimizerPanel({ parts: initialParts, selectedPanel, onPanelChange }: OptimizerPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localCutlist, setLocalCutlist] = useState<any[]>([]);
  const [zoom, setZoom] = useState(1);
  const [targetThickness, setTargetThickness] = useState<number>(18);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const panelsPerPage = 6;

  // Filtrado y paginación de paneles
  const filteredPanels = AVAILABLE_PANELS.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredPanels.length / panelsPerPage);
  const currentPanels = filteredPanels.slice(currentPage * panelsPerPage, (currentPage + 1) * panelsPerPage);

  useEffect(() => {
    // La lista inicia vacía por defecto hasta que se cargue un preset o piezas manuales
    if (initialParts.length > 0) {
      const woodParts = initialParts.filter(p => !p.isHardware);
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

  const loadPreset = (presetId: string) => {
    const preset = FURNITURE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setLocalCutlist(preset.parts.map(p => ({ ...p, thickness: targetThickness })));
    setResult(null);
  };

  const handleOptimize = async () => {
    if (localCutlist.length === 0) return;
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
      if (!res.ok || data.error) throw new Error(data.error || "Error industrial");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const exportXML = () => {
    if (!result) return;
    let nodeCounter = 1;
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<project>\n`;
    
    result.optimizedLayout.forEach((panel, pIdx) => {
      const isVertical = panel.strategy === 'vertical';
      const rootL = isVertical ? selectedPanel.width : selectedPanel.height;
      const rootW = isVertical ? selectedPanel.height : selectedPanel.width;

      xml += `  <panel${pIdx + 1} l="${selectedPanel.width}" w="${selectedPanel.height}" material="${selectedPanel.name}" thickness="${selectedPanel.thickness}" saw="${result.kerf}" num="${panel.panelNumber}" strategy="${panel.strategy}">\n`;
      xml += `    <no.${nodeCounter++} l="${rootL}" w="${rootW}" trim="${result.trim}" x="0" y="0" layer="1" id="0">\n`;
      
      const uniqueStrips = Array.from(new Set(panel.parts.map(p => isVertical ? p.x : p.y))).sort((a,b) => a-b);
      uniqueStrips.forEach((stripCoord) => {
        const partsInStrip = panel.parts.filter(p => (isVertical ? p.x : p.y) === stripCoord);
        if (partsInStrip.length === 0) return;
        const stripL = isVertical ? selectedPanel.height : selectedPanel.width;
        const stripW = isVertical ? partsInStrip[0].width : partsInStrip[0].height;
        xml += `      <no.${nodeCounter++} l="${stripL}" w="${stripW}" trim="0" x="${isVertical ? stripCoord : 0}" y="${isVertical ? 0 : stripCoord}" layer="2" id="${stripCoord}">\n`;
        partsInStrip.forEach((p, idx) => {
          xml += `        <part cut="${isVertical ? p.height : p.width}" num="1" type="${p.rotated ? 2 : 1}" id="${idx+1}" code="${p.name}"/>\n`;
        });
        xml += `      </no.${nodeCounter-1}>\n`;
      });
      xml += `    </no.${nodeCounter-uniqueStrips.length-1}>\n`;
      xml += `  </panel${pIdx + 1}>\n`;
    });
    xml += `</project>`;
    const blob = new Blob([xml], { type: 'text/xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `JADSI-CNC-${Date.now()}.xml`;
    a.click();
  };

  const exportPDF = () => {
    if (!result) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const BRAND_COLOR = [13, 110, 253];
    const MARGIN = 15;

    result.optimizedLayout.forEach((panel, idx) => {
      if (idx > 0) doc.addPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
      doc.text("JADSI INDUSTRIAL", 105, 20, { align: 'center' });
      doc.setDrawColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
      doc.line(MARGIN, 25, 195, 25);

      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(`HOJA DE OPTIMIZACIÓN - PANEL #${panel.panelNumber} (${panel.strategy?.toUpperCase()})`, MARGIN, 35);
      
      const s = panel.stats;
      doc.setFontSize(8);
      doc.text(`DESPERDICIO: ${s.wastePercentage}% | m2 TOTALES: ${s.totalAreaM2} | m2 CORTADOS: ${s.usedAreaM2} | METROS: ${s.linearMeters}m`, MARGIN, 42);

      const scale = 170 / selectedPanel.width;
      const drawH = selectedPanel.height * scale;
      const startY = 50;
      doc.setDrawColor(150);
      doc.rect(MARGIN, startY, 170, drawH);

      panel.parts.forEach(p => {
        doc.setFillColor(230, 240, 255);
        doc.rect(MARGIN + p.x * scale, startY + p.y * scale, p.width * scale, p.height * scale, 'FD');
        if (p.width * scale > 10 && p.height * scale > 5) {
          doc.setFontSize(4);
          doc.setTextColor(0);
          doc.text(`${p.name}`, MARGIN + p.x * scale + 1, startY + p.y * scale + 3);
        }
      });

      const aggregated = panel.parts.reduce((acc, p) => {
        const key = `${p.name}-${Math.round(p.width)}x${Math.round(p.height)}`;
        if (!acc[key]) acc[key] = { name: p.name, w: p.width, h: p.height, qty: 0 };
        acc[key].qty++;
        return acc;
      }, {} as any);

      (doc as any).autoTable({
        startY: startY + drawH + 10,
        margin: { left: MARGIN },
        head: [['Pieza', 'Ancho', 'Alto', 'Cant.', 'Area']],
        body: Object.values(aggregated).map((p: any) => [p.name, Math.round(p.w), Math.round(p.h), p.qty, ((p.w*p.h)/1000000).toFixed(3)]),
        styles: { fontSize: 7 }
      });
    });
    doc.save(`Reporte-JADSI-${Date.now()}.pdf`);
  };

  return (
    <div className="flex-1 w-full bg-slate-50 overflow-y-auto">
      <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto pb-40">
        
        {/* Card de Selección de Paneles Paginado */}
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
          <CardHeader className="bg-slate-900 text-white p-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-widest">Catálogo Industrial Activo</CardTitle>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input 
                placeholder="Buscar material..." 
                className="h-8 pl-8 bg-white/10 border-white/20 text-xs text-white placeholder:text-slate-500 focus-visible:ring-primary"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
              />
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {currentPanels.map((panel) => (
                <button
                  key={panel.id}
                  onClick={() => onPanelChange(panel)}
                  className={`group relative flex flex-col items-start p-2 bg-white rounded-xl border-2 transition-all hover:shadow-lg ${selectedPanel.id === panel.id ? 'border-primary ring-4 ring-primary/10' : 'border-slate-100'}`}
                >
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-2 bg-slate-100 border border-slate-100">
                    <Image 
                      src={`https://optionline-prod-files.s3.amazonaws.com/textures/${panel.idEmpresa}/${panel.idTextura}.jpg`}
                      alt={panel.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      data-ai-hint="wood texture"
                      onError={(e: any) => { e.target.src = "https://placehold.co/200x200?text=SIN+TEXTURA"; }}
                    />
                    {selectedPanel.id === panel.id && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <PackageCheck className="w-8 h-8 text-white drop-shadow-md" />
                      </div>
                    )}
                  </div>
                  <div className="w-full text-left">
                    <p className="text-[9px] font-black text-slate-900 truncate uppercase leading-tight">{panel.name.replace('MDF FAPLAC ', '')}</p>
                    <p className="text-[8px] font-bold text-slate-400 mt-0.5">{panel.width}x{panel.height}mm</p>
                    <div className="mt-1 flex items-center gap-1">
                      <Badge variant="outline" className={`text-[7px] h-3.5 px-1 font-bold ${panel.hasGrain ? 'text-amber-600 border-amber-200 bg-amber-50' : 'text-slate-500 border-slate-200'}`}>
                        {panel.hasGrain ? 'VETA' : 'LISO'}
                      </Badge>
                      <span className="text-[8px] font-black text-primary">{panel.thickness}mm</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Controles de Paginación */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mostrando {currentPanels.length} de {filteredPanels.length} materiales</span>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  disabled={currentPage === 0} 
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center px-3 text-[10px] font-black text-primary">
                  PÁGINA {currentPage + 1} / {totalPages || 1}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  disabled={currentPage >= totalPages - 1} 
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm border-slate-200 bg-white">
            <CardHeader className="p-4 bg-slate-100 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase flex items-center gap-2 text-slate-600">
                <Cpu className="w-4 h-4 text-primary" /> Motor JADSI v38.0 Stock Ready
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7 bg-white" onClick={() => setZoom(z => Math.max(0.4, z - 0.1))}><ZoomOut className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" className="h-7 w-7 bg-white" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}><ZoomIn className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Espesor de Trabajo (mm)</Label>
                  <Select value={targetThickness.toString()} onValueChange={(v) => { setTargetThickness(parseInt(v)); setResult(null); }}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 5.5, 12, 15, 18, 25].map(t => (
                        <SelectItem key={t} value={t.toString()}>{t} mm</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Cargar Dataset de Muebles</Label>
                  <Select onValueChange={loadPreset}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Seleccionar mueble..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FURNITURE_PRESETS.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 font-black uppercase text-xs bg-primary text-white h-11" onClick={handleOptimize} disabled={loading || localCutlist.length === 0}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Ejecutar Optimización v38.0'}
                </Button>
                {result && (
                  <>
                    <Button variant="outline" className="border-primary text-primary h-11 px-4" onClick={exportPDF}><FileDown className="w-4 h-4" /></Button>
                    <Button variant="outline" className="border-emerald-600 text-emerald-600 h-11 px-4" onClick={exportXML}><FileCode className="w-4 h-4" /></Button>
                  </>
                )}
              </div>

              <div className="border rounded-xl p-4 bg-slate-50">
                <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 flex items-center gap-2"><Ruler className="w-3.5 h-3.5" /> Lista de Piezas ({localCutlist.length})</h4>
                <div className="space-y-2 max-h-[300px] overflow-auto">
                  {localCutlist.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic">La lista está vacía. Carga un mueble para comenzar.</div>
                  ) : (
                    localCutlist.map((part, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border">
                        <div className="col-span-4 text-[10px] font-bold truncate">{part.name}</div>
                        <div className="col-span-2 text-center text-[10px] font-mono">{part.width}</div>
                        <div className="col-span-2 text-center text-[10px] font-mono">{part.height}</div>
                        <div className="col-span-2 text-center text-[10px] font-black text-primary">x{part.quantity}</div>
                        <Button variant="ghost" size="icon" className="col-span-2 h-7 w-7 text-slate-300 hover:text-red-500" onClick={() => removePart(idx)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className={`shadow-sm border-slate-200 bg-white ${result ? 'opacity-100' : 'opacity-50'}`}>
              <CardHeader className="py-4 px-6 border-b"><CardTitle className="text-[10px] font-black uppercase text-slate-500">Aprovechamiento Global</CardTitle></CardHeader>
              <CardContent className="p-6 text-center space-y-4">
                <div className="text-4xl font-black text-primary tracking-tighter">{result ? result.totalEfficiency.toFixed(1) : '0.0'}%</div>
                <Progress value={result ? result.totalEfficiency : 0} className="h-2" />
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Paneles</p>
                    <p className="text-lg font-black text-slate-700">{result ? result.totalPanels : '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Stes Totales</p>
                    <p className="text-lg font-black text-slate-700">{result?.optimizedLayout.reduce((acc, p) => acc + (p.leftovers?.length || 0), 0) || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {result && (
          <div className="space-y-12" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
            {result.optimizedLayout.map((panel, idx) => (
              <div key={idx} className="space-y-4">
                <div className="bg-slate-900 text-white rounded-xl shadow-lg border-b-4 border-primary overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
                    <h3 className="text-xs font-black uppercase tracking-widest">Hoja de Corte #{panel.panelNumber} — {panel.strategy?.toUpperCase()}</h3>
                    <div className="text-right">
                      <div className="text-[8px] font-bold text-slate-400 uppercase">Eficiencia Real</div>
                      <div className="text-lg font-black text-primary">{panel.efficiency.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 px-6 py-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono">
                    <div>Desperdicio = {panel.stats.wastePercentage}%</div>
                    <div>m2 Totales = {panel.stats.totalAreaM2}</div>
                    <div>m2 Desp = {panel.stats.wasteAreaM2}</div>
                    <div>m2 Stes = {panel.stats.leftoverAreaM2}</div>
                    <div className="col-span-2 text-primary font-bold">Desplazamientos = {panel.stats.displacements} por cada placa ({panel.stats.linearMeters} mts)</div>
                  </div>
                </div>
                <div className="relative bg-white shadow-2xl rounded-sm mx-auto overflow-hidden border border-slate-300" 
                     style={{ width: '100%', aspectRatio: `${selectedPanel.width} / ${selectedPanel.height}` }}>
                  {panel.parts.map((p, pIdx) => (
                    <div key={pIdx} className="absolute border border-slate-900/60 shadow-sm flex flex-col justify-center items-center text-center overflow-hidden" 
                         style={{ left: `${(p.x/selectedPanel.width)*100}%`, top: `${(p.y/selectedPanel.height)*100}%`, width: `${(p.width/selectedPanel.width)*100}%`, height: `${(p.height/selectedPanel.height)*100}%`, backgroundColor: p.color || 'rgba(13, 110, 253, 0.15)' }}>
                      <span className="text-[8px] font-black">{Math.round(p.width)}x{Math.round(p.height)}</span>
                      <span className="text-[6px] truncate px-1">{p.name}</span>
                    </div>
                  ))}
                  {panel.leftovers?.map((l, lIdx) => (
                    <div key={lIdx} className="absolute border border-dashed border-emerald-400 bg-emerald-50/20 flex items-center justify-center" 
                         style={{ left: `${(l.x/selectedPanel.width)*100}%`, top: `${(l.y/selectedPanel.height)*100}%`, width: `${(l.width/selectedPanel.width)*100}%`, height: `${(l.height/selectedPanel.height)*100}%` }}>
                      <span className="text-[8px] font-bold text-emerald-600">STES {Math.round(l.width)}x{Math.round(l.height)}</span>
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
