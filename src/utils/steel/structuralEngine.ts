import { SteelOpening, SteelHouseConfig } from '@/lib/steel/types';

export interface HeaderAnalysis {
  type: 'single' | 'double' | 'triple' | 'tube' | 'truss';
  loadNmm: number;
  deflectionMm: number;
  maxAllowableDeflection: number;
  requiredIx: number;
}

export class StructuralEngine {
  // Constantes de ingeniería (Unidades: N, mm)
  private static readonly STEEL_MODULUS = 203000; // MPa (N/mm2)
  private static readonly PGC_IX_SINGLE = 185000; // mm4 (Perfil 100x0.9 aproximado)
  private static readonly TUBE_IX = 1200000; // mm4 (Tubo 100x100x3.2)
  private static readonly DESIGN_LOAD_KPA = 0.002; // 2 kN/m2 (Carga techo aproximada)

  /**
   * Realiza un análisis estructural completo del vano basado en AISI S240.
   */
  static calculateHeader(opening: SteelOpening, config: SteelHouseConfig): HeaderAnalysis {
    const L = opening.width;
    
    // 1. Cálculo de Carga Tributaria (w)
    // Suponemos que el muro soporta la mitad del ancho de la casa (tributaria)
    const tributaryWidth = config.length / 2; 
    const loadNmm = (this.DESIGN_LOAD_KPA * tributaryWidth); // N/mm lineal sobre el dintel

    // 2. Límite de Flecha (L/360 para vanos con terminaciones frágiles)
    const maxAllowableDeflection = L / 360;

    // 3. Momento de Inercia Requerido (Ix_req)
    // Fórmula de flecha para viga simplemente apoyada: delta = (5 * w * L^4) / (384 * E * I)
    // Despejando I: I = (5 * w * L^4) / (384 * E * delta_max)
    const requiredIx = (5 * loadNmm * Math.pow(L, 4)) / (384 * this.STEEL_MODULUS * maxAllowableDeflection);

    // 4. Selección de solución técnica
    let type: HeaderAnalysis['type'] = 'single';
    
    if (L > 2500 || requiredIx > this.TUBE_IX) {
      type = 'truss';
    } else if (requiredIx > (this.PGC_IX_SINGLE * 3)) {
      type = 'tube';
    } else if (requiredIx > (this.PGC_IX_SINGLE * 2)) {
      type = 'triple';
    } else if (requiredIx > this.PGC_IX_SINGLE) {
      type = 'double';
    }

    // Calcular flecha real con la solución elegida (solo para debug/visual)
    let currentIx = this.PGC_IX_SINGLE;
    if (type === 'double') currentIx *= 2;
    if (type === 'triple') currentIx *= 3;
    if (type === 'tube') currentIx = this.TUBE_IX;
    if (type === 'truss') currentIx = 10000000; // Inercia virtual muy alta para cerchas

    const deflectionMm = (5 * loadNmm * Math.pow(L, 4)) / (384 * this.STEEL_MODULUS * currentIx);

    return {
      type,
      loadNmm,
      deflectionMm,
      maxAllowableDeflection,
      requiredIx
    };
  }
}
