// src/server/steel/test/test_panel_generator.ts
import fs from 'fs';
import path from 'path';
import { StructuralEngine } from '../structuralEngine';
import { SteelHouseConfig } from '../../../lib/steel/types';

const SNAPSHOTS_DIR = path.join(__dirname, 'snapshots');
if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

function getTestConfig(): SteelHouseConfig {
    return {
        unit: 'mm',
        width: 4000,
        length: 3000,
        globalWallHeight: 2500,
        structuralMode: true,
        xRayMode: false,
        explosionFactor: 0,
        layers: { foundation: true, exteriorPanels: true, interiorPanels: false, horizontalBlocking: true, steelProfiles: true, structuralDiagrams: true },
        foundation: { type: 'radier', slabThickness: 150 },
        walls: [
            { id: "W1", length: 4000, height: 2500, studSpacing: 400, rotation: 0, x: 0, z: 0, openings: [] },
            { id: "W2", length: 3000, height: 2500, studSpacing: 400, rotation: 90, x: 4000, z: 0, openings: [] },
            { id: "W3", length: 4000, height: 2500, studSpacing: 400, rotation: 45, x: 0, z: 0, openings: [
                 { id: "OP1", type: "window", width: 1200, height: 1000, position: 1000, sillHeight: 900 }
            ] }
        ],
        internalWalls: [],
        loads: { roofDeadKpa: 0.15, roofLiveKpa: 0.50, snowKpa: 1.0, windKpa: 0.6, floorDeadKpa: 0.3, floorLiveKpa: 2.0 },
        profilePreferences: { studs: "PGC-100-0.9", tracks: "PGU-100-0.9", headers: "PGC-100-1.25", trusses: "PGC-100-0.9" },
        roof: { enabled: true, type: 'two_slope', slope: 15, trussSpacing: 1000, eaveLength: 400 }
    };
}

function runPanelTest() {
    console.log("====================================================");
    console.log("🖼️  TEST PANEL GENERATOR - PHASE 5");
    console.log("====================================================\n");

    StructuralEngine.STEEL_CORE_VERSION = 'fem_v1';
    const config = getTestConfig();
    const dto = StructuralEngine.getStructuralViewModel(config);

    if (!dto || !dto.panelDrawings) {
        console.error("❌ Error: No se generaron planos de paneles.");
        process.exit(1);
    }

    console.log(`✅ Planos generados: ${dto.panelDrawings.length}`);

    dto.panelDrawings.forEach(panel => {
        console.log(`\n📦 Panel: ${panel.panelLabel} (WallId: ${panel.wallId})`);
        console.log(`   |- Dimensiones: ${panel.widthMm}x${panel.heightMm} mm`);
        console.log(`   |- Miembros: ${panel.members.length}`);
        console.log(`   |- Aberturas: ${panel.openings.length}`);
        
        // Validar que los labels sean correctos
        const labels = panel.members.map(m => m.label);
        const hasDups = new Set(labels).size !== labels.length;
        if (hasDups) console.error("   ❌ Error: Labels duplicados en el panel.");
        else console.log("   ✅ Labels únicos y consistentes.");

        // Validar proyeccion u,v
        const firstStud = panel.members.find(m => m.memberType === 'stud');
        if (firstStud) {
            console.log(`   |- Ej. Stud: ${firstStud.label} | Start: (${firstStud.start.x}, ${firstStud.start.y}) | End: (${firstStud.end.x}, ${firstStud.end.y})`);
        }
    });

    // Guardar snapshot
    fs.writeFileSync(path.join(SNAPSHOTS_DIR, 'T5_PANELS.json'), JSON.stringify(dto.panelDrawings, null, 2));
    console.log(`\n💾 Snapshot guardado en ${path.join(SNAPSHOTS_DIR, 'T5_PANELS.json')}`);
}

runPanelTest();
