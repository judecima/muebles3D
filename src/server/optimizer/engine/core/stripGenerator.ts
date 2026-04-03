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
          const scoredStrip = this.scoreStrip(strip, maxWidth, maxHeight, strategy, features);
          candidates.push(scoredStrip);
        }
      }
    }

    // v47.1: Semillas Oro Proactivas (Solo en Fase de Cierre)
    if (features && features.isClosingPhase) {
        const GOLD_MEASURES = [600, 500, 450, 300, 150];
        const TOTAL_TRIM = 10;
        const MIN_MACHINE_CUT = 60;

        for (const gold of GOLD_MEASURES) {
            const containerDim = strategy === 'horizontal' ? maxHeight : maxWidth;
            const targetThickness = containerDim - gold - TOTAL_TRIM;

            if (targetThickness >= MIN_MACHINE_CUT) {
                const maxAlong = strategy === 'horizontal' ? maxWidth : maxHeight;
                const goldStrip = this.fillUniversalStrip(unplaced, maxAlong, targetThickness, strategy, seeds[0]?.id);
                
                if (goldStrip.parts.length > 0) {
                    candidates.push(this.scoreStrip(goldStrip, maxWidth, maxHeight, strategy, features));
                }
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
    seedId: string | null
  ): Omit<CandidateStrip, 'finalScore' | 'remnantScore' | 'efficiency' | 'stackingBonus'> {
    const stripParts: CandidateStrip['parts'] = [];
    let currentAlong = 0; 
    const usedIds = new Set<string>();
    const availablePool = [...pool];

    while (currentAlong < maxAlong) {
        let anchor = null;
        if (usedIds.size === 0 && seedId) {
            const potentialSeed = availablePool.find(p => p.id === seedId);
            if (potentialSeed) {
                const fitsN = potentialSeed.height <= maxCross && (currentAlong + potentialSeed.width) <= maxAlong;
                const fitsR = potentialSeed.width <= maxCross && (currentAlong + potentialSeed.height) <= maxAlong;
                if (fitsN || fitsR) {
                    anchor = potentialSeed;
                }
            }
        }
        
        if (!anchor) {
            const remainingAlong = maxAlong - currentAlong;
            
            // v47.3: Knapsack Strike - Si queda poco espacio, buscar el ajuste perfecto (Best-Fit)
            const candidates = availablePool.filter(p => !usedIds.has(p.id));
            
            if (remainingAlong < 1200) {
                // Modo Precisión: Buscar pieza que más se acerque a remainingAlong sin pasarse
                let bestFit: InternalPart | null = null;
                let minGap = Infinity;
                
                for (const p of candidates) {
                    const okN = p.height <= maxCross && (currentAlong + p.width) <= maxAlong;
                    const okR = p.width <= maxCross && (currentAlong + p.height) <= maxAlong;
                    
                    if (okN) {
                        const gap = maxAlong - (currentAlong + p.width);
                        if (gap >= 0 && gap < minGap) { minGap = gap; bestFit = p; }
                    }
                    if (okR) {
                        const gap = maxAlong - (currentAlong + p.height);
                        if (gap >= 0 && gap < minGap) { minGap = gap; bestFit = p; }
                    }
                }
                anchor = bestFit;
            } else {
                // Modo Fuerza Bruta: El primero que quepa de la lista sugerida (ya viene pesada por área)
                anchor = candidates.find(p => {
                    const canN = p.height <= maxCross && (currentAlong + p.width) <= maxAlong;
                    const canR = p.width <= maxCross && (currentAlong + p.height) <= maxAlong;
                    return canN || canR;
                }) || null;
            }
        }

        if (!anchor) break;

        const okN = anchor.height <= maxCross && (currentAlong + anchor.width) <= maxAlong;
        const okR = anchor.width <= maxCross && (currentAlong + anchor.height) <= maxAlong;

        // v47.2.5: Rotación Inteligente - Preferir la que deje más 'pista libre' (min Along)
        let aRot = false;
        if (okN && okR) {
            const alongN = anchor.width;
            const alongR = anchor.height;
            aRot = alongR < alongN; 
        } else if (okR) {
            aRot = true;
        }

        const aAlong = aRot ? anchor.height : anchor.width;
        const aCross = aRot ? anchor.width : anchor.height;

        // DOBLE CHECK DE SEGURIDAD
        if (aCross > maxCross || (currentAlong + aAlong) > maxAlong) break;

        stripParts.push({
            piece: anchor,
            rotated: aRot,
            x: strategy === 'horizontal' ? currentAlong : 0,
            y: strategy === 'horizontal' ? 0 : currentAlong
        });
        usedIds.add(anchor.id);

        const colWidthAlong = aAlong;
        let currentCrossInCol = aCross + this.kerf;

        const fillersPool = availablePool
            .filter(p => !usedIds.has(p.id))
            .sort((a, b) => b.height - a.height);

        while (currentCrossInCol < maxCross) {
            const remainingCross = maxCross - currentCrossInCol;
            if (remainingCross < 0) break;

            const filler = fillersPool.find(p => {
                if (usedIds.has(p.id)) return false;
                const fOkN = p.height <= remainingCross && p.width <= colWidthAlong;
                const fOkR = p.width <= remainingCross && p.height <= colWidthAlong;
                return fOkN || fOkR;
            });

            if (!filler) break;

            const fCanN = filler.height <= remainingCross && filler.width <= colWidthAlong;
            const fCanR = filler.width <= remainingCross && filler.height <= colWidthAlong;
            
            // v47.2.5: Para el relleno, preferir lo que consuma menos espesor (Cross)
            let fRot = false;
            if (fCanN && fCanR) {
                const crossN = filler.height;
                const crossR = filler.width;
                fRot = crossR < crossN;
            } else if (fCanR) {
                fRot = true;
            }

            const fAlong = fRot ? filler.height : filler.width;
            const fCross = fRot ? filler.width : filler.height;

            if (fCross > remainingCross || fAlong > colWidthAlong) break;

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
    strategy: 'horizontal' | 'vertical',
    features: FeatureFlags
  ): CandidateStrip {
    const GOLD_MEASURES = [600, 500, 450, 300, 150];
    const MIN_MACHINE_CUT = 60;
    const TOTAL_TRIM = 10;
    const MARGEN_REFILADO = 15;
    const isClosingPhase = features.isClosingPhase || false;

    const usedArea = strip.parts.reduce((acc, p) => acc + (p.piece.width * p.piece.height), 0);
    
    // v47.2.5: EL APRETÓN FINAL (Afinamiento Balístico)
    const maxAlongValue = strategy === 'horizontal' ? containerW : containerH;
    const totalArea = strip.thickness * maxAlongValue;
    const efficiency = (usedArea / (totalArea || 1)) * 100;

    const containerDim = strategy === 'horizontal' ? containerH : containerW;
    const netRemaining = containerDim - strip.thickness - TOTAL_TRIM;
    const alongGap = maxAlongValue - strip.length;

    let remnantScore = 0;
    
    if (netRemaining > 0 && netRemaining < MIN_MACHINE_CUT) {
      remnantScore -= 50; 
    }

    if (isClosingPhase) {
        for (const gold of GOLD_MEASURES) {
            const diff = netRemaining - gold;
            if (diff >= 0 && diff <= MARGEN_REFILADO) {
                remnantScore += 20; 
                break; 
            }
            if (diff < 0 && diff >= -MARGEN_REFILADO) {
                remnantScore -= 10; 
            }
        }
        if (netRemaining >= 800) remnantScore += 15;
    }

    // 1. Penalización por "Hueco de Inutilidad"
    if (alongGap > this.kerf && alongGap < 100) {
        remnantScore -= 500; 
    }

    // 2. Bonus de "Guillotina Larga" (Apretón Final)
    const touchesBorders = strip.length >= (maxAlongValue - 15);
    if (touchesBorders) {
        remnantScore += 200; 
    }

    const pieceCountWeight = 50.0; 
    const pieceCountBonus = strip.parts.length * pieceCountWeight;
    
    const currentAlongAxis = new Set(strip.parts.map(p => strategy === 'horizontal' ? p.x : p.y));
    const stackingBonus = (strip.parts.length / (currentAlongAxis.size || 1)) * 35;

    const multiplier = touchesBorders ? 15 : (isClosingPhase ? 10 : 1);
    const finalScore = 
        (efficiency * 0.9) + 
        (remnantScore * multiplier) + 
        stackingBonus + 
        pieceCountBonus;

    if (isClosingPhase && netRemaining > 100) {
        console.log(`[EXCELENCIA] Strip: ${strip.thickness}mm | RemNeto: ${netRemaining.toFixed(1)} | RemScore: ${remnantScore} | Final: ${finalScore.toFixed(1)}`);
    }

    if (strip.thickness > containerDim + 0.1) {
        return { ...strip, efficiency: 0, remnantScore: 0, stackingBonus: 0, finalScore: -999999 };
    }

    return { 
        ...strip, 
        efficiency, 
        remnantScore, 
        stackingBonus, 
        finalScore 
    };
  }
}
