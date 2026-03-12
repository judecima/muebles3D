import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Part } from '../lib/types';
import { Settings } from 'lucide-react';

interface CutlistTableProps {
  parts: Part[];
}

export function CutlistTable({ parts }: CutlistTableProps) {
  const panels = parts.filter(p => !p.isHardware);
  const hardware = parts.filter(p => p.isHardware);

  const aggregatedPanels = panels.reduce((acc, part) => {
    const l = Math.round(part.cutLargo);
    const a = Math.round(part.cutAncho);
    const e = Math.round(part.cutEspesor);
    
    const key = `${part.name}-${l}-${a}-${e}`;
    if (!acc[key]) {
      acc[key] = { ...part, cutLargo: l, cutAncho: a, cutEspesor: e, quantity: 0 };
    }
    acc[key].quantity += 1;
    return acc;
  }, {} as Record<string, Part & { quantity: number }>);

  const aggregatedHardware = hardware.reduce((acc, part) => {
    const key = `${part.name}-${part.depth}`;
    if (!acc[key]) {
      acc[key] = { ...part, quantity: 0 };
    }
    const increment = part.name.toLowerCase().includes('riel') ? 0.5 : 1;
    acc[key].quantity += increment;
    return acc;
  }, {} as Record<string, Part & { quantity: number }>);

  const panelList = Object.values(aggregatedPanels);
  const hardwareList = Object.values(aggregatedHardware);

  return (
    <Card className="rounded-none border-t border-slate-200 shadow-none h-full overflow-hidden flex flex-col">
      <CardHeader className="py-2 px-4 md:px-6 bg-slate-50 shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-xs md:text-sm font-bold flex items-center gap-2 text-primary">
          <div className="w-1 h-1 bg-primary rounded-full" />
          Despiece Técnico (JADSI Industrial v15.9)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <div className="flex flex-col md:flex-row h-full">
          <div className="flex-1 md:border-r border-slate-100 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 h-full">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase py-2 h-8 px-2">Pieza</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase py-2 h-8 px-2">Largo (mm)</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase py-2 h-8 px-2">Ancho (mm)</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase py-2 h-8 px-2">Cant.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {panelList.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-4 text-slate-400 italic text-[10px]">Sin piezas</TableCell></TableRow>
                  ) : (
                    panelList.map((part, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50 transition-colors h-8">
                        <TableCell className="font-medium text-[10px] py-1 px-2">{part.name}</TableCell>
                        <TableCell className="text-right text-[10px] py-1 px-2 font-mono">{part.cutLargo}</TableCell>
                        <TableCell className="text-right text-[10px] py-1 px-2 font-mono">{part.cutAncho}</TableCell>
                        <TableCell className="text-right text-[10px] py-1 px-2 font-bold">{part.quantity}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <div className="w-full md:w-1/3 bg-slate-50/30 overflow-hidden flex flex-col border-t md:border-t-0">
            <ScrollArea className="flex-1 h-full">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase py-2 h-8 px-2 flex items-center gap-1">
                      <Settings className="w-3 h-3" /> Herrajes
                    </TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase py-2 h-8 px-2">Cant.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hardwareList.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center py-4 text-slate-400 italic text-[10px]">Sin accesorios</TableCell></TableRow>
                  ) : (
                    hardwareList.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50 transition-colors h-8">
                        <TableCell className="font-medium text-[10px] py-1 px-2">{item.name}</TableCell>
                        <TableCell className="text-right text-[10px] py-1 px-2 font-bold text-accent">{Math.ceil(item.quantity)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
