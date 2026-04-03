import { InternalPart, FeatureFlags } from '../types/engine';

export interface CandidateStrip {
  orientation: 'horizontal' | 'vertical';
  thickness: number;
  length: number;
  parts: { piece: InternalPart, rotated: boolean, x: number, y: number }[];
  efficiency: number;
  remnantScore: number;
  stackingBonus: number;
  finalScore: number;
}

export class StripGenerator {
  constructor(private kerf: number) {}

  generateStrips(
    pool: InternalPart[], 
    maxWidth: number, 
    maxHeight: number, 
    strategy: 'horizontal' | 'vertical',
    features: FeatureFlags
  ): CandidateStrip[] {
    const unplaced = pool.filter(p => !p.placed);
    if (unplaced.length === 0) return [];

    const seeds = [...unplaced]
      .sort((a, b) => (b.width * b.height) - (a.width * a.height))
      .slice(0, 15);

    const candidates: CandidateStrip[] = [];

    for (const seed of seeds) {
      const dimensions = seed.width === seed.height ? [seed.width] : [seed.width, seed.height];
      
      for (const dim of dimensions) {
        if (strategy === 'horizontal' && dim > maxHeight) continue;
        if (strategy === 'vertical' && dim > maxWidth) continue;

        const maxAlong = strategy === 'horizontal' ? maxWidth : maxHeight;
        const maxCross = strategy === 'horizontal' ? maxHeight : maxWidth; 

        const strip = this.fillUniversalStrip(unplaced, maxAlong, maxCross, strategy, seed.id);
        
        if (strip.parts.length > 0) {
          const scoredStrip = this.scoreStrip(strip, maxWidth, maxHeight, strategy);
          candidates.push(scoredStrip);
        }
      }
    }

    return candidates.sort((a, b) => b.finalScore - a.finalScore);
  }

  private fillUniversalStrip(
    pool: InternalPart[], 
    maxAlong: number, 
    maxCross: number, 
    strategy: 'horizontal' | 'vertical',
    seedId: string
  ): Omit<CandidateStrip, 'finalScore' | 'remnantScore' | 'efficiency' | 'stackingBonus'> {
    const stripParts: CandidateStrip['parts'] = [];
    let currentAlong = 0; 
    const usedIds = new Set<string>();
    const availablePool = [...pool];

    while (currentAlong < maxAlong) {
        let anchor = null;
        if (usedIds.size === 0) {
            anchor = availablePool.find(p => p.id === seedId);
        }
        
        if (!anchor) {
            anchor = availablePool
                .filter(p => !usedIds.has(p.id))
                .find(p => {
                    const canN = p.height <= maxCross && (currentAlong + p.width) <= maxAlong;
                    const canR = p.width <= maxCross && (currentAlong + p.height) <= maxAlong;
                    return canN || canR;
                });
        }

        if (!anchor) break;

        const okN = anchor.height <= maxCross && (currentAlong + anchor.width) <= maxAlong;
        const okR = anchor.width <= maxCross && (currentAlong + anchor.height) <= maxAlong;

        let aRot = false;
        if (okN && okR) {
            aRot = Math.abs(maxCross - anchor.width) < Math.abs(maxCross - anchor.height);
        } else if (okR) {
            aRot = true;
        }

        const aAlong = aRot ? anchor.height : anchor.width;
        const aCross = aRot ? anchor.width : anchor.height;

        // V46.2.3: ERROR CORREGIDO - PUSHEAR EL ANCLA A LA FRANJA
        stripParts.push({
            piece: anchor,
            rotated: aRot,
            x: strategy === 'horizontal' ? currentAlong : 0,
            y: strategy === 'horizontal' ? 0 : currentAlong
        });
        usedIds.add(anchor.id);

        const colWidthAlong = aAlong;
        let currentCrossInCol = aCross + this.kerf;

        // 2. APILAMIENTO VERTICAL (CROSS)
        const fillersPool = availablePool
            .filter(p => !usedIds.has(p.id))
            .sort((a, b) => b.height - a.height);

        while (currentCrossInCol < maxCross) {
            const remainingCross = maxCross - currentCrossInCol;
            const filler = fillersPool.find(p => {
                if (usedIds.has(p.id)) return false;
                const fOkN = (p.height + this.kerf) <= remainingCross && p.width <= colWidthAlong;
                const fOkR = (p.width + this.kerf) <= remainingCross && p.height <= colWidthAlong;
                return fOkN || fOkR;
            });

            if (!filler) break;

            const fCanN = (filler.height + this.kerf) <= remainingCross && filler.width <= colWidthAlong;
            const fRot = !fCanN;
            const fAlong = fRot ? filler.height : filler.width;
            const fCross = fRot ? filler.width : filler.height;

            if (fCross + this.kerf > remainingCross) break;

            stripParts.push({
                piece: filler,
                rotated: fRot,
                x: strategy === 'horizontal' ? currentAlong : currentCrossInCol,
                y: strategy === 'horizontal' ? currentCrossInCol : currentAlong
            });

            currentCrossInCol += fCross + this.kerf;
            usedIds.add(filler.id);
        }

        currentAlong += colWidthAlong + this.kerf;
    }

    // Calculamos el espesor real de la franja basado en la pieza más lejana
    const usedThickness = stripParts.length > 0 
        ? Math.max(...stripParts.map(p => strategy === 'horizontal' ? p.y + (p.rotated ? p.piece.width : p.piece.height) : p.x + (p.rotated ? p.piece.height : p.piece.width)))
        : 0;

    return {
      orientation: strategy,
      thickness: usedThickness,
      length: currentAlong,
      parts: stripParts
    };
  }

