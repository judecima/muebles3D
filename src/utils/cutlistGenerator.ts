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
 * Agrupa automáticamente piezas con las mismas dimensiones técnicas.
 */
export function generateCutListFromModel(parts: Part[]): CutlistPart[] {
  // Filtrar solo piezas que no sean herrajes (madera/MDF)
  const woodParts = parts.filter(p => !p.isHardware);
  
  const aggregated = woodParts.reduce((acc, part) => {
    // La clave de agrupación incluye dimensiones y dirección de veta
    const key = `${part.name}-${part.cutLargo}-${part.cutAncho}-${part.cutEspesor}-${part.grainDirection}`;
    
    if (!acc[key]) {
      acc[key] = {
        name: part.name,
        width: part.cutLargo,
        height: part.cutAncho,
        quantity: 0,
        grainDirection: part.grainDirection,
        thickness: part.cutEspesor
      };
    }
    
    acc[key].quantity += 1;
    return acc;
  }, {} as Record<string, CutlistPart>);

  // Retornar como array ordenado por área descendente (preprocesamiento industrial)
  return Object.values(aggregated).sort((a, b) => (b.width * b.height) - (a.width * a.height));
}
