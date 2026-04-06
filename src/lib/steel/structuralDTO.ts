// src/lib/steel/structuralDTO.ts
import { Node3D } from '../../server/steel/domain/model';
import { Reaction } from '../../server/steel/analysis/AnalysisResult';
import { MemberCheckSummary } from '../../server/steel/checks/types';

export interface DTOMember {
    id: string;
    memberType: string;
    profileId: string;
    startNodeId: string;
    endNodeId: string;
    status: 'SAFE' | 'WARNING' | 'FAIL';
    utilization?: number;
    forces?: {
        axialN?: number;
        shearY_N?: number;
        momentZ_Nmm?: number;
    };
    governingEquation?: string;
    message?: string;
}

export interface HouseStructuralViewModel {
    nodes: Record<string, Node3D>;
    members: Record<string, DTOMember>;
    reactions: Reaction[];
    checks: MemberCheckSummary[];
    warnings: string[];
    solverInfo?: {
        coreVersion: string;
        stable: boolean;
    };
}