  private scoreStrip(
    strip: Omit<CandidateStrip, 'finalScore' | 'remnantScore' | 'efficiency' | 'stackingBonus'>,
    containerW: number,
    containerH: number,
    strategy: 'horizontal' | 'vertical'
  ): CandidateStrip {
    const totalArea = strip.thickness * strip.length;
    const usedArea = strip.parts.reduce((acc, p) => acc + (p.piece.width * p.piece.height), 0);
    const efficiency = (usedArea / totalArea) * 100;
    
    const remDim = (strategy === 'horizontal' ? containerH : containerW) - strip.thickness;
    let remnantScore = 0;
    if (remDim >= 600) remnantScore = 1.0;
    else if (remDim >= 400) remnantScore = 0.7;
    else if (remDim >= 200) remnantScore = 0.3;
    else if (remDim < 100) remnantScore = -0.5;

    // v46.2.8: Prioridad Absoluta de Recuento (Densidad Industrial)
    // El bono de piezas debe anular cualquier penalización estética de retazos.
    const pieceCountWeight = 15.0; // Antes 5
    const pieceCountBonus = strip.parts.length * pieceCountWeight;
    
    const currentAlongAxis = new Set(strip.parts.map(p => strategy === 'horizontal' ? p.x : p.y));
    const stackingBonus = (strip.parts.length / (currentAlongAxis.size || 1)) * 25; // Antes 15

    // v46.5: Veto de Desborde - Si la franja supera el contenedor, es inválida.
    const limit = (strategy === 'horizontal' ? containerH : containerW);
    if (strip.thickness > limit + 0.1) return { ...strip, efficiency: 0, remnantScore: 0, stackingBonus: 0, finalScore: -999999 };

    // Si la eficiencia es alta, el retazo de 50mm ya no es una penalización, es un éxito.
    const effectiveRemnantScore = (efficiency > 85 && remnantScore < 0) ? 0 : remnantScore;

    // v46.4: Sintonía Industrial - Favorecer vertical según sugerencia técnica
    const strategyWeight = (strategy === 'vertical' && efficiency > 80) ? 100 : 0;

    const finalScore = (efficiency * 0.9) + (effectiveRemnantScore * 5) + stackingBonus + pieceCountBonus + strategyWeight;

    return { ...strip, efficiency, remnantScore: effectiveRemnantScore, stackingBonus, finalScore };
  }
}
