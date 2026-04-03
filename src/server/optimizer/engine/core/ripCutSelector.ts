import { InternalPart } from '../types/engine';
import { StripGenerator, CandidateStrip } from './stripGenerator';

/**
 * SELECTOR DE RIP-CUT v46.0
 * Decide la estrategia global del panel basándose en la masa crítica.
 */
export class RipCutSelector {
  constructor(private generator: StripGenerator) {}

  /**
   * Analiza el pool y el contenedor para decidir el primer corte (Rip Cut).
   */
  selectInitialStrategy(
    pool: InternalPart[], 
    containerW: number, 
    containerH: number,
    features: any
  ): { strategy: 'horizontal' | 'vertical', bestStrip: CandidateStrip } {
    const unplaced = pool.filter(p => !p.placed);
    
    // 1. ANÁLISIS DE MASA CRÍTICA
    // Calculamos qué tan "anchas" o "altas" son las piezas respecto al panel
    let horizMass = 0;
    let vertMass = 0;

    for (const p of unplaced) {
      const area = p.width * p.height;
      if (p.width > containerW * 0.5) horizMass += area;
      if (p.height > containerH * 0.5) vertMass += area;
    }

    // Sugerencia inicial basada en la masa dominante
    const suggestedStrategy = horizMass >= vertMass ? 'horizontal' : 'vertical';

    // 2. EVALUACIÓN DE STRIPS (Simulación de 1 nivel)
    // Generamos los mejores strips para AMBAS orientaciones para validar la intuición
    // IMPORTANTE: El generador columnar ya filtra por dimensiones (dim > maxHeight/maxWidth)
    const hStrips = this.generator.generateStrips(unplaced, containerW, containerH, 'horizontal', features);
    const vStrips = this.generator.generateStrips(unplaced, containerW, containerH, 'vertical', features);

    const bestH = hStrips[0];
    const bestV = vStrips[0];

    // 3. DECISIÓN DE ORIENTACIÓN GANADORA
    if (!bestH && !bestV) return { strategy: suggestedStrategy, bestStrip: null as any };
    if (!bestH) return { strategy: 'vertical', bestStrip: bestV };
    if (!bestV) return { strategy: 'horizontal', bestStrip: bestH };

    // Si una orientación permite una franja de espesor masivo (> 70% de la placa)
    // y la otra no, forzamos esa orientación (Estrategia Lepton de "Grandes Bloques")
    const hRatio = bestH.thickness / containerH;
    const vRatio = bestV.thickness / containerW;

    if (hRatio > 0.7 && vRatio < 0.5) return { strategy: 'horizontal', bestStrip: bestH };
    if (vRatio > 0.7 && hRatio < 0.5) return { strategy: 'vertical', bestStrip: bestV };

    // Por defecto, comparar scores finales (Eficiencia + Stacking + Remnant)
    const scoreDiff = bestH.finalScore - bestV.finalScore;

    // Umbral de confianza: Si la diferencia es notable (> 10%), tomamos la mejor localmente.
    // Si son similares, respetamos la Masa Crítica analizada en el paso 1.
    if (Math.abs(scoreDiff) < 10) {
      return { 
        strategy: suggestedStrategy, 
        bestStrip: suggestedStrategy === 'horizontal' ? bestH : bestV 
      };
    }

    return scoreDiff > 0 
      ? { strategy: 'horizontal', bestStrip: bestH } 
      : { strategy: 'vertical', bestStrip: bestV };
  }
}
