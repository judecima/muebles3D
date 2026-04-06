export type MemberType = 
    | 'stud' 
    | 'track' 
    | 'header' 
    | 'truss_top_chord' 
    | 'truss_bottom_chord' 
    | 'truss_web' 
    | 'cripple' 
    | 'jack' 
    | 'king';

export type AnalysisModel = 'TRUSS_2D' | 'BEAM_2D' | 'FRAME_2D';

export type LoadCase = 'D' | 'L' | 'S' | 'W';

export interface Node3D {
    id: string;
    x: number;
    y: number;
    z: number;
}

export interface MemberRelease {
    axial: boolean;
    shearY: boolean;
    momentZ: boolean;
}

export interface Member {
    id: string;
    memberType: MemberType;
    analysisModel: AnalysisModel;
    profileId: string;
    startNodeId: string;
    endNodeId: string;
    
    releaseStart: MemberRelease;
    releaseEnd: MemberRelease;

    // Metadatos de Trazabilidad Constructiva
    panelId?: string;
    wallId?: string;
    roofPlaneId?: string;
}

export type LoadType = 'POINT' | 'DISTRIBUTED_Y';

export interface Load {
    id: string;
    loadCase: LoadCase;
    type: LoadType;
    source: string; // Trazabilidad: 'roof_weight', 'snow_applied', 'reaction_transfer'
    
    // Si es POINT
    nodeId?: string;
    fX?: number;
    fY?: number;
    fZ?: number;

    // Si es DISTRIBUTED_Y (ej. a lo largo de un Member o una longitud equivalente)
    memberId?: string;
    wY?: number; // Carga N/mm
}

export type SupportCondition = 'PINNED' | 'ROLLER' | 'FIXED';

export interface Support {
    nodeId: string;
    condition: SupportCondition;
    
    // Explicit DoF constraints if non-standard
    restrictedDX?: boolean;
    restrictedDY?: boolean;
    restrictedDZ?: boolean;
    restrictedRX?: boolean;
    restrictedRY?: boolean;
    restrictedRZ?: boolean;
}

export interface GlobalStructuralModel {
    nodes: Record<string, Node3D>;
    members: Record<string, Member>;
    loads: Load[];
    supports: Support[];
}
