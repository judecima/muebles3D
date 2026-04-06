import { Truss2DSolver } from '../solver/Truss2DSolver';
import { Beam2DSolver } from '../solver/Beam2DSolver';
import { Node3D, Member, Load } from '../domain/model';

function testTrussSolver() {
    console.log("=== TEST TRUSS 2D SOLVER ===");
    const solver = new Truss2DSolver();
    
    // Nodos en mm
    const nodes: Node3D[] = [
        { id: 'N1', x: 0, y: 0, z: 0 },
        { id: 'N2', x: 3000, y: 0, z: 0 },
        { id: 'N3', x: 1500, y: 1500, z: 0 }
    ];

    const members: Member[] = [
        { id: 'M1', memberType: 'truss_bottom_chord', profileId: "PGC-100-0.9", startNodeId: 'N1', endNodeId: 'N2', analysisModel: 'TRUSS_2D', releaseStart: {axial:false,shearY:false,momentZ:true}, releaseEnd: {axial:false,shearY:false,momentZ:true} },
        { id: 'M2', memberType: 'truss_top_chord', profileId: "PGC-100-0.9", startNodeId: 'N1', endNodeId: 'N3', analysisModel: 'TRUSS_2D', releaseStart: {axial:false,shearY:false,momentZ:true}, releaseEnd: {axial:false,shearY:false,momentZ:true} },
        { id: 'M3', memberType: 'truss_top_chord', profileId: "PGC-100-0.9", startNodeId: 'N3', endNodeId: 'N2', analysisModel: 'TRUSS_2D', releaseStart: {axial:false,shearY:false,momentZ:true}, releaseEnd: {axial:false,shearY:false,momentZ:true} }
    ];

    // Carga de gravedad -> -Y
    const loads: Load[] = [
        { id: 'L1', loadCase: 'D', type: 'POINT', source: 'roof', nodeId: 'N3', fX: 0, fY: -5000, fZ: 0 }
    ];

    const result = solver.solveTruss(members, nodes, loads, ['N1', 'N2']);
    
    console.log(`Estabilidad: ${result.stable}`);
    if (result.error) console.log(`Error: ${result.error}`);
    console.log(`Reacciones:`);
    result.reactions.forEach(r => console.log(` - NODO ${r.nodeId}: X=${r.rX_N.toFixed(1)} N, Y=${r.rY_N.toFixed(1)} N (Req Apoyo)`));
    
    console.log(`Fuerzas Internas:`);
    Object.values(result.memberResults).forEach(res => {
         const type = res.forces.axialN > 0 ? 'TRACCIÓN' : 'COMPRESIÓN';
         console.log(` - ${res.memberId}: ${res.forces.axialN.toFixed(1)} N [${type}]`);
    });
}

function testBeamSolver() {
    console.log("\n=== TEST BEAM 2D SOLVER ===");
    const solver = new Beam2DSolver();

    const nodes: Record<string, Node3D> = {
        'N1': { id: 'N1', x: 0, y: 2500, z: 0 },
        'N2': { id: 'N2', x: 2000, y: 2500, z: 0 },
        'N3': { id: 'N3', x: 1000, y: 2500, z: 0 }, // Nodo central
        'N4': { id: 'N4', x: 500, y: 2500, z: 0 }  // Nodo excentrico
    };

    const beam: Member = {
        id: 'B1', memberType: 'header', profileId: "PGC-100-1.25", startNodeId: 'N1', endNodeId: 'N2',
        analysisModel: 'BEAM_2D', releaseStart: {axial:false,shearY:false,momentZ:false}, releaseEnd: {axial:false,shearY:false,momentZ:false}
    };

    // 1 Carga de gravedad -Y al centro, 1 carga excentrica -Y
    const pointLoads: Load[] = [
        { id: 'L1', loadCase: 'D', type: 'POINT', source: 'truss_reaction', nodeId: 'N3', fX: 0, fY: -1000, fZ: 0 },
        { id: 'L2', loadCase: 'L', type: 'POINT', source: 'truss_reaction', nodeId: 'N4', fX: 0, fY: -2000, fZ: 0 },
        // Carga viento ascendente "uplift"
        { id: 'L3', loadCase: 'W', type: 'POINT', source: 'wind_uplift', nodeId: 'N3', fX: 0, fY: +500, fZ: 0 }
    ];

    const { result, reactions } = solver.solveSimplySupportedBeam(beam, nodes, pointLoads);

    console.log(`Reacciones de Apoyo (Para equilibrar sistema):`);
    reactions.forEach(r => console.log(` - NODO ${r.nodeId}: Y=${r.rY_N.toFixed(1)} N`));
    
    console.log(`Envolvente Máxima Absoluta de Momento:`);
    console.log(` - M_max_abs: ${result.forces.momentZ_Nm.toFixed(1)} N.mm`);
    console.log(` - Cortante Max: ${result.forces.shearY_N.toFixed(1)} N`);
    console.log(` - Status Flecha: ${result.message}`);
}

testTrussSolver();
testBeamSolver();
