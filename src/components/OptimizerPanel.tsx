
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Part, AVAILABLE_PANELS, PanelSize, OptimizationResult, OptimizedPanel, OptimizedPart } from '@/lib/types';
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
  PackageCheck,
  Scissors,
  FileCode
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
    id: 'lepton-1',
    name: "🚀 BENCHMARK: Lepton-1 (54 Piezas)",
    parts: [
      { name: "5", width: 582, height: 150, quantity: 1, grainDirection: 'libre' },
      { name: "6", width: 582, height: 150, quantity: 1, grainDirection: 'libre' },
      { name: "7", width: 582, height: 150, quantity: 1, grainDirection: 'libre' },
      { name: "8", width: 582, height: 150, quantity: 1, grainDirection: 'libre' },
      { name: "10", width: 117, height: 382, quantity: 1, grainDirection: 'libre' },
      { name: "11", width: 582, height: 500, quantity: 1, grainDirection: 'libre' },
      { name: "12", width: 582, height: 500, quantity: 1, grainDirection: 'libre' },
      { name: "13", width: 562, height: 500, quantity: 1, grainDirection: 'libre' },
      { name: "15", width: 178, height: 500, quantity: 1, grainDirection: 'libre' },
      { name: "16", width: 178, height: 500, quantity: 1, grainDirection: 'libre' },
      { name: "17", width: 470, height: 578, quantity: 1, grainDirection: 'libre' },
      { name: "18", width: 610, height: 570, quantity: 1, grainDirection: 'libre' },
      { name: "19", width: 610, height: 570, quantity: 1, grainDirection: 'libre' },
      { name: "20", width: 610, height: 570, quantity: 1, grainDirection: 'libre' },
      { name: "21", width: 610, height: 570, quantity: 1, grainDirection: 'libre' },
      { name: "24", width: 382, height: 117, quantity: 1, grainDirection: 'libre' },
      { name: "25", width: 177, height: 117, quantity: 1, grainDirection: 'libre' },
      { name: "26", width: 562, height: 150, quantity: 1, grainDirection: 'libre' },
      { name: "27", width: 629, height: 570, quantity: 1, grainDirection: 'libre' },
      { name: "28", width: 629, height: 570, quantity: 1, grainDirection: 'libre' },
      { name: "29", width: 629, height: 570, quantity: 1, grainDirection: 'libre' },
      { name: "30", width: 629, height: 570, quantity: 1, grainDirection: 'libre' },
      { name: "32", width: 562, height: 150, quantity: 1, grainDirection: 'libre' },
      { name: "38", width: 70, height: 482, quantity: 1, grainDirection: 'libre' },
      { name: "39", width: 70, height: 482, quantity: 1, grainDirection: 'libre' },
      { name: "44", width: 193, height: 117, quantity: 1, grainDirection: 'libre' },
      { name: "45", width: 124, height: 117, quantity: 1, grainDirection: 'libre' },
      { name: "46", width: 250, height: 100, quantity: 1, grainDirection: 'libre' },
      { name: "47", width: 197, height: 100, quantity: 1, grainDirection: 'libre' },
      { name: "48", width: 315, height: 100, quantity: 1, grainDirection: 'libre' },
      { name: "49", width: 382, height: 100, quantity: 1, grainDirection: 'libre' },
      { name: "50", width: 245, height: 602, quantity: 1, grainDirection: 'libre' },
      { name: "64", width: 482, height: 70, quantity: 1, grainDirection: 'libre' },
      { name: "65", width: 482, height: 70, quantity: 1, grainDirection: 'libre' },
      { name: "66", width: 482, height: 70, quantity: 1, grainDirection: 'libre' },
      { name: "67", width: 482, height: 70, quantity: 1, grainDirection: 'libre' },
      { name: "68", width: 400, height: 128, quantity: 1, grainDirection: 'libre' },
      { name: "69", width: 400, height: 128, quantity: 1, grainDirection: 'libre' },
      { name: "70", width: 400, height: 145, quantity: 1, grainDirection: 'libre' },
      { name: "71", width: 400, height: 145, quantity: 1, grainDirection: 'libre' },
      { name: "72", width: 490, height: 100, quantity: 1, grainDirection: 'libre' },
      { name: "73", width: 530, height: 100, quantity: 1, grainDirection: 'libre' },
      { name: "74", width: 530, height: 117, quantity: 1, grainDirection: 'libre' },
      { name: "75", width: 463, height: 150, quantity: 1, grainDirection: 'libre' },
      { name: "76", width: 500, height: 178, quantity: 1, grainDirection: 'libre' },
      { name: "77", width: 400, height: 530, quantity: 1, grainDirection: 'libre' },
      { name: "81", width: 500, height: 178, quantity: 1, grainDirection: 'libre' },
      { name: "82", width: 248, height: 606, quantity: 1, grainDirection: 'libre' },
      { name: "83", width: 234, height: 606, quantity: 1, grainDirection: 'libre' },
      { name: "84", width: 245, height: 622, quantity: 1, grainDirection: 'libre' },
      { name: "85", width: 245, height: 622, quantity: 1, grainDirection: 'libre' },
      { name: "86", width: 470, height: 490, quantity: 1, grainDirection: 'libre' },
      { name: "87", width: 470, height: 490, quantity: 1, grainDirection: 'libre' },
      { name: "91", width: 463, height: 150, quantity: 1, grainDirection: 'libre' }
    ]
  },
  {
    id: 'lepton-4',
    name: "🚀 BENCHMARK: Lepton-4 (81 Piezas)",
    parts: [
      { name: "P1", width: 882, height: 600, quantity: 5, grainDirection: 'libre' },
      { name: "Z1", width: 70, height: 600, quantity: 4, grainDirection: 'libre' },
      { name: "M1", width: 1518, height: 600, quantity: 1, grainDirection: 'libre' },
      { name: "M2", width: 1200, height: 600, quantity: 1, grainDirection: 'libre' },
      { name: "M3", width: 1554, height: 600, quantity: 1, grainDirection: 'libre' },
      { name: "M4", width: 1164, height: 600, quantity: 1, grainDirection: 'libre' },
      { name: "F1", width: 598, height: 880, quantity: 2, grainDirection: 'libre' },
      { name: "S1", width: 626, height: 180, quantity: 33, grainDirection: 'libre' },
      { name: "S2", width: 626, height: 100, quantity: 33, grainDirection: 'libre' }
    ]
  },
  {
    id: 'lepton-6',
    name: "🚀 BENCHMARK: Lepton-6 (72 Piezas)",
    parts: [
      { name: "P-72", width: 450, height: 100, quantity: 72, grainDirection: 'libre' }
    ]
  },
  {
    id: 'lepton-5',
    name: "🚀 BENCHMARK: Lepton-5 (Alta Densidad)",
    parts: [
      { name: "Ancla", width: 2110, height: 600, quantity: 2, grainDirection: 'libre' },
      { name: "Filler A", width: 1270, height: 600, quantity: 2, grainDirection: 'libre' },
      { name: "Filler B", width: 700, height: 600, quantity: 2, grainDirection: 'libre' }
    ]
  },
  {
    id: 'lepton-2',
    name: "🚀 BENCHMARK: Lepton-2 (28 Piezas)",
    parts: [
      { name: "P1", width: 300, height: 200, quantity: 5, grainDirection: 'libre' },
      { name: "T1", width: 60, height: 464, quantity: 4, grainDirection: 'libre' },
      { name: "M1", width: 364, height: 330, quantity: 3, grainDirection: 'libre' },
      { name: "M2", width: 345, height: 330, quantity: 2, grainDirection: 'libre' },
      { name: "L1", width: 80, height: 673, quantity: 2, grainDirection: 'libre' },
      { name: "L2", width: 647, height: 300, quantity: 1, grainDirection: 'libre' },
      { name: "L3", width: 200, height: 609, quantity: 1, grainDirection: 'libre' },
      { name: "C1", width: 70, height: 1364, quantity: 4, grainDirection: 'libre' },
      { name: "C2", width: 1400, height: 350, quantity: 2, grainDirection: 'libre' },
      { name: "C3", width: 330, height: 364, quantity: 1, grainDirection: 'libre' },
      { name: "C4", width: 323, height: 697, quantity: 2, grainDirection: 'libre' },
      { name: "C5", width: 464, height: 350, quantity: 1, grainDirection: 'libre' }
    ]
  },
  {
    id: 'lepton-3',
    name: "🚀 BENCHMARK: Lepton-3 (7 Piezas)",
    parts: [
      { name: "G1", width: 860, height: 500, quantity: 2, grainDirection: 'libre' },
      { name: "G2", width: 500, height: 1100, quantity: 2, grainDirection: 'libre' },
      { name: "G3", width: 860, height: 100, quantity: 2, grainDirection: 'libre' },
      { name: "G4", width: 900, height: 500, quantity: 1, grainDirection: 'libre' }
    ]
  },
  {
    id: 'lepton-7',
    name: "🚀 BENCHMARK: Lepton-7 (Paridad total)",
    parts: [
      { name: "Pieza A", width: 600, height: 400, quantity: 4, grainDirection: 'libre' },
      { name: "Pieza B", width: 1200, height: 300, quantity: 2, grainDirection: 'libre' },
      { name: "Pieza C", width: 800, height: 200, quantity: 3, grainDirection: 'libre' }
    ]
  },
  {
    id: 'bajo-mesada-std',
    name: "Bajo Mesada 1.20m (Estándar)",
    parts: [
      { name: "Lateral Izq/Der", width: 720, height: 580, quantity: 2, grainDirection: 'libre' },
      { name: "Piso", width: 1164, height: 580, quantity: 1, grainDirection: 'libre' },
      { name: "Estante", width: 1162, height: 550, quantity: 1, grainDirection: 'libre' },
      { name: "Amarre Frontal", width: 1164, height: 60, quantity: 1, grainDirection: 'libre' },
      { name: "Amarre Trasero", width: 1164, height: 60, quantity: 1, grainDirection: 'libre' },
      { name: "Puerta", width: 717, height: 597, quantity: 2, grainDirection: 'libre' }
    ]
  },
  {
    id: 'alacena-std',
    name: "Alacena 80cm (Estándar)",
    parts: [
      { name: "Lateral Izq/Der", width: 600, height: 300, quantity: 2, grainDirection: 'libre' },
      { name: "Techo/Piso", width: 764, height: 300, quantity: 2, grainDirection: 'libre' },
      { name: "Estante", width: 762, height: 280, quantity: 1, grainDirection: 'libre' },
      { name: "Puerta", width: 597, height: 397, quantity: 2, grainDirection: 'libre' }
    ]
  },
  {
    id: 'placard-std',
    name: "Placard Vestidor 1.80m",
    parts: [
      { name: "Lateral Largo", width: 2100, height: 600, quantity: 2, grainDirection: 'libre' },
      { name: "Piso/Techo", width: 1764, height: 600, quantity: 2, grainDirection: 'libre' },
      { name: "Divisor Central", width: 2064, height: 600, quantity: 1, grainDirection: 'libre' },
      { name: "Estante Grande", width: 873, height: 580, quantity: 4, grainDirection: 'libre' },
      { name: "Frente Cajon", width: 868, height: 200, quantity: 4, grainDirection: 'libre' }
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
          acc[key] = { name: part.name, width: l, height: a, quantity: 0, grainDirection: 'libre', thickness: e };
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

  const toggleAllGrain = (respect: boolean) => {
    const updated = localCutlist.map(p => ({
      ...p,
      grainDirection: respect ? 'vertical' : 'libre'
    }));
    setLocalCutlist(updated);
    setResult(null);
  };

  const removePart = (index: number) => {
    setLocalCutlist(localCutlist.filter((_, i) => i !== index));
    setResult(null);
  };

  const addManualPart = () => {
    setLocalCutlist([...localCutlist, { name: "Nueva Pieza", width: 500, height: 300, quantity: 1, grainDirection: 'libre', thickness: targetThickness }]);
  };

  const loadPreset = (presetId: string) => {
    const preset = FURNITURE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const newParts = preset.parts.map(p => ({ ...p, thickness: targetThickness, grainDirection: 'libre' }));
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

  const exportXML = () => {
    if (!result) return;
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<project>\n`;
    let nodeCounter = 1;
    
    result.optimizedLayout.forEach((panel, pIdx) => {
      const isVertical = panel.strategy === 'vertical';
      
      const rootL = isVertical ? selectedPanel.width : selectedPanel.height;
      const rootW = isVertical ? selectedPanel.height : selectedPanel.width;

      xml += `  <panel${pIdx + 1} l="${selectedPanel.width}" w="${selectedPanel.height}" material="${selectedPanel.name}" thickness="${selectedPanel.thickness}" saw="${result.kerf}" num="${panel.panelNumber}" strategy="${panel.strategy}">\n`;
      
      const rootNodeId = nodeCounter++;
      xml += `    <no.${rootNodeId} l="${rootL}" w="${rootW}" trim="${result.trim}" x="0" y="0" layer="1" id="0">\n`;
      
      const uniqueStrips = Array.from(new Set(panel.parts.map(p => isVertical ? p.x : p.y))).sort((a,b) => a-b);
      
      uniqueStrips.forEach((stripCoord, coordIdx) => {
        const partsInStrip = panel.parts
          .filter(p => (isVertical ? p.x : p.y) === stripCoord)
          .sort((a, b) => (isVertical ? a.y - b.y : a.x - b.x));
        
        if (partsInStrip.length === 0) return;

        const stripL = isVertical ? selectedPanel.height : selectedPanel.width;
        const stripW = isVertical ? partsInStrip[0].width : partsInStrip[0].height;
        
        const stripX = isVertical ? stripCoord : 0;
        const stripY = isVertical ? 0 : stripCoord;
        
        const stripNodeId = nodeCounter++;
        xml += `      <no.${stripNodeId} l="${stripL}" w="${stripW}" trim="0" x="${stripX}" y="${stripY}" layer="2" id="${coordIdx + 1}">\n`;
        
        partsInStrip.forEach((part, partIdx) => {
          const cutDim = isVertical ? part.height : part.width;
          xml += `        <part cut="${cutDim}" num="1" type="${part.rotated ? 2 : 1}" id="${partIdx + 1}" code="${part.name}"/>\n`;
        });
        
        xml += `      </no.${stripNodeId}>\n`;
      });
      
      xml += `    </no.${rootNodeId}>\n`;
      xml += `  </panel${pIdx + 1}>\n`;
    });
    
    xml += `</project>`;
    
    const blob = new Blob([xml], { type: 'text/xml' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jadsi-industrial-v37-${Date.now()}.xml`;
    a.click();
  };

  const exportPDF = async () => {
    if (!result) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const BRAND_COLOR = [13, 110, 253];
    const MARGIN = 15;
    const PAGE_WIDTH = 210;
    const DRAW_WIDTH = PAGE_WIDTH - (MARGIN * 2);

    result.optimizedLayout.forEach((panel, idx) => {
      if (idx > 0) doc.addPage();

      // Logo/Brand
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
      doc.text("JADSI INDUSTRIAL", PAGE_WIDTH / 2, 20, { align: 'center' });
      
      // Divider
      doc.setDrawColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, 25, PAGE_WIDTH - MARGIN, 25);

      // Panel Title
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text(`HOJA DE OPTIMIZACIÓN - PANEL #${panel.panelNumber}`, MARGIN, 35);
      
      // Material Info
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Material: ${selectedPanel.name}`, MARGIN, 42);
      doc.text(`Dimensiones: ${selectedPanel.width} x ${selectedPanel.height} mm | Espesor: ${selectedPanel.thickness}mm | Sierra: ${result.kerf}mm`, MARGIN, 47);

      // Telemetry Block
      const s = panel.stats;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(MARGIN, 52, DRAW_WIDTH, 15, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      const tel1 = `DESPERDICIO: ${s.wastePercentage.toFixed(3)}%   |   m2 TOTALES: ${s.totalAreaM2.toFixed(2)}   |   m2 PIEZAS: ${s.usedAreaM2.toFixed(2)}   |   m2 SOBRANTES: ${s.leftoverAreaM2.toFixed(2)}`;
      const tel2 = `DESPLAZAMIENTOS: ${s.displacements}   |   METROS LINEALES: ${s.linearMeters.toFixed(2)} mts   |   ESTRATEGIA: ${panel.strategy?.toUpperCase()}`;
      doc.text(tel1, MARGIN + 5, 58);
      doc.text(tel2, MARGIN + 5, 63);

      // Drawing Calculations
      const scale = DRAW_WIDTH / selectedPanel.width;
      const drawHeight = selectedPanel.height * scale;
      const startY = 75;

      // Panel Base Rectangle
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.2);
      doc.rect(MARGIN, startY, DRAW_WIDTH, drawHeight);

      // Parts Drawing
      panel.parts.forEach((p) => {
        const px = MARGIN + (p.x * scale);
        const py = startY + (p.y * scale);
        const pw = p.width * scale;
        const ph = p.height * scale;

        // Part Fill (consistent with UI)
        doc.setFillColor(230, 240, 255);
        doc.setDrawColor(30, 41, 59);
        doc.rect(px, py, pw, ph, 'FD');

        // Part dimensions/labels
        if (pw > 12 && ph > 8) {
          doc.setFontSize(pw > 25 ? 6 : 4);
          doc.setTextColor(51, 65, 85);
          const name = p.name.length > 15 ? p.name.substring(0, 12) + "..." : p.name;
          doc.text(`${name}`, px + pw/2, py + ph/2 - (ph > 10 ? 1 : 0), { align: 'center', baseline: 'middle' });
          if (ph > 10) {
            doc.setFont('helvetica', 'bold');
            doc.text(`${Math.round(p.width)}x${Math.round(p.height)}`, px + pw/2, py + ph/2 + 3, { align: 'center', baseline: 'middle' });
            doc.setFont('helvetica', 'normal');
          }
        }
      });

      // Leftovers Drawing
      panel.leftovers?.forEach(l => {
        const lx = MARGIN + (l.x * scale);
        const ly = startY + (l.y * scale);
        const lw = l.width * scale;
        const lh = l.height * scale;
        
        doc.setLineDashPattern([1, 1], 0);
        doc.setDrawColor(148, 163, 184);
        doc.rect(lx, ly, lw, lh, 'S');
        doc.setLineDashPattern([], 0);
        
        if (lw > 15 && lh > 10) {
          doc.setFontSize(5);
          doc.setTextColor(148, 163, 184);
          doc.text(`Sobrante`, lx + lw/2, ly + lh/2, { align: 'center', baseline: 'middle' });
        }
      });

      // Parts Table per Panel
      const tableStartY = startY + drawHeight + 15;
      
      const panelParts = panel.parts.filter(p => !p.isLeftover);
      const aggregated = panelParts.reduce((acc, p) => {
        const key = `${p.name}-${Math.round(p.width)}-${Math.round(p.height)}`;
        if (!acc[key]) {
          acc[key] = { 
            name: p.name, 
            w: Math.round(p.width), 
            h: Math.round(p.height), 
            qty: 0,
            area: (p.width * p.height) / 1000000 
          };
        }
        acc[key].qty++;
        return acc;
      }, {} as Record<string, any>);

      (doc as any).autoTable({
        startY: tableStartY,
        margin: { left: MARGIN, right: MARGIN },
        head: [['Ítem', 'Pieza', 'Ancho (mm)', 'Alto (mm)', 'Cant.', 'm2 Total']],
        body: Object.values(aggregated).map((p: any, i) => [
          i + 1, 
          p.name, 
          p.w, 
          p.h, 
          p.qty, 
          (p.area * p.qty).toFixed(3)
        ]),
        headStyles: { 
          fillColor: BRAND_COLOR, 
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'center' },
          5: { halign: 'right' }
        },
        styles: { fontSize: 7, cellPadding: 2 },
        theme: 'striped'
      });

      // Footer line
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`JADSI INDUSTRIAL TECHNOLOGY v37.0 - Documento generado el ${new Date().toLocaleString()}`, MARGIN, 285);
    });

    doc.save(`JADSI-Reporte-Optimización-${Date.now()}.pdf`);
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

  const allRespectGrain = localCutlist.length > 0 && localCutlist.every(p => p.grainDirection !== 'libre');

  return (
    <div className="flex-1 w-full bg-slate-50 overflow-y-auto">
      <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto pb-40">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm border-slate-200 bg-white">
            <CardHeader className="p-4 bg-slate-900 text-white rounded-t-lg flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" /> JADSI INDUSTRIAL v37.0
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
                {result && (
                  <>
                    <Button variant="outline" className="border-primary text-primary h-11 px-4" onClick={exportPDF} title="Exportar PDF Técnico"><FileDown className="w-4 h-4" /></Button>
                    <Button variant="outline" className="border-emerald-600 text-emerald-600 h-11 px-4" onClick={exportXML} title="Exportar XML Seccionadora"><FileCode className="w-4 h-4" /></Button>
                  </>
                )}
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
                      <div className="col-span-2 flex flex-col items-center justify-center gap-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase text-center">Resp. Veta</span>
                        <Checkbox 
                          checked={allRespectGrain} 
                          onCheckedChange={(checked) => toggleAllGrain(!!checked)}
                          disabled={!selectedPanel.hasGrain}
                          className={!selectedPanel.hasGrain ? "opacity-20" : ""}
                        />
                      </div>
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
                      <p className="text-[8px] text-blue-500 font-bold uppercase text-center mt-2 italic">* Material liso: rotación libre activada automáticamente.</p>
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
                              <TableHead className="text-[9px] py-1 px-2 text-right font-black">Alto</TableHead>
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
                              <TableRow><TableCell colSpan={4} className="text-center py-4 text-[9px] text-slate-400 italic">No hay sobrantes reutilizables.</TableCell></TableRow>
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
              <p className="font-black text-slate-700 uppercase tracking-widest">Ejecutando Simulación Industrial v37.0...</p>
            </div>
          ) : !result ? (
            <div className="py-40 flex flex-col items-center gap-6 text-slate-300 bg-white rounded-2xl border-2 border-dashed">
              <LayoutGrid className="w-24 h-24 opacity-10" />
              <Button variant="secondary" onClick={handleOptimize} className="font-black uppercase tracking-widest text-xs h-12 px-8">Iniciar Optimización</Button>
            </div>
          ) : (
            <div className="space-y-12 py-8 px-4" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              {result.optimizedLayout.map((panel, idx) => {
                const isVertical = panel.strategy === 'vertical';
                const s = panel.stats;
                return (
                  <div key={idx} className="space-y-4">
                    <div className="bg-slate-900 text-white rounded-xl shadow-lg border-b-4 border-primary overflow-hidden">
                      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
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
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-[8px] font-bold text-slate-400 uppercase">Eficiencia Real</div>
                            <div className="text-lg font-black text-primary">{panel.efficiency.toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-800/50 px-6 py-2 grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-amber-500 uppercase">Desperdicio =</span>
                          <span className="text-[10px] font-mono font-bold">{s.wastePercentage.toFixed(3)} %</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase">m2 totales =</span>
                          <span className="text-[10px] font-mono font-bold">{s.totalAreaM2.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-red-400 uppercase">m2 Desp =</span>
                          <span className="text-[10px] font-mono font-bold">{s.wasteAreaM2.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-emerald-400 uppercase">m2 Stes =</span>
                          <span className="text-[10px] font-mono font-bold">{s.leftoverAreaM2.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-blue-400 uppercase">m2 cortados =</span>
                          <span className="text-[10px] font-mono font-bold">{s.usedAreaM2.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                          <div className="flex items-center gap-1.5 bg-slate-900/50 px-2 py-0.5 rounded">
                            <Scissors className="w-2.5 h-2.5 text-primary" />
                            <span className="text-[9px] font-black text-slate-300 uppercase">Desplazamientos =</span>
                            <span className="text-[10px] font-mono font-bold text-white">{s.displacements} por cada placa</span>
                            <span className="text-[10px] font-mono font-bold text-primary ml-2">{s.linearMeters.toFixed(2)} mts</span>
                          </div>
                        </div>
                      </div>
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
                        Estrategia JADSI v37.0: Optimización mediante {isVertical ? 'columnas verticales' : 'filas horizontales'} para maximizar stock recuperable.
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
