import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FurnitureType, FurnitureDimensions } from '@/lib/types';
import { Box, DoorOpen, DoorClosed, MoveHorizontal, Maximize, Trash2 } from 'lucide-react';

interface ControlPanelProps {
  type: FurnitureType;
  dimensions: FurnitureDimensions;
  onTypeChange: (val: FurnitureType) => void;
  onDimensionsChange: (dim: FurnitureDimensions) => void;
  onAction: (action: string) => void;
}

export function ControlPanel({ type, dimensions, onTypeChange, onDimensionsChange, onAction }: ControlPanelProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onDimensionsChange({ ...dimensions, [name]: parseFloat(value) || 0 });
  };

  return (
    <Card className="h-full border-none shadow-lg overflow-y-auto rounded-none bg-white">
      <CardHeader className="bg-primary text-primary-foreground">
        <CardTitle className="text-xl font-headline flex items-center gap-2">
          <Box className="w-6 h-6" /> MuebleCAD 3D
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Seleccionar Mueble</Label>
          <Select value={type} onValueChange={(v) => onTypeChange(v as FurnitureType)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tipo de mueble" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="placard">Placard</SelectItem>
              <SelectItem value="escritorio">Escritorio Ejecutivo</SelectItem>
              <SelectItem value="bajoMesada">Bajo Mesada</SelectItem>
              <SelectItem value="alacena">Alacena Superior</SelectItem>
              <SelectItem value="rackTV">Rack TV</SelectItem>
              <SelectItem value="biblioteca">Biblioteca</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ancho (mm)</Label>
            <Input name="width" type="number" value={dimensions.width} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label>Alto (mm)</Label>
            <Input name="height" type="number" value={dimensions.height} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label>Profundidad (mm)</Label>
            <Input name="depth" type="number" value={dimensions.depth} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label>Espesor (mm)</Label>
            <Input name="thickness" type="number" value={dimensions.thickness} onChange={handleChange} />
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <Button className="w-full bg-accent hover:bg-accent/80 text-accent-foreground font-bold" onClick={() => onAction('generate')}>
            Generar Mueble
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="flex items-center gap-2" onClick={() => onAction('open-doors')}>
              <DoorOpen className="w-4 h-4" /> Abrir Puertas
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => onAction('close-doors')}>
              <DoorClosed className="w-4 h-4" /> Cerrar Puertas
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => onAction('open-drawers')}>
              <MoveHorizontal className="w-4 h-4" /> Abrir Cajones
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => onAction('close-drawers')}>
              <MoveHorizontal className="w-4 h-4" /> Cerrar Cajones
            </Button>
          </div>

          <Button variant="secondary" className="w-full flex items-center justify-center gap-2" onClick={() => onAction('explode')}>
            <Maximize className="w-4 h-4" /> Vista Explotada
          </Button>

          <Button variant="ghost" className="w-full text-destructive hover:text-destructive flex items-center justify-center gap-2" onClick={() => onAction('reset')}>
            <Trash2 className="w-4 h-4" /> Resetear Vista
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}