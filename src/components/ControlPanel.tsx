import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FurnitureType, FurnitureDimensions, FurnitureColor } from '@/lib/types';
import { Box, DoorOpen, DoorClosed, MoveHorizontal, Maximize, RefreshCw, Layers, Palette } from 'lucide-react';

interface ControlPanelProps {
  type: FurnitureType;
  dimensions: FurnitureDimensions;
  color: FurnitureColor;
  onTypeChange: (val: FurnitureType) => void;
  onDimensionsChange: (dim: FurnitureDimensions) => void;
  onColorChange: (color: FurnitureColor) => void;
  onAction: (action: string) => void;
}

export function ControlPanel({ type, dimensions, color, onTypeChange, onDimensionsChange, onColorChange, onAction }: ControlPanelProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onDimensionsChange({ ...dimensions, [name]: parseFloat(value) || 0 });
  };

  return (
    <Card className="h-full border-none shadow-none overflow-y-auto rounded-none bg-slate-50">
      <CardHeader className="bg-primary text-primary-foreground py-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Box className="w-5 h-5" /> MuebleCAD 3D
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6 px-4 pb-10">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-500">Tipo de Mueble</Label>
          <Select value={type} onValueChange={(v) => onTypeChange(v as FurnitureType)}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="Seleccionar mueble" />
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

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
            <Palette className="w-3.5 h-3.5" /> Color del Mueble
          </Label>
          <Select value={color} onValueChange={(v) => onColorChange(v as FurnitureColor)}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="Seleccionar color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blanco">Blanco Ártico</SelectItem>
              <SelectItem value="marron">Marrón Nogal</SelectItem>
              <SelectItem value="beige">Beige Arena</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-slate-500">Ancho (mm)</Label>
            <Input name="width" type="number" value={dimensions.width} onChange={handleChange} className="bg-white h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-slate-500">Alto (mm)</Label>
            <Input name="height" type="number" value={dimensions.height} onChange={handleChange} className="bg-white h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-slate-500">Prof. (mm)</Label>
            <Input name="depth" type="number" value={dimensions.depth} onChange={handleChange} className="bg-white h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-slate-500">Espesor (mm)</Label>
            <Input name="thickness" type="number" value={dimensions.thickness} onChange={handleChange} className="bg-white h-9" />
          </div>
        </div>

        <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-sm" onClick={() => onAction('generate')}>
          <RefreshCw className="w-4 h-4 mr-2" /> Generar Mueble
        </Button>

        <div className="space-y-4 pt-2 border-t border-slate-200 mt-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-slate-500">Puertas (Bisagras 90°)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="bg-white text-xs" onClick={() => onAction('open-doors')}>
                <DoorOpen className="w-3.5 h-3.5 mr-1" /> Abrir
              </Button>
              <Button variant="outline" size="sm" className="bg-white text-xs" onClick={() => onAction('close-doors')}>
                <DoorClosed className="w-3.5 h-3.5 mr-1" /> Cerrar
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-slate-500">Cajones (Guías Telescópicas)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="bg-white text-xs" onClick={() => onAction('open-drawers')}>
                <MoveHorizontal className="w-3.5 h-3.5 mr-1" /> Extraer
              </Button>
              <Button variant="outline" size="sm" className="bg-white text-xs" onClick={() => onAction('close-drawers')}>
                <MoveHorizontal className="w-3.5 h-3.5 mr-1" /> Retraer
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-slate-500">Herramientas Pro</Label>
            <div className="space-y-2">
              <Button variant="secondary" className="w-full text-xs font-bold" onClick={() => onAction('explode')}>
                <Maximize className="w-4 h-4 mr-2" /> Vista Explotada
              </Button>
              <Button variant="ghost" className="w-full text-xs font-bold border border-slate-200 bg-white" onClick={() => onAction('reset')}>
                <Layers className="w-4 h-4 mr-2" /> Rearmar Mueble
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
