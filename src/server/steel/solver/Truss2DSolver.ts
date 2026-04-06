import * as math from 'mathjs';
import { Member, Load, Node3D } from '../domain/model';
import { Reaction, MemberResult } from '../analysis/AnalysisResult';
import { STEEL_PROFILES } from '../profilesDB'; // Asumiendo acceso a BBDD de perfiles

export class Truss2DSolver {
    // Unidades del motor:
    // Longitud: mm
    // Fuerza: N
    // Momento: N·mm
    // Módulo E: 203000 MPa (N/mm2)
    private E = 203000; 

    public solveTruss(
        trussMembers: Member[], 
        trussNodes: Node3D[], 
        appliedLoads: Load[], 
        supportNodeIds: string[]
    ): { 
        memberResults: Record<string, MemberResult>, 
        reactions: Reaction[],
        stable: boolean,
        warnings: string[],
        error?: string
    } {
        const warnings: string[] = [];
        
        // Node Indexing for Matrix assembly
        const nodeMap = new Map<string, number>();
        trussNodes.forEach((n, idx) => nodeMap.set(n.id, idx));
        const numNodes = trussNodes.length;

        if (numNodes === 0 || trussMembers.length === 0) {
            return { memberResults: {}, reactions: [], stable: false, warnings, error: 'Geometría vacía' };
        }

        // Initialize K and F
        const size = numNodes * 2;
        const K = math.zeros(size, size) as math.Matrix;
        const F_applied = math.zeros(size, 1) as math.Matrix;

        // Assembly F
        // Convención de signos:
        // +Y = Arriba (Anti-gravedad)
        // -Y = Abajo (Gravedad)
        // +X = Derecha
        appliedLoads.forEach(load => {
            if (load.type === 'POINT' && load.nodeId) {
                const idx = nodeMap.get(load.nodeId);
                if (idx !== undefined) {
                    const currX = F_applied.get([idx * 2, 0]) as number;
                    const currY = F_applied.get([idx * 2 + 1, 0]) as number;
                    // Acumular conservando el signo matemático intacto
                    F_applied.set([idx * 2, 0], currX + (load.fX || 0));
                    F_applied.set([idx * 2 + 1, 0], currY + (load.fY || 0));
                }
            }
        });

        // Assembly K
        trussMembers.forEach(mem => {
            const idx1 = nodeMap.get(mem.startNodeId);
            const idx2 = nodeMap.get(mem.endNodeId);
            if (idx1 === undefined || idx2 === undefined) {
                warnings.push(`Miembro ${mem.id} conecta a nodo no provisto.`);
                return;
            }

            const n1 = trussNodes[idx1];
            const n2 = trussNodes[idx2];
            
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const L = Math.sqrt(dx*dx + dy*dy);

            // Validación de degeneración geométrica
            if (L === 0) {
                warnings.push(`Miembro ${mem.id} tiene longitud L=0. Ignorando en matriz global.`);
                return;
            }
            
            const c = dx / L;
            const s = dy / L;

            // Extracción de Propiedades del Perfil
            const p = STEEL_PROFILES[mem.profileId] || STEEL_PROFILES["PGC-100-0.9"];
            const A_mm2 = p.area * 100; // cm2 -> mm2
            
            const kElem = (this.E * A_mm2) / L;

            const idxs = [idx1 * 2, idx1 * 2 + 1, idx2 * 2, idx2 * 2 + 1];
            const k = [
                [c*c, c*s, -c*c, -c*s],
                [c*s, s*s, -c*s, -s*s],
                [-c*c, -c*s, c*c, c*s],
                [-c*s, -s*s, c*s, s*s]
            ];

            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    const currentVal = K.get([idxs[i], idxs[j]]) as number;
                    K.set([idxs[i], idxs[j]], currentVal + k[i][j] * kElem);
                }
            }
        });

        // Boundary Conditions (Condiciones de Borde)
        const freeDofs: number[] = [];
        for (let i = 0; i < size; i++) freeDofs.push(i);

        // Assume simple supports for the truss ends (Pinned/Roller)
        const constrainedDofs: number[] = [];
        supportNodeIds.forEach((sid, i) => {
            const idx = nodeMap.get(sid);
            if (idx !== undefined) {
                constrainedDofs.push(idx * 2 + 1); // Fijo en Y (Apoyo vertical)
                // Fijar en X a todos los que estén en x=0 (es decir, el extremo izquierdo de cada cercha)
                // para evitar mecanismos de cuerpo libre horizontal en cerchas paralelas desconectadas.
                const n = trussNodes[idx];
                if (n.x === 0 || i === 0) {
                    constrainedDofs.push(idx * 2); 
                }
            }
        });

        constrainedDofs.sort((a,b) => b-a).forEach(dof => {
            freeDofs.splice(dof, 1);
        });

        const numFree = freeDofs.length;
        if (numFree === size) {
             return { memberResults: {}, reactions: [], stable: false, warnings, error: 'Sistema sin apoyos (Mecanismo).' };
        }

        const Kff = math.zeros(numFree, numFree) as math.Matrix;
        const Ff = math.zeros(numFree, 1) as math.Matrix;

        for (let i = 0; i < numFree; i++) {
            Ff.set([i, 0], F_applied.get([freeDofs[i], 0]));
            for (let j = 0; j < numFree; j++) {
                Kff.set([i, j], K.get([freeDofs[i], freeDofs[j]]));
            }
        }

        let Uf: any;
        try {
            Uf = math.lusolve(Kff, Ff);
        } catch(e) {
            return { memberResults: {}, reactions: [], stable: false, warnings, error: 'Matriz Singlular de Rigidez (Inestabilidad / Mecanismo).' };
        }

        const U = math.zeros(size, 1) as math.Matrix;
        for (let i = 0; i < numFree; i++) {
            U.set([freeDofs[i], 0], Uf.get([i, 0]));
        }

        // Calculate Internal Forces
        // Convención explícita: 
        // Axial > 0 = Tracción (+N)
        // Axial < 0 = Compresión (-N)
        const memberResults: Record<string, MemberResult> = {};
        trussMembers.forEach(mem => {
            const idx1 = nodeMap.get(mem.startNodeId)!;
            const idx2 = nodeMap.get(mem.endNodeId)!;
            const n1 = trussNodes[idx1];
            const n2 = trussNodes[idx2];
            
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const L = Math.sqrt(dx*dx + dy*dy);
            if (L === 0) return; // Ya reportado

            const c = dx / L;
            const s = dy / L;

            const u1x = U.get([idx1 * 2, 0]) as number;
            const u1y = U.get([idx1 * 2 + 1, 0]) as number;
            const u2x = U.get([idx2 * 2, 0]) as number;
            const u2y = U.get([idx2 * 2 + 1, 0]) as number;

            const p = STEEL_PROFILES[mem.profileId] || STEEL_PROFILES["PGC-100-0.9"];
            const A_mm2 = p.area * 100;
            
            const force_N = ((this.E * A_mm2) / L) * ((u2x - u1x) * c + (u2y - u1y) * s);
            
            memberResults[mem.id] = {
                memberId: mem.id,
                forces: { axialN: force_N, shearY_N: 0, momentZ_Nm: 0 },
                utilization: 0,
                status: 'SAFE' 
            };
        });

        // Calculate Reactions F_internal = K * U
        // Y hallamos el equilibrio R = F_internal - F_applied
        const F_internal_req = math.multiply(K, U) as math.Matrix;
        const reactions: Reaction[] = [];
        
        supportNodeIds.forEach(sid => {
            const idx = nodeMap.get(sid);
            if (idx !== undefined) {
                const rx = (F_internal_req.get([idx * 2, 0]) as number) - (F_applied.get([idx * 2, 0]) as number);
                const ry = (F_internal_req.get([idx * 2 + 1, 0]) as number) - (F_applied.get([idx * 2 + 1, 0]) as number);
                
                reactions.push({
                    nodeId: sid,
                    rX_N: rx,
                    rY_N: ry,
                    rZ_N: 0
                });
            }
        });

        return { memberResults, reactions, stable: true, warnings };
    }
}
