import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Part } from '@/lib/types';
import { ListChecks } from 'lucide-react';

interface CutlistTableProps {
  parts: Part[];
}

export function CutlistTable({ parts }: CutlistTableProps) {
  // Aggregate quantities
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
    <Card className="rounded-none border-t border-b-0 border-l-0 border-r-0 shadow-none">
      <CardHeader className="py-4">
        <CardTitle className="text-lg flex items-center gap-2 text-primary">
          <ListChecks className="w-5 h-5" /> Lista de Corte (Despiece)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Pieza</TableHead>
              <TableHead className="text-right">Ancho (mm)</TableHead>
              <TableHead className="text-right">Largo (mm)</TableHead>
              <TableHead className="text-right">Espesor (mm)</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayParts.map((part, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{part.name}</TableCell>
                <TableCell className="text-right">{part.width}</TableCell>
                <TableCell className="text-right">{part.height}</TableCell>
                <TableCell className="text-right">{part.depth}</TableCell>
                <TableCell className="text-right">{part.quantity}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}