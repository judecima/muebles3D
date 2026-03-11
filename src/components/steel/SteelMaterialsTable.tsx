import React from 'react';
import { SteelHouseConfig } from '@/lib/steel/types';
import { calculateSteelMaterials } from '@/utils/steel/materialCalculator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  Weight, 
  Package, 
  AlertCircle,
  Layers,
  Wrench,
  ThermometerSnowflake,
  ShieldCheck
} from 'lucide-react';

interface SteelMaterialsTableProps {
  config: SteelHouseConfig;
}

export function SteelMaterialsTable({ config }: SteelMaterialsTableProps) {
  const estimate = calculateSteelMaterials(config);

  const categories = {
    perfileria: { label: 'Estructura', color: 'bg-slate-100 text-slate-700', icon: Layers },
    paneles: { label: 'Cerramientos', color: 'bg-blue-50 text-blue-700', icon: Package },
    fijaciones: { label: 'Fijaciones', color: 'bg-amber-50 text-amber-700', icon: Wrench },
    aislacion: { label: 'Aislación y Barreras', color: 'bg-green-50 text-green-700', icon: ThermometerSnowflake },
    otros: { label: 'Sellos y Terminación', color: 'bg-purple-50 text-purple-700', icon: ShieldCheck }
  };

  const pguItem = estimate.items.find(i => i.name.includes('PGU'));
  const pgcItem = estimate.items.find(i => i.name.includes('PGC'));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-none border-slate-200 bg-slate-50/50">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Peso Estructural</CardTitle>
            <Weight className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="text-2xl font-black text-slate-800">{estimate.totalSteelWeightKg} <span className="text-xs font-bold text-slate-400">KG</span></div>
            <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Acero Galvanizado Total</p>
          </CardContent>
        </Card>

        <Card className="shadow-none border-slate-200 bg-slate-50/50">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Barras PGU (6m)</CardTitle>
            <Layers className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="text-2xl font-black text-slate-800">
              {pguItem?.quantity || 0} 
              <span className="text-xs font-bold text-slate-400"> UN</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Soleras y Dinteles</p>
          </CardContent>
        </Card>

        <Card className="shadow-none border-slate-200 bg-slate-50/50">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Barras PGC (6m)</CardTitle>
            <Package className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="text-2xl font-black text-slate-800">
              {pgcItem?.quantity || 0} 
              <span className="text-xs font-bold text-slate-400"> UN</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Montantes y Refuerzos</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none border-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-900 text-white py-3 px-4">
          <CardTitle className="text-xs font-bold flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Cómputo Métrico de Obra Real
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="h-9 hover:bg-transparent">
                <TableHead className="text-[10px] font-black uppercase">Material</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Categoría</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Cantidad</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-center">Unidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimate.items.map((item, idx) => {
                const CatIcon = categories[item.category].icon;
                return (
                  <TableRow key={idx} className="h-12 hover:bg-slate-50 transition-colors">
                    <TableCell className="py-2">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-700">{item.name}</span>
                        <span className="text-[9px] text-slate-400 italic leading-tight">{item.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="secondary" className={`text-[8px] font-black uppercase px-1.5 h-5 flex items-center gap-1 border-none shadow-none ${categories[item.category].color}`}>
                        <CatIcon className="w-3 h-3" />
                        {categories[item.category].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-[11px] font-black text-slate-900 py-2">
                      {item.quantity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                    </TableCell>
                    <TableCell className="text-center text-[10px] font-bold text-slate-400 py-2 uppercase">
                      {item.unit}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-[10px] text-amber-700 leading-relaxed font-bold uppercase">Nota de Estimación:</p>
          <p className="text-[10px] text-amber-600 leading-relaxed font-medium">
            Este cómputo incluye un factor de desperdicio promedio del 15% para perfiles y 12% para placas. 
            Las cantidades de fijaciones se basan en una modulación estándar cada 400/600mm.
          </p>
        </div>
      </div>
    </div>
  );
}
