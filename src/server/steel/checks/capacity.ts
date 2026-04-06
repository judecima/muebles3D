// src/server/steel/checks/capacity.ts
import { CheckResult, MemberGeometry, CheckType } from './types';
import { calculateFcr, getCheckStatus } from './formulas';

const FY_MPA = 345; // Default Fluencia (Acero Galvanizado Estructural Conformado en Frío)
const E_MPA = 203000;

export function evaluateTension(memberId: string, demandN: number, geom: MemberGeometry): CheckResult {
    // Capacidad Nominal a Tracción: Pnt = A * Fy
    const capacityN = geom.A_mm2 * FY_MPA;
    // Factor de Resistencia LRFD Típico. Simplificado a phi=1.0 por ser nominal/base, 
    // pero agregamos un phi_t=0.90 para ser prolijos industrialmente
    const phi_t = 0.90;
    const designCapacityN = capacityN * phi_t;
    
    // utilization
    const util = demandN / designCapacityN;

    const warnings: string[] = [];

    return {
        memberId,
        checkType: 'TENSION',
        demand: { axialN: demandN },
        capacity: { axialTensionN: designCapacityN },
        utilization: util,
        status: getCheckStatus(util),
        governingEquation: 'Pt = phi_t * A * Fy',
        message: `Tracción Crítica evaluada sobre area total A=${geom.A_mm2} mm2.`,
        warnings
    };
}

export function evaluateCompression(memberId: string, demandN: number, geom: MemberGeometry, KLr_esbeltez: number): CheckResult {
    const warnings: string[] = [];
    if (KLr_esbeltez > 200) {
        warnings.push("Esbeltez efectiva KL/r supera límite recomendado de 200 para compresión.");
    }
    
    const Fcr = calculateFcr(FY_MPA, E_MPA, KLr_esbeltez);
    const capacityN = geom.A_mm2 * Fcr;
    
    // Phi pandeo = 0.85 
    const phi_c = 0.85;
    const designCapacityN = capacityN * phi_c;
    
    const util = demandN / designCapacityN;

    return {
        memberId,
        checkType: 'COMPRESSION',
        demand: { axialN: demandN },
        capacity: { axialCompressionN: designCapacityN },
        utilization: util,
        status: getCheckStatus(util),
        governingEquation: 'Pc = phi_c * A * Fcr(KL/r)',
        message: `Pandeo evaluado con Esbeltez KL/r=${KLr_esbeltez.toFixed(1)}, Fcr=${Fcr.toFixed(1)} MPa.`,
        warnings
    };
}

export function evaluateFlexure(memberId: string, demandM_Nmm: number, geom: MemberGeometry): CheckResult {
    const warnings: string[] = [];
    let Sx = geom.Sx_mm3;
    
    // Derivar Sx si no existe. 
    // Si sabemos Ix (mm4), necesitamos c (distancia fibra neutra extrema). 
    // Si no sabemos la profundidad de la sección, no podemos derivarlo sin forzar un mock.
    if (!Sx) {
        warnings.push("Módulo Resistente Sx no detectado directamente desde Perfil. Derivando aproximadamente (Asumiendo Perfil PGC 100mm -> c=50mm)");
        const depth_approx = 100; // mm
        Sx = geom.Ix_mm4 / (depth_approx / 2);
    }

    // Mn = Sx * Fy (Flexión Base Elástica)
    const capacityM = Sx * FY_MPA;

    // Phi flexión = 0.90 o 0.95 (LRFD)
    const phi_b = 0.90;
    const designCapacityM = capacityM * phi_b;
    
    const util = demandM_Nmm / designCapacityM;

    return {
        memberId,
        checkType: 'FLEXURE',
        demand: { momentZ_Nmm: demandM_Nmm },
        capacity: { momentZ_Nmm: designCapacityM },
        utilization: util,
        status: getCheckStatus(util),
        governingEquation: 'Mb = phi_b * Sx * Fy',
        message: `Momento Resistente evaluado sobre Sx=${Sx.toFixed(1)} mm3.`,
        warnings
    };
}
