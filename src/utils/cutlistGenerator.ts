import { Part, GrainDirection } from '@/lib/types';

export interface CutlistPart {
  name: string;
  width: number;
  height: number;
  quantity: number;
  grainDirection: GrainDirection;
  thickness: number;
}

/**
 * Transforma las piezas del modelo 3D en una lista de piezas agrupadas para el optimizador.
 * Asegura que todas las medidas de salida sean números enteros.
 */
export function generateCutListFromModel(parts: Part[]): CutlistPart[] {
  const woodParts = parts.filter(p => !p.isHardware);
  
  const aggregated = woodParts.reduce((acc, part) => {
    // Forzar redondeo a enteros en la generación de la lista de corte
    const l = Math.round(part.cutLargo);
    const a = Math.round(part.cutAncho);
    const e = Math.round(part.cutEspesor);
    
    const key = `${part.name}-${l}-${a}-${e}-${part.grainDirection}`;
    
    if (!acc[key]) {
      acc[key] = {
        name: part.name,
        width: l,
        height: a,
        quantity: 0,
        grainDirection: part.grainDirection,
        thickness: e
      };
    }
    
    acc[key].quantity += 1;
    return acc;
  }, {} as Record<string, CutlistPart>);

  return Object.values(aggregated).sort((a, b) => (b.width * b.height) - (a.width * a.height));
}
