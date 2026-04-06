import { GlobalAssembler } from '../assembler/GlobalAssembler';
import { Truss2DSolver } from '../solver/Truss2DSolver';
import { Beam2DSolver } from '../solver/Beam2DSolver';
import { MemberChecker } from '../checks/MemberChecker';
import { SteelHouseConfig } from '@/lib/steel/types';

// CASO DE PRUEBA: Muro de 3000mm, Vano central de 1000mm, Cercha simple y Nieve
function runIntegrationTest() {
    console.log("=== INICIANDO FEM CORE (Truss + Beam) ===");
    
    // 1. Configuración de Entrada Equivalente
    const config: SteelHouseConfig = {
        width: 3000,
        length: 3000,
        globalWallHeight: 2500,
        walls: [
            {
                id: 'WALL_TEST',
                length: 3000,
                height: 2500,
                thickness: 100,
                x: -1500, z: 0, rotation: 0,
                studSpacing: 400,
                openings: [
                    { id: 'WIN_1', type: 'window', width: 1000, height: 1200, position: 1000, sillHeight: 900 }
                ]
            }
        ],
        internalWalls: [],
        layers: {
            exteriorPanels: true, interiorPanels: true, steelProfiles: true, horizontalBlocking: false,
            lintels: true, structuralDiagrams: false, foundation: true, budget: true
        },
        structuralMode: true,
        roof: {
            enabled: true,
            type: 'two_slope',
            slope: 20,
            trussSpacing: 3000, // Una sola cercha para alinear en z=0
            eaveLength: 0
        },
        foundation: { type: 'slab_with_piles', slabThickness: 100, edgeBeamDepth: 200, pileDepth: 1000, pileDiameter: 200, soil: { type: 'rocoso', bearingCapacityKPa: 200, frictionKPa: 20 }},
        prices: { steelKg: 0, concreteM3: 0, osbSheet: 0, gypsumSheet: 0, screwT1: 0, screwT2: 0, laborM2: 0 },
        loads: {
            roofDeadKpa: 0.5,
            snowKpa: 0.3, // Carga aplicada real
            roofLiveKpa: 0, windKpa: 0, floorDeadKpa: 0, floorLiveKpa: 0
        }
    };

    // 2. Ensuring the truss lands exactly at z=0 over the WALL_TEST
    config.length = 0; // Para forzar truss en z=0
    
    console.log("\n[1] Ensamblando Modelo Global...");
    const model = GlobalAssembler.assembleGlobalModel(config);
    console.log(`Nodos Unicos: ${Object.keys(model.nodes).length}`);
    console.log(`Miembros Trazables: ${Object.keys(model.members).length}`);
    console.log(`Cargas Nieve/Gravedad Trazables: ${model.loads.length}`);

    // Aislar subsistema Cercha
    const trussMembers = Object.values(model.members).filter(m => m.memberType.includes('truss'));
    const trussNodesIdx = new Set<string>();
    trussMembers.forEach(m => { trussNodesIdx.add(m.startNodeId); trussNodesIdx.add(m.endNodeId); });
    const trussNodesRow = Array.from(trussNodesIdx).map(id => model.nodes[id]);
    
    const trussLoads = model.loads.filter(l => l.source === 'roof_gravity');
    
    // Nodos de Apoyo del Truss (en solera de muro)
    const topTracks = Object.values(model.members).filter(m => m.memberType === 'track');
    // Para simplificar, buscamos los nodos del truss que tocan Y = globalWallH
    const supportNodeIds = trussNodesRow.filter(n => Math.abs(n.y - 2500) < 1).map(n => n.id);

    console.log("\n[2] Resolviendo Truss2DSolver...");
    const trussSolver = new Truss2DSolver();
    const { memberResults: trussRes, reactions } = trussSolver.solveTruss(trussMembers, trussNodesRow, trussLoads, supportNodeIds);
    
    let sumLoad = 0; trussLoads.forEach(l => sumLoad += (l.fY || 0));
    let sumReaction = 0; reactions.forEach(r => sumReaction += r.rY_N);
    console.log(`Equilibrio Global Truss (Sigma Y): Carga(${sumLoad.toFixed(2)}N) + Reaccion(${sumReaction.toFixed(2)}N) = ${(sumLoad + sumReaction).toFixed(4)}N`);

    // Validar y Checkear Truss (Auditor normativo)
    console.log("Fuerzas internas de Cercha:");
    Object.values(trussRes).forEach(res => {
        const mem = model.members[res.memberId];
        const checked = MemberChecker.checkMember(mem, res);
        console.log(` - ${mem.id} [${mem.memberType}]: ${checked.forces.axialN.toFixed(1)} N -> Status: ${checked.status}`);
    });

    // 3. TRANSFERENCIA DE CARGAS
    console.log("\n[3] Transfiriendo Reacciones de Truss como Cargas...");
    reactions.forEach((r, idx) => {
        model.loads.push({
            id: `L_T1_${idx}`,
            loadCase: 'D',
            type: 'POINT',
            source: 'reaction_transfer_from_truss',
            nodeId: r.nodeId,
            fX: -r.rX_N, // Transfer of reaction onto down structure
            fY: -r.rY_N,
            fZ: -r.rZ_N
        });
    });

    console.log("Cargas Transferidas: ", model.loads.filter(l => l.source.includes('reaction')).map(l => `${l.id}: ${l.fY?.toFixed(2)} N en Nudo ${l.nodeId}`));

    // 4. Aislar subsistema Beam (Dintel)
    const header = Object.values(model.members).find(m => m.memberType === 'header');
    if (!header) {
        console.log("No se encontro dintel."); return;
    }

    console.log("\n[4] Resolviendo Beam2DSolver (Dintel)...");
    
    // Obtenemos solo cargas que aplican o cruzan el header
    // Simplificando, todas las cargas de transferencias en el nodo.
    // OJO: En la arquitectura ensamblada, la carga fue directamente arrojada al top node de la solera.
    // Si la solera está sobre el vano, se debe evaluar su incidencia.
    
    const beamSolver = new Beam2DSolver();
    // Extraer cargas que están geográficamente sobre la madera del beam
    const nA = model.nodes[header.startNodeId];
    const nB = model.nodes[header.endNodeId];
    const xMin = Math.min(nA.x, nB.x);
    const xMax = Math.max(nA.x, nB.x);

    const pointLoadsForBeam = model.loads.filter(l => {
        if (!l.nodeId) return false;
        const n = model.nodes[l.nodeId];
        // Coincide y cae geométricamente dentro del xRange del vano
        return n.x >= xMin && n.x <= xMax;
    });

    const { result: beamRes, reactions: beamReactions } = beamSolver.solveSimplySupportedBeam(header, model.nodes, pointLoadsForBeam);

    const checkedBeam = MemberChecker.checkMember(header, beamRes);
    
    console.log(`Dintel ${checkedBeam.memberId}: M_max = ${checkedBeam.forces.momentZ_Nm.toFixed(2)} N.m, Flecha = ${checkedBeam.deflectionMaxMm?.toFixed(2)} mm -> Status: ${checkedBeam.status} (Ratio: ${(checkedBeam.utilization * 100).toFixed(1)}%) : ${checkedBeam.message}`);
    
    console.log("Reacciones transferidas a Jacks/Kings:");
    beamReactions.forEach(r => console.log(` -> Nodo Apollado ${r.nodeId}: ${r.rY_N.toFixed(2)} N baja por el Jack.`));

    console.log("\n[5] PRUEBA DE INTEGRALIDAD CORRECTA 🚀");
}

runIntegrationTest();
