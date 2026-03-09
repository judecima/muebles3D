import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Part } from '@/lib/types';
import { ListChecks, Settings } from 'lucide-react';

interface CutlistTableProps {
  parts: Part[];
}

export function CutlistTable({ parts }: CutlistTableProps) {
  // Separar paneles de herrajes
  const panels = parts.filter(p => !p.isHardware);
  const hardware = parts.filter(p => p.isHardware);

  // Agrupar paneles por dimensiones reales de corte
  const aggregatedPanels = panels.reduce((acc, part) => {
    const key = `${part.name}-${part.cutLargo}-${part.cutAncho}-${part.cutEspesor}`;
    if (!acc[key]) {
      acc[key] = { ...part, quantity: 0 };
    }
    acc[key].quantity += 1;
    return acc;
  }, {} as Record<string, Part & { quantity: number }>);

  // Agrupar herrajes por nombre y largo
  const aggregatedHardware = hardware.reduce((acc, part) => {
    const key = `${part.name}-${part.depth}`;
    if (!acc[key]) {
      acc[key] = { ...part, quantity: 0 };
    }
    acc[key].quantity += 1;
    return acc;
  }, {} as Record<string, Part & { quantity: number }>);

  const panelList = Object.values(aggregatedPanels);
  const hardwareList = Object.values(aggregatedHardware);

  return (
    <Card className="rounded-none border-t border-slate-200 shadow-none h-full overflow-hidden flex flex-col">
      <CardHeader className="py-3 px-6 bg-slate-50 shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
          <ListChecks className="w-4 h-4" /> Despiece de Materiales (Cálculo Técnico Red Arquimax)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto flex-1 flex flex-col md:flex-row">
        {/* Tabla de Paneles MDF */}
        <div className="flex-1 border-r border-slate-100">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase py-2">Pieza (Panel MDF)</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase py-2">Largo (mm)</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase py-2">Ancho (mm)</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase py-2">Espesor (mm)</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase py-2">Cant.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {panelList.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-4 text-slate-400 italic">No hay paneles</TableCell></TableRow>
              ) : (
                panelList.map((part, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50 transition-colors h-8">
                    <TableCell className="font-medium text-[11px] py-1">{part.name}</TableCell>
                    <TableCell className="text-right text-[11px] py-1">{part.cutLargo} mm</TableCell>
                    <TableCell className="text-right text-[11px] py-1">{part.cutAncho} mm</TableCell>
                    <TableCell className="text-right text-[11px] py-1">{part.cutEspesor} mm</TableCell>
                    <TableCell className="text-right text-[11px] py-1 font-bold">{part.quantity}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Tabla de Herrajes */}
        <div className="w-full md:w-1/3 bg-slate-50/30">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase py-2 flex items-center gap-1">
                  <Settings className="w-3 h-3" /> Herrajes
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase py-2">Largo/Medida</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase py-2">Cant.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hardwareList.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-4 text-slate-400 italic">Sin accesorios</TableCell></TableRow>
              ) : (
                hardwareList.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50 transition-colors h-8">
                    <TableCell className="font-medium text-[11px] py-1">{item.name}</TableCell>
                    <TableCell className="text-right text-[11px] py-1">{item.depth > 0 ? `${item.depth} mm` : '-'}</TableCell>
                    <TableCell className="text-right text-[11px] py-1 font-bold text-accent">{item.quantity}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
