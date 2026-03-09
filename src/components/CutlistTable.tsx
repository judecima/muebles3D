import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Part } from '@/lib/types';
import { ListChecks } from 'lucide-react';

interface CutlistTableProps {
  parts: Part[];
}

export function CutlistTable({ parts }: CutlistTableProps) {
  // Agrupar piezas por dimensiones para la lista de corte
  const aggregated = parts.reduce((acc, part) => {
    const key = `${part.name}-${part.width}-${part.height}-${part.depth}`;
    if (!acc[key]) {
      acc[key] = { ...part, quantity: 0 };
    }
    acc[key].quantity += 1;
    return acc;
  }, {} as Record<string, Part & { quantity: number }>);

  const displayParts = Object.values(aggregated);

  return (
    <Card className="rounded-none border-t border-slate-200 shadow-none h-full overflow-hidden flex flex-col">
      <CardHeader className="py-3 px-6 bg-slate-50 shrink-0">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
          <ListChecks className="w-4 h-4" /> Despiece de Materiales (MDF)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto flex-1">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
            <TableRow>
              <TableHead className="text-[11px] font-bold uppercase">Pieza</TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase">Largo (mm)</TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase">Ancho (mm)</TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase">Espesor (mm)</TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase">Cant.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayParts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-400 italic">
                  No hay piezas generadas
                </TableCell>
              </TableRow>
            ) : (
              displayParts.map((part, idx) => (
                <TableRow key={idx} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium text-xs">{part.name}</TableCell>
                  <TableCell className="text-right text-xs">{part.height}</TableCell>
                  <TableCell className="text-right text-xs">{part.width}</TableCell>
                  <TableCell className="text-right text-xs">{part.depth}</TableCell>
                  <TableCell className="text-right text-xs font-bold">{part.quantity}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
