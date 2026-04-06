import { SteelHouseConfig, SteelWall, SteelOpening } from '@/lib/steel/types';
import { 
    GlobalStructuralModel, 
    Member, 
    Load, 
    Support, 
    Node3D, 
    MemberType, 
    AnalysisModel,
    MemberRelease
} from '../domain/model';
import { NodeRegistry } from './NodeRegistry';

export class GlobalAssembler {
    
    public static assembleGlobalModel(config: SteelHouseConfig): GlobalStructuralModel {
        const registry = new NodeRegistry(1.0); // Tolerancia 1 mm
        const members: Record<string, Member> = {};
        const loads: Load[] = [];
        const supports: Support[] = [];
        
        let memberCounter = 1;

        const addMember = (
            type: MemberType, profileId: string, 
            n1: Node3D, n2: Node3D, 
            analysis: AnalysisModel, 
            relStart: MemberRelease, relEnd: MemberRelease,
            meta?: { wallId?: string, panelId?: string }
        ) => {
            const m: Member = {
                id: `M_${memberCounter++}`,
                memberType: type,
                analysisModel: analysis,
                profileId,
                startNodeId: n1.id,
                endNodeId: n2.id,
                releaseStart: relStart,
                releaseEnd: relEnd,
                ...meta
            };
            members[m.id] = m;
            return m;
        };

        const releaseRigid: MemberRelease = { axial: false, shearY: false, momentZ: false };
        const releasePinned: MemberRelease = { axial: false, shearY: false, momentZ: true };

        // 1. ENSAMBLAR MUROS Y DINTELES
        config.walls.forEach(wall => {
            const wallH = wall.heightStart || wall.height; // Simplificado para modelo
            const prefs = config.profilePreferences || {};
            const pguId = prefs.tracks || "PGU-100-0.9";
            const pgcId = prefs.studs || "PGC-100-0.9";
            const headerId = prefs.headers || "PGC-100-1.25";
            const trussId = prefs.trusses || "PGC-100-0.9";
            
            // Vector director del muro
            const rotRad = wall.rotation * Math.PI / 180;
            const dx = Math.cos(rotRad);
            const dz = -Math.sin(rotRad); // Sistema horario habitual o según tu render map

            let currentPos = 0;
            const studSpacing = 400; // Hardcoded default
            
            // Asumimos iteración simple sobre studs
            const numStuds = Math.ceil(wall.length / studSpacing) + 1;
            
            let lastBottomNode: Node3D | null = null;
            let lastTopNode: Node3D | null = null;

            for (let i = 0; i < numStuds; i++) {
                const posStr = i * studSpacing;
                const actualPos = Math.min(posStr, wall.length);
                
                const absX = wall.x + actualPos * dx;
                const absZ = wall.z + actualPos * dz;
                
                // Nodo Inferior
                const nodeB = registry.registerOrGet(absX, 0, absZ);
                // Nodo Superior
                const nodeT = registry.registerOrGet(absX, wallH, absZ);
                
                // Soporte Base (Cimentación)
                supports.push({
                    nodeId: nodeB.id,
                    condition: 'PINNED'
                });

                // Añadir Stud (Vertical)
                 addMember(
                     'stud', pgcId, nodeB, nodeT, 'FRAME_2D', 
                     releaseRigid, releaseRigid, { wallId: wall.id }
                 );

                // Conectar Soleras
                if (lastBottomNode && lastTopNode) {
                    // Track Bottom
                    addMember('track', pguId, lastBottomNode, nodeB, 'FRAME_2D', releaseRigid, releaseRigid, { wallId: wall.id });
                    // Track Top
                    addMember('track', pguId, lastTopNode, nodeT, 'FRAME_2D', releaseRigid, releaseRigid, { wallId: wall.id });
                }

                lastBottomNode = nodeB;
                lastTopNode = nodeT;
            }

            // Dinteles Simplificados (Para demostración del motor estructural)
            // Se asume que reemplazaría los top tracks en ese vano, pero para el prototipo 2.1 ensamblamos una viga independiente "Header" 
            wall.openings.forEach(op => {
                 const xL = wall.x + op.position * dx;
                 const zL = wall.z + op.position * dz;
                 const xR = wall.x + (op.position + op.width) * dx;
                 const zR = wall.z + (op.position + op.width) * dz;
                 const topY = op.type === 'window' ? (op.sillHeight || 900) + op.height : op.height;

                 const nodeL = registry.registerOrGet(xL, topY, zL);
                 const nodeR = registry.registerOrGet(xR, topY, zR);
                 
                 // Soporte de King/Jack (Asumimos bajan directo)
                 const nodeB_L = registry.registerOrGet(xL, 0, zL);
                 const nodeB_R = registry.registerOrGet(xR, 0, zR);

                 // Nodo Superior de King
                 const nodeT_L = registry.registerOrGet(xL, wallH, zL);
                 const nodeT_R = registry.registerOrGet(xR, wallH, zR);

                 // Header Beam
                 addMember('header', headerId, nodeL, nodeR, 'BEAM_2D', releaseRigid, releaseRigid, { wallId: wall.id });
                 // Jacks
                 addMember('jack', pgcId, nodeB_L, nodeL, 'FRAME_2D', releaseRigid, releaseRigid, { wallId: wall.id });
                 addMember('jack', pgcId, nodeB_R, nodeR, 'FRAME_2D', releaseRigid, releaseRigid, { wallId: wall.id });
                 // Kings
                 addMember('king', pgcId, nodeB_L, nodeT_L, 'FRAME_2D', releaseRigid, releaseRigid, { wallId: wall.id });
                 addMember('king', pgcId, nodeB_R, nodeT_R, 'FRAME_2D', releaseRigid, releaseRigid, { wallId: wall.id });
            });
        });

        // 2. ENSAMBLAR CERCHAS (COMPARTIENDO NODOS TOP_CHORD MURO)
        let loadCounter = 1;
        if (config.roof?.enabled) {
            const trussSpacing = config.roof.trussSpacing || 600;
            const numTrusses = Math.ceil(config.length / trussSpacing) + 1;
            const actualSpacing = config.length / (numTrusses - 1);
            
            const span = config.width; 
            const eave = config.roof.eaveLength || 0;
            const slopeRad = (config.roof.slope || 15) * Math.PI / 180;
            const height = (span / 2) * Math.tan(slopeRad); // Two Slope asumido para la prueba
            
            const prefs = config.profilePreferences || {};
            const trussId = prefs.trusses || "PGC-100-0.9";

            for (let i = 0; i < numTrusses; i++) {
                const zPos = i * actualSpacing; 
                
                // Extremos Bottom Chord (coincidentes con muros si la x del muro es exacto)
                // En el setup X de los muros: usualmente de 0 a config.width
                const startX = 0;
                const endX = config.width;
                const globalWallH = config.globalWallHeight;

                const nodeBL = registry.registerOrGet(startX, globalWallH, zPos);
                const nodeBR = registry.registerOrGet(endX, globalWallH, zPos);
                const nodeRidge = registry.registerOrGet(config.width/2, globalWallH + height, zPos);

                // Members Cercha
                addMember('truss_top_chord', trussId, nodeBL, nodeRidge, 'TRUSS_2D', releasePinned, releasePinned);
                addMember('truss_top_chord', trussId, nodeRidge, nodeBR, 'TRUSS_2D', releasePinned, releasePinned);
                
                // Web Central (King Post)
                const nodeBMid = registry.registerOrGet(config.width/2, globalWallH, zPos);
                // Dividir el bottom chord para enganchar
                addMember('truss_bottom_chord', trussId, nodeBL, nodeBMid, 'TRUSS_2D', releasePinned, releasePinned);
                addMember('truss_bottom_chord', trussId, nodeBMid, nodeBR, 'TRUSS_2D', releasePinned, releasePinned);
                
                addMember('truss_web', trussId, nodeBMid, nodeRidge, 'TRUSS_2D', releasePinned, releasePinned);

                // CARGAS GRAVITACIONALES Y VIENTO
                const spanM = span / 1000;
                const spacingM = actualSpacing / 1000;
                
                // Gravedad (Muerte + Nieve) va Hacia Abajo (-)
                // Viento (Succión/Uplift) va Hacia Arriba (+)
                const loadG_Kpa = (config.loads.roofDeadKpa || 0) + (config.loads.snowKpa || 0);
                const loadW_Kpa = config.loads.windKpa || 0; // Asumimos uplift de techo por simplicidad
                
                // Resultante Kpa (Positiva si viento gana, negativa si gravedad gana)
                const netRoofKpa = loadW_Kpa - loadG_Kpa;
                
                // Carga nodal simplificada [N]
                const loadRidgeN = netRoofKpa * 1000 * spanM * spacingM * 0.5; // Mitad a ridge
                const loadEdgeN = netRoofKpa * 1000 * spanM * spacingM * 0.25; // 1/4 a cada borde
                
                loads.push({
                    id: `L_${loadCounter++}`, nodeId: nodeRidge.id, loadCase: 'D', type: 'POINT', source: 'roof_gravity',
                    fX: 0, fY: loadRidgeN, fZ: 0
                });
                loads.push({
                    id: `L_${loadCounter++}`, nodeId: nodeBL.id, loadCase: 'D', type: 'POINT', source: 'roof_gravity',
                    fX: 0, fY: loadEdgeN, fZ: 0
                });
                loads.push({
                    id: `L_${loadCounter++}`, nodeId: nodeBR.id, loadCase: 'D', type: 'POINT', source: 'roof_gravity',
                    fX: 0, fY: loadEdgeN, fZ: 0
                });
            }
        }

        return {
            nodes: registry.getNodesRecord(),
            members,
            loads,
            supports
        };
    }
}
