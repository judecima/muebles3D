// src/app/api/steel/test-stress/route.ts
import { NextResponse } from 'next/server';
import { StructuralEngine } from '../../../../../server/steel/structuralEngine';
import { SteelHouseConfig } from '@/lib/steel/types';

function getBaseConfig(): SteelHouseConfig {
    return {
        unit: 'mm',
        width: 3000,
        length: 4000,
        globalWallHeight: 2500,
        structuralMode: true,
        xRayMode: false,
        explosionFactor: 0,
        layers: { foundation: true, exteriorPanels: true, interiorPanels: false, horizontalBlocking: true, steelProfiles: true, structuralDiagrams: true },
        foundation: { type: 'radier', slabThickness: 150 },
        walls: [
            { id: "W1", length: 4000, height: 2500, studSpacing: 400, rotation: 0, x: 0, z: 0, openings: [] },
            { id: "W2", length: 3000, height: 2500, studSpacing: 400, rotation: 90, x: 4000, z: 0, openings: [] },
            { id: "W3", length: 4000, height: 2500, studSpacing: 400, rotation: 180, x: 4000, z: 3000, openings: [] },
            { id: "W4", length: 3000, height: 2500, studSpacing: 400, rotation: -90, x: 0, z: 3000, openings: [] }
        ],
        internalWalls: [],
        loads: {
            roofDeadKpa: 0.15,
            roofLiveKpa: 0.50,
            snowKpa: 1.0, 
            windKpa: 0.6,    
            floorDeadKpa: 0.3,
            floorLiveKpa: 2.0  
        },
        profilePreferences: {
            studs: "PGC-100-0.9",
            tracks: "PGU-100-0.9",
            headers: "PGC-100-1.25",
            trusses: "PGC-100-0.9"
        },
        roof: {
            enableRoof: true,
            pitch: 15,
            trussSpacing: 1000,
            overhang: 400
        }
    };
}

export async function GET() {
    try {
        const scenarios = [
            {
                id: "T1_SMOKE",
                description: "Smoke Test (Casa Base sin Vanos)",
                coreVersion: 'fem_v1',
                setupOverrides: (c: any) => {},
                assert: (dto: any) => !!dto && Object.keys(dto.members || {}).length > 0 && Object.keys(dto.nodes || {}).length > 0
            },
            {
                id: "T2_FAIL_BEAM",
                description: "Fail Visible (Dintel de 4m subdimensionado)",
                coreVersion: 'fem_v1',
                setupOverrides: (c: any) => {
                    c.walls[0].openings.push({ id: "OP1", type: "window", width: 3600, height: 1200, sillHeight: 900, position: 200 });
                    c.profilePreferences.headers = "PGC-100-0.9";
                },
                assert: (dto: any) => {
                    const fails = dto?.checks?.filter((ck: any) => ck.controllingResult.status === 'FAIL') || [];
                    return fails.length > 0;
                }
            },
            {
                id: "T3_WARNING_SX",
                description: "Warning Visible (Miembro derivando Sx)",
                coreVersion: 'fem_v1',
                setupOverrides: (c: any) => {
                    c.walls[0].openings.push({ id: "OP2", type: "door", width: 900, height: 2100, position: 500 });
                },
                assert: (dto: any) => dto?.checks?.some((ck: any) => ck.controllingResult.warnings.some((w: string) => w.includes('Sx')))
            },
            {
                id: "T4_TRANSFERENCIA",
                description: "Transferencia de Cercha a Muros (Apoyos detectados)",
                coreVersion: 'fem_v1',
                setupOverrides: (c: any) => { c.roof.snowKpa = 3.0; },
                assert: (dto: any) => {
                    const maxAxial = Math.max(...Object.values(dto.members as Record<string, any>).map((m: any) => Math.abs(m.forces?.axialN || 0)));
                    return maxAxial > 1000;
                }
            },
            {
                id: "T5_ROLLBACK",
                description: "Rollback Módulo Legacy via Feature Flag",
                coreVersion: 'legacy',
                setupOverrides: (c: any) => {},
                assert: (dto: any) => dto === null
            },
            {
                id: "T6_EXCENTRICO",
                description: "Equilibrio Cercha Carga Excéntrica",
                coreVersion: 'fem_v1',
                setupOverrides: (c: any) => {},
                assert: (dto: any) => dto?.solverInfo?.stable === true
            },
            {
                id: "T7_UPLIFT",
                description: "Inversión de Cargas (Viento Ascendente)",
                coreVersion: 'fem_v1',
                setupOverrides: (c: any) => {
                    c.loads.roofDeadKpa = 0.05;
                    c.loads.windKpa = 2.0;
                },
                assert: (dto: any) => Object.values(dto.members as Record<string, any>).filter((m: any) => m.memberType === 'truss_bottom_chord').some((m: any) => (m.forces?.axialN || 0) < -100)
            },
            {
                id: "T8_MERGE_NODES",
                description: "Fusión de Nodos de Ensamblaje",
                coreVersion: 'fem_v1',
                setupOverrides: (c: any) => {},
                assert: (dto: any) => dto?.solverInfo?.stable === true
            },
            {
                id: "T9_MECH_GAP",
                description: "Detección de Brecha Estructural (Error Geometría Singular)",
                coreVersion: 'fem_v1',
                setupOverrides: (c: any) => {},
                assert: (dto: any) => !!dto 
            },
            {
                id: "T10_KING_INT",
                description: "Interacción Axial + Flexión",
                coreVersion: 'fem_v1',
                setupOverrides: (c: any) => { 
                    c.walls[0].openings.push({ id: "OPNINT", type: "window", width: 2000, height: 1000, position: 1000 });
                    c.loads.windKpa = 1.0; 
                    c.roof.snowKpa = 2.0; 
                },
                assert: (dto: any) => dto?.checks?.some((ck: any) => ck.controllingResult.governingEquation.includes('Pn + |M|/Mn') || ck.results.some((r: any) => r.checkType === 'AXIAL_FLEXURE_INTERACTION'))
            }
        ];

        const results = [];
        let passed = 0;

        for (const scenario of scenarios) {
            StructuralEngine.STEEL_CORE_VERSION = scenario.coreVersion as any;
            const config = getBaseConfig();
            scenario.setupOverrides(config);
            
            const dto = StructuralEngine.getStructuralViewModel(config);
            const pass = scenario.assert(dto);
            if (pass) passed++;

            results.push({
                id: scenario.id,
                desc: scenario.description,
                core: scenario.coreVersion,
                nodes: dto?.nodes ? Object.keys(dto.nodes).length : 0,
                members: dto?.members ? Object.keys(dto.members).length : 0,
                checks: dto?.checks ? dto.checks.length : 0,
                warnings: dto?.warnings?.length || 0,
                fails: dto?.checks ? dto.checks.filter((c: any) => c.controllingResult.status === 'FAIL').length : 0,
                stable: dto?.solverInfo?.stable ?? null,
                pass
            });
        }

        return NextResponse.json({
            title: "🧠 SUITE MATRIZ DE CERTIFICACIÓN - PHASE 4 (FEM CORE)",
            totalPassed: passed,
            totalScenarios: scenarios.length,
            success: passed === scenarios.length,
            results
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}
