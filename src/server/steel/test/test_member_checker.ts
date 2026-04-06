// src/server/steel/test/test_member_checker.ts
import { MemberCheckerPRO } from '../checks/MemberChecker';
import { Member, Node3D } from '../domain/model';
import { MemberResult } from '../analysis/AnalysisResult';

function runTests() {
    console.log("=== INICIANDO VALIDACIÓN MEMBER CHECKER PRO ===\n");

    const nodes: Record<string, Node3D> = {
        'N1': { id: 'N1', x: 0, y: 0, z: 0 },
        'N2': { id: 'N2', x: 0, y: 2500, z: 0 }, // Stud L = 2500
        'N3': { id: 'N3', x: 3000, y: 0, z: 0 }, // Truss L = 3000
    };

    const cases = [
        {
            name: "Barra de Cercha (Tracción Pura)",
            member: { id: 'M_TRUSS_T', memberType: 'truss_bottom_chord', profileId: "PGC-100-0.9", startNodeId: 'N1', endNodeId: 'N3' } as Member,
            res: { forces: { axialN: 15000, momentZ_Nmm: 0, shearY_N: 0 } } as MemberResult
        },
        {
            name: "Jack Stud (Compresión Pura / Pandeo)",
            member: { id: 'M_JACK', memberType: 'jack', profileId: "PGC-100-0.9", startNodeId: 'N1', endNodeId: 'N2' } as Member,
            res: { forces: { axialN: -8000, momentZ_Nmm: 0, shearY_N: 0 } } as MemberResult
        },
        {
            name: "Dintel (Flexión Pura)",
            member: { id: 'M_HEADER', memberType: 'header', profileId: "PGC-100-1.25", startNodeId: 'N1', endNodeId: 'N3' } as Member,
            res: { forces: { axialN: 0, momentZ_Nmm: 850000, shearY_N: 0 } } as MemberResult // 850 N.m
        },
        {
            name: "King Stud (Interacción Axial + Flexión)", // Por ejemplo, compresión + Viento
            member: { id: 'M_KING', memberType: 'king', profileId: "PGC-100-0.9", startNodeId: 'N1', endNodeId: 'N2' } as Member,
            res: { forces: { axialN: -4000, momentZ_Nmm: 300000, shearY_N: 0 } } as MemberResult
        }
    ];

    cases.forEach(c => {
        const checkSummary = MemberCheckerPRO.checkMember(c.member, c.res, nodes);
        console.log(`[TEST] ${c.name} (${c.member.profileId})`);
        
        checkSummary.results.forEach(res => {
            console.log(`  -> Check: ${res.checkType}`);
            console.log(`     Demanda: ${JSON.stringify(res.demand)}`);
            console.log(`     Capacidad: ${JSON.stringify(res.capacity)}`);
            console.log(`     Gobernante: ${res.governingEquation}`);
            console.log(`     Utilización: ${(res.utilization * 100).toFixed(1)}% -> [${res.status}]`);
            if (res.warnings.length > 0) console.log(`     (!) Warnings: ${res.warnings.join(' | ')}`);
        });

        console.log(`  => RESULTADO FINAL: ${checkSummary.controllingResult.status} (Max Util: ${(checkSummary.controllingResult.utilization * 100).toFixed(1)}%)\n`);
    });
}

runTests();
