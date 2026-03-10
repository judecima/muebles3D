import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItemGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FurnitureType, FurnitureDimensions, FurnitureColor } from '@/lib/types';
import { 
  DoorOpen, 
  DoorClosed, 
  MoveHorizontal, 
  Maximize, 
  RefreshCw, 
  Palette,
  Settings2,
  Undo2,
  FileDown,
  Layout,
  Layers,
  ChevronRight
} from 'lucide-react';

interface ControlPanelProps {
  type: FurnitureType;
  dimensions: FurnitureDimensions;
  color: FurnitureColor;
  hasDoors: boolean;
  hasDrawers: boolean;
  onTypeChange: (val: FurnitureType) => void;
  onDimensionsChange: (dim: FurnitureDimensions) => void;
  onColorChange: (color: FurnitureColor) => void;
  onAction: (action: string) => void;
}

export function ControlPanel({ 
  type, 
  dimensions, 
  color, 
  hasDoors, 
  hasDrawers,
  onTypeChange, 
  onDimensionsChange, 
  onColorChange, 
  onAction 
}: ControlPanelProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onDimensionsChange({ ...dimensions, [name]: parseFloat(value) || 0 });
  };

  const handleSliderChange = (values: number[]) => {
    onDimensionsChange({ ...dimensions, width: values[0] });
  };

  const handleBackToggle = (checked: boolean) => {
    onDimensionsChange({ ...dimensions, hasBack: checked });
  };

  const handleShelfToggle = (checked: boolean) => {
    onDimensionsChange({ ...dimensions, hasShelf: checked });
  };

  const handleShelf2Toggle = (checked: boolean) => {
    onDimensionsChange({ ...dimensions, hasShelf2: checked });
  };

  const isCatalog = type.startsWith('cabinet_');
  const is3Doors = type.includes('3p') && !type.includes('base_140');
  const isHeightFixed = isCatalog || type === 'rackTV' || type === 'escritorio' || type === 'bajoMesada' || type === 'bajomesada-cajonera' || type === 'porta-anafe';
  const isWidthSlider = type === 'escritorio';
  const canHaveBack = type === 'bajoMesada' || type === 'alacena' || type === 'biblioteca' || type === 'alacenaFlip' || type === 'bajomesada-cajonera' || type === 'porta-anafe' || isCatalog;
  const forceBack = type === 'placard' || type === 'rackTV' || type.includes('pantry') || type.includes('wall');
  
  const isPantryOrMicrowave = type.includes('pantry') || type.includes('microwave');
  const isBaseOrWall = type.includes('base') || type.includes('wall') || type === 'bajoMesada' || type === 'alacena' || type === 'porta-anafe';
  const canHaveShelf = isBaseOrWall && !isPantryOrMicrowave;

  return (
    <Card className="h-full border-none shadow-none rounded-none bg-white overflow-y-auto">
      <CardHeader className="bg-primary text-primary-foreground py-4 sticky top-0 z-10 shadow-sm">
        <CardTitle className="text-lg font-bold flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" /> 
            <span>Red Arquimax</span>
          </div>
          <span className="text-[10px] opacity-70 font-normal">DISEÑADOR TÉCNICO V1.0</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6 px-4 pb-20">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-500">Módulo de Proyecto</Label>
          <Select value={type} onValueChange={(v) => onTypeChange(v as FurnitureType)}>
            <SelectTrigger className="w-full bg-slate-50 border-slate-200 h-11">
              <SelectValue placeholder="Seleccionar mueble" />
            </SelectTrigger>
            <SelectContent className="max-h-[400px]">
              <div className="p-2 text-[10px] font-black text-primary uppercase tracking-widest border-b mb-1">Modelos Paramétricos</div>
              <SelectItem value="placard">Placard Vestidor</SelectItem>
              <SelectItem value="escritorio">Escritorio Industrial</SelectItem>
              <SelectItem value="bajoMesada">Bajo Mesada (Paramétrico)</SelectItem>
              <SelectItem value="rackTV">Rack TV</SelectItem>
              
              <div className="p-2 text-[10px] font-black text-primary uppercase tracking-widest border-b mt-2 mb-1">Catálogo Dielfe (Estándar)</div>
              <SelectItem value="cabinet_base_120_2p3c">Bajo 1.20m (2P+3C)</SelectItem>
              <SelectItem value="cabinet_base_140_3p3c">Bajo 1.40m (2P+3C)</SelectItem>
              <SelectItem value="cabinet_base_single_60_1p">Bajo 0.60m (1P)</SelectItem>
              <SelectItem value="cabinet_base_double_80_2p">Bajo 0.80m (2P)</SelectItem>
              <SelectItem value="cabinet_wall_120_3p">Alacena 1.20m (3P)</SelectItem>
              <SelectItem value="cabinet_wall_140_3p">Alacena 1.40m (3P)</SelectItem>
              <SelectItem value="cabinet_wall_60_1p">Alacena 0.60m (1P)</SelectItem>
              <SelectItem value="cabinet_hood_60">Alacena Campana (0.60m)</SelectItem>
              <SelectItem value="cabinet_pantry_60_2p">Despensero 0.60m (2P)</SelectItem>
              <SelectItem value="cabinet_microwave_60">Torre Hornos (0.60m)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {isWidthSlider ? (
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <Label className="text-xs font-bold uppercase text-slate-500">Ancho del Escritorio</Label>
                <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  {dimensions.width} mm
                </span>
              </div>
              <Slider
                value={[dimensions.width]}
                min={800}
                max={1500}
                step={10}
                onValueChange={handleSliderChange}
                className="py-4"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>Min: 800 mm</span>
                <span>Max: 1500 mm</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Ancho (mm)</Label>
              <Input name="width" type="number" value={dimensions.width} onChange={handleChange} className="h-9 border-slate-200" disabled={isCatalog} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-500">
                Alto (mm) {isHeightFixed && <span className="text-primary/60">(Fijo)</span>}
              </Label>
              <Input 
                name="height" 
                type="number" 
                value={dimensions.height} 
                onChange={handleChange} 
                className={`h-9 border-slate-200 ${isHeightFixed ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`} 
                disabled={isHeightFixed}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Prof. (mm)</Label>
              <Input name="depth" type="number" value={dimensions.depth} onChange={handleChange} className="h-9 border-slate-200" disabled={isCatalog} />
            </div>
          </div>

          <div className="space-y-2">
            {(canHaveBack || forceBack) && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2">
                  <Layout className="w-4 h-4 text-slate-500" />
                  <div className="flex flex-col">
                    <Label className="text-xs font-bold uppercase text-slate-600">Fondo (MDF 3mm)</Label>
                    {forceBack && <span className="text-[8px] text-primary/70 font-bold uppercase">Obligatorio</span>}
                  </div>
                </div>
                <Switch 
                  checked={forceBack ? true : dimensions.hasBack} 
                  onCheckedChange={handleBackToggle} 
                  disabled={forceBack}
                />
              </div>
            )}

            {canHaveShelf && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-500" />
                    <Label className="text-xs font-bold uppercase text-slate-600">
                      {is3Doors ? 'Estante Grande (Sección 1)' : 'Estante Interior'}
                    </Label>
                  </div>
                  <Switch 
                    checked={dimensions.hasShelf} 
                    onCheckedChange={handleShelfToggle} 
                  />
                </div>
                {is3Doors && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-500" />
                      <Label className="text-xs font-bold uppercase text-slate-600">Estante Pequeño (Sección 2)</Label>
                    </div>
                    <Switch 
                      checked={dimensions.hasShelf2} 
                      onCheckedChange={handleShelf2Toggle} 
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
            <Palette className="w-3.5 h-3.5" /> Acabado Mueble
          </Label>
          <Select value={color} onValueChange={(v) => onColorChange(v as FurnitureColor)}>
            <SelectTrigger className="w-full bg-slate-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blanco">Blanco</SelectItem>
              <SelectItem value="gris_claro">Gris Claro</SelectItem>
              <SelectItem value="grafito">Grafito</SelectItem>
              <SelectItem value="roble_claro">Roble Claro</SelectItem>
              <SelectItem value="nogal">Nogal</SelectItem>
              <SelectItem value="negro">Negro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 pt-2">
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm" onClick={() => onAction('generate')}>
            <RefreshCw className="w-4 h-4 mr-2" /> Actualizar Modelo
          </Button>
          
          <Button className="w-full bg-slate-900 hover:bg-black text-white font-bold" onClick={() => onAction('export-pdf')}>
            <FileDown className="w-4 h-4 mr-2" /> DESCARGAR PDF
          </Button>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-4">
          {hasDoors && (
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Sistema de Puertas</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => onAction('open-doors')}>
                  <DoorOpen className="w-3.5 h-3.5 mr-1" /> Abrir
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => onAction('close-doors')}>
                  <DoorClosed className="w-3.5 h-3.5 mr-1" /> Cerrar
                </Button>
              </div>
            </div>
          )}

          {hasDrawers && (
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Sistema de Cajones</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => onAction('open-drawers')}>
                  <MoveHorizontal className="w-3.5 h-3.5 mr-1" /> Extraer
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => onAction('close-drawers')}>
                  <MoveHorizontal className="w-3.5 h-3.5 mr-1" /> Retraer
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <Label className="text-[10px] font-bold uppercase text-slate-400">Herramientas Pro</Label>
            <div className="space-y-2">
              <Button variant="secondary" className="w-full text-xs font-bold" onClick={() => onAction('explode')}>
                <Maximize className="w-4 h-4 mr-2" /> Vista Explotada
              </Button>
              <Button variant="ghost" className="w-full text-xs font-bold border border-slate-200" onClick={() => onAction('reset')}>
                <Undo2 className="w-4 h-4 mr-2" /> Rearmar Mueble
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
