// src/server/steel/checks/formulas.ts

/**
 * Tensión Crítica Simplificada para Pandeo (Fcr_MPa).
 * Basado conceptualmente en la rama elástica e inelástica de Euler.
 * @param KLr_limit Esbeltez límite transicional (e.g. 4.71*sqrt(E/Fy) aprox)
 * @param Fy Tensión de Fluencia (MPa). Ejemplo: A36 -> 250 MPa, Cold Formed -> 345 MPa
 * @param E Modulo de Elasticidad (MPa). 203000 MPa
 * @param esbeltez_KLr Esbeltez efectiva max (KL/r)
 * @returns Tensión Crítica en MPa
 */
export function calculateFcr(Fy: number, E: number, esbeltez_KLr: number): number {
    if (esbeltez_KLr <= 0) return Fy;
    
    // Esfuerzo de pandeo elástico de Euler
    const Fe = (Math.PI * Math.PI * E) / (esbeltez_KLr * esbeltez_KLr);
    
    // Simplificación Industrial AISI-inspired:
    // Si Fe es mayor a Fy/2, estamos en pandeo inelástico (perfil corto/robusto).
    // Si Fe es menor, es pandeo elástico hiperbólico de Euler.
    
    if (esbeltez_KLr <= 1.5 * Math.sqrt(E / Fy)) { // Límite transicional ajustado AISI
        // Pandeo inelástico crudo simplificado: Fcr = (0.658^(Fy/Fe)) * Fy
        // Como no buscamos 100% full spec sino base robusta, usamos aproximación:
        const lambda_c = Math.sqrt(Fy / Fe);
        const Fcr = Math.pow(0.658, lambda_c * lambda_c) * Fy;
        return Fcr;
    } else {
        // Pandeo elástico
        const Fcr = 0.877 * Fe;
        return Fcr;
    }
}

/**
 * Fórmula de Interacción Simplificada
 * (P/Pn) + (M/Mn) <= 1.0
 */
export function calculateInteractionLinear(demandP: number, capacityP: number, demandM: number, capacityM: number): number {
    const termP = capacityP > 0 ? demandP / capacityP : 0;
    const termM = capacityM > 0 ? demandM / capacityM : 0;
    return termP + termM;
}

/**
 * Asignar Status de Check (Safe/Warning/Fail)
 */
export function getCheckStatus(utilization: number): 'SAFE' | 'WARNING' | 'FAIL' {
    if (utilization <= 0.90) return 'SAFE';
    if (utilization <= 1.00) return 'WARNING';
    return 'FAIL';
}
