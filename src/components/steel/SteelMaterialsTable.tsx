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
  ShieldCheck,
  FileText
} from 'lucide-react';

interface SteelMaterialsTableProps {
  config: SteelHouseConfig;
}

export function SteelMaterialsTable({ config }: SteelMaterialsTableProps) {
  const estimate = calculateSteelMaterials(config);

  const categories = {
    perfileria: { label: 'Estructura Metálica', color: 'bg-slate-100 text-slate-700', icon: Layers },
    paneles: { label: 'Cerramientos y Placas', color: 'bg-blue-50 text-blue-700', icon: FileText },
    fijaciones: { label: 'Fijaciones y Anclajes', color: 'bg-amber-50 text-amber-700', icon: Wrench },
    aislacion: { label: 'Aislación y Barreras', color: 'bg-green-50 text-green-700', icon: ThermometerSnowflake },
    otros: { label: 'Terminación y Sellos', color: 'bg-purple-50 text-purple-700', icon: ShieldCheck }
  };

  const structuralItems = estimate.items.filter(i => i.category === 'perfileria');
  const boardItems = estimate.items.filter(i => i.category === 'paneles');

  return (
    <div className="space-y-6">
      {/* Resumen Ejecutivo de Obra */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-none border-slate-200 bg-white">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Peso Acero Estimado</CardTitle>
            <Weight className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="text-2xl font-black text-slate-800">{estimate.totalSteelWeightKg} <span className="text-xs font-bold text-slate-400">KG</span></div>
            <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Total Acero Galvanizado</p>
          </CardContent>
        </Card>

        <Card className="shadow-none border-slate-200 bg-white">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Placas Totales</CardTitle>
            <Package className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="text-2xl font-black text-slate-800">
              {boardItems.reduce((acc, i) => acc + i.quantity, 0)} 
              <span className="text-xs font-bold text-slate-400"> UN</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">OSB + Yeso (2.4x1.2m)</p>
          </CardContent>
        </Card>

        <Card className="shadow-none border-slate-200 bg-white">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total Perfiles 6m</CardTitle>
            <Layers className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="text-2xl font-black text-slate-800">
              {structuralItems.reduce((acc, i) => acc + i.quantity, 0)} 
              <span className="text-xs font-bold text-slate-400"> UN</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Barras Comerciales PGC/PGU</p>
          </CardContent>
        </Card>
      </div>

      {/* Listado Detallado por Rubro */}
      <Card className="shadow-none border-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-900 text-white py-3 px-4">
          <CardTitle className="text-xs font-bold flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Cómputo Métrico Detallado (Normativa AISI)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="h-9 hover:bg-transparent">
                <TableHead className="text-[10px] font-black uppercase">Material / Especificación</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Rubro</TableHead>
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

      {/* Notas Técnicas de Obra */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[10px] text-blue-700 leading-relaxed font-bold uppercase">Criterio de Cálculo de Placas:</p>
            <p className="text-[10px] text-blue-600 leading-relaxed font-medium">
              Se descuenta el 100% del área de vanos para placas de yeso y OSB. El cómputo incluye un factor de desperdicio del 12% para recortes en obra. Formato estándar 2.40m x 1.20m.
            </p>
          </div>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
          <Wrench className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[10px] text-amber-700 leading-relaxed font-bold uppercase">Especificación de Fijaciones:</p>
            <p className="text-[10px] text-amber-600 leading-relaxed font-medium">
              Tornillos T1 (Hex/Wafer) calculados para cada encuentro de alma de perfil. Tornillos T2/T3 calculados para fijación perimetral cada 20cm y central cada 30cm sobre montantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
