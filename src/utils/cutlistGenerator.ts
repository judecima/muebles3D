import { Part, GrainDirection } from '@/lib/types';

export interface CutlistPart {
  name: string;
  width: number;
  height: number;
  quantity: number;
  grainDirection: GrainDirection;
}

/**
 * Transforma las piezas del modelo 3D en una lista de corte agrupada.
 */
export function generateCutListFromModel(parts: Part[]): CutlistPart[] {
  const panelParts = parts.filter(p => !p.isHardware);
  
  const aggregated = panelParts.reduce((acc, part) => {
    const key = `${part.name}-${part.cutLargo}-${part.cutAncho}-${part.cutEspesor}-${part.grainDirection}`;
    if (!acc[key]) {
      acc[key] = {
        name: part.name,
        width: part.cutLargo,
        height: part.cutAncho,
        quantity: 0,
        grainDirection: part.grainDirection
      };
    }
    acc[key].quantity += 1;
    return acc;
  }, {} as Record<string, CutlistPart>);

  return Object.values(aggregated);
}
