// src/server/steel/checks/types.ts

export type CheckType =
    | 'TENSION'
    | 'COMPRESSION'
    | 'FLEXURE'
    | 'AXIAL_FLEXURE_INTERACTION';

export type CheckStatus = 'SAFE' | 'WARNING' | 'FAIL';

export interface CheckResult {
    memberId: string;
    checkType: CheckType;
    demand: {
        axialN?: number;
        momentZ_Nmm?: number;
        shearY_N?: number;
    };
    capacity: {
        axialTensionN?: number;
        axialCompressionN?: number;
        momentZ_Nmm?: number;
    };
    utilization: number;
    status: CheckStatus;
    governingEquation: string;
    message: string;
    warnings: string[];
}

export interface MemberCheckSummary {
    memberId: string;
    profileId: string;
    memberType: string;
    results: CheckResult[];
    controllingResult: CheckResult;
}

// Variables Geométricas en MM derivadas de perfil o coordenadas
export interface MemberGeometry {
    L_mm: number;
    A_mm2: number;
    Ix_mm4: number;
    rx_mm: number;
    Sx_mm3?: number;  // Puede no existir
}
