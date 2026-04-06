// src/server/steel/checks/interaction.ts
import { CheckResult } from './types';
import { calculateInteractionLinear, getCheckStatus } from './formulas';

export function evaluateInteraction(
    memberId: string, 
    axialResult: CheckResult, 
    flexureResult: CheckResult
): CheckResult {
    
    // Safety check for nulls
    const demN = axialResult.demand.axialN ? Math.abs(axialResult.demand.axialN) : 0;
    const demM = flexureResult.demand.momentZ_Nmm ? Math.abs(flexureResult.demand.momentZ_Nmm) : 0;

    const capN = axialResult.capacity.axialTensionN || axialResult.capacity.axialCompressionN || 0;
    const capM = flexureResult.capacity.momentZ_Nmm || 0;
    
    // Simplificación Industrial (Suma Directa H3.1 análoga a AISC/AISI para esbelteces moderadas o tracción)
    const util = calculateInteractionLinear(demN, capN, demM, capM);

    const warnings: string[] = [];
    warnings.push(...axialResult.warnings);
    warnings.push(...flexureResult.warnings);
    
    // Filter duplicates
    const uniqueWarnings = Array.from(new Set(warnings));

    return {
        memberId,
        checkType: 'AXIAL_FLEXURE_INTERACTION',
        demand: { axialN: demN, momentZ_Nmm: demM },
        capacity: { axialCompressionN: capN, momentZ_Nmm: capM }, // Generalizamos bajo CompN o TenN como limite usado
        utilization: util,
        status: getCheckStatus(util),
        governingEquation: '|N| / Pn + |M| / Mn <= 1.0',
        message: `Interacción combinada evaluada linealmente. P/Pn = ${(capN > 0 ? demN/capN : 0).toFixed(2)}, M/Mn = ${(capM > 0 ? demM/capM : 0).toFixed(2)}.`,
        warnings: uniqueWarnings
    };
}
