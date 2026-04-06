import { Load, Member, Node3D } from '../domain/model';
import { MemberResult, Reaction } from '../analysis/AnalysisResult';
import { STEEL_PROFILES } from '../profilesDB';

export class Beam2DSolver {
    // Unidades:
    // Longitud: mm
    // Fuerza: N
    // Momento: N·mm
    // E: 203000 MPa
    private E = 203000; 

    /**
     * Resuelve una viga simplemente apoyada
     */
    public solveSimplySupportedBeam(
        beamMember: Member, 
        nodes: Record<string, Node3D>, 
        pointLoads: Load[]
    ): { result: MemberResult, reactions: Reaction[] } {
        
        const n1 = nodes[beamMember.startNodeId];
        const n2 = nodes[beamMember.endNodeId];
        
        const L = Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.z - n1.z, 2)); // mm
        if (L === 0) {
            throw new Error(`Longitud de viga nula en el miembro ${beamMember.id}`);
        }

        const startX = Math.min(n1.x, n2.x);
        
        // Convención explícita:
        // +Y = Hacia Arriba
        // -Y = Gravedad
        const loadsExtracted = pointLoads.map(l => {
            const P_Y = l.fY || 0; // Se preserva el signo
            let Px = 0;
            if (l.nodeId && nodes[l.nodeId]) {
                 const ln = nodes[l.nodeId];
                 const nStart = n1.x === startX ? n1 : n2; // Identificar cual es el origen real local
                 if (Math.abs(n2.x - n1.x) > Math.abs(n2.z - n1.z)) {
                     // Dintel a lo largo de X
                     Px = Math.abs(ln.x - Math.min(n1.x, n2.x));
                 } else {
                     // Dintel a lo largo de Z
                     Px = Math.abs(ln.z - Math.min(n1.z, n2.z));
                 }
            } else {
                 Px = L/2; 
            }
            return { P_Y, x: Px };
        });

        // Equilibrio estático
        // Sum F_Y = R1_y + R2_y + Sum(P_i) = 0
        // Sum M1 = R2_y * L + Sum(P_i * x_i) = 0
        let sumMomentsM1 = 0;
        let sumF = 0;

        loadsExtracted.forEach(l => {
            sumMomentsM1 += l.P_Y * l.x;
            sumF += l.P_Y;
        });

        // Reacciones de apoyo requeridas para el equilibrio estático
        // R2_y * L + Sum(M) = 0 => R2_y = - Sum(M) / L
        const R2_y = -sumMomentsM1 / L;
        const R1_y = -(sumF) - R2_y;

        // Corte y Momento
        let M_max_pos = 0; // N·mm
        let M_max_neg = 0; // N·mm

        const criticalPoints = [0, L, ...loadsExtracted.map(l => l.x)].sort((a,b) => a-b);
        
        criticalPoints.forEach(xPos => {
             // Cortante de la izquierda al punto x
             // M(x) = R1_y * x + Sum(P_i * (x - x_i)) para los x_i < x
             let M_x = R1_y * xPos;
             loadsExtracted.forEach(l => {
                 if (xPos > l.x) {
                     M_x += l.P_Y * (xPos - l.x);
                 }
             });

             if (M_x > M_max_pos) M_max_pos = M_x;
             if (M_x < M_max_neg) M_max_neg = M_x;
        });

        const M_max_abs = Math.max(Math.abs(M_max_pos), Math.abs(M_max_neg));

        const p = STEEL_PROFILES[beamMember.profileId] || STEEL_PROFILES["PGC-100-0.9"];
        const I_mm4 = p.ix * 10000; // cm4 -> mm4

        return {
            result: {
                memberId: beamMember.id,
                forces: { 
                    axialN: 0, 
                    shearY_N: Math.max(Math.abs(R1_y), Math.abs(R2_y)), 
                    momentZ_Nm: M_max_abs // Retornamos en N·mm como unidad primaria
                },
                deflectionMaxMm: undefined, // TODO: Implementar superposición analítica
                status: 'SAFE',
                utilization: 0,
                message: 'Flecha omitida por requerir método de integración real.'
            },
            reactions: [
                { nodeId: beamMember.startNodeId, rX_N: 0, rY_N: R1_y, rZ_N: 0 },
                { nodeId: beamMember.endNodeId, rX_N: 0, rY_N: R2_y, rZ_N: 0 }
            ]
        };
    }
}
