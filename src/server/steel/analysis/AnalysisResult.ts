export type MemberStatus = 'SAFE' | 'WARNING' | 'FAIL';

export interface MemberForces {
    axialN: number;
    shearY_N: number;
    momentZ_Nm: number;
}

export interface MemberResult {
    memberId: string;
    forces: MemberForces;
    demandNode1Ratio?: number;
    demandNode2Ratio?: number;
    capacityAxialN?: number;
    capacityMomentNm?: number;
    utilization: number;
    status: MemberStatus;
    message?: string;
    deflectionMaxMm?: number;
}

export interface Reaction {
    nodeId: string;
    rX_N: number;
    rY_N: number;
    rZ_N: number;
    mX_Nm?: number;
    mY_Nm?: number;
    mZ_Nm?: number;
}

export interface NodalDisplacement {
    nodeId: string;
    dX_mm: number;
    dY_mm: number;
    dZ_mm: number;
}

export interface GlobalEquilibriumCheck {
    sumLoadsX_N: number;
    sumLoadsY_N: number;
    sumLoadsZ_N: number;
    sumReactionsX_N: number;
    sumReactionsY_N: number;
    sumReactionsZ_N: number;
    errorX: number;
    errorY: number;
    errorZ: number;
    isEquilibriumSatisfied: boolean;
}

export interface AnalysisResult {
    memberResults: Record<string, MemberResult>;
    reactions: Reaction[];
    displacements?: NodalDisplacement[];
    equilibrium: GlobalEquilibriumCheck;
    warnings: string[];
    isSafeOverall: boolean;
}
