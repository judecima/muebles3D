import { runOptimization } from '../server/optimizer/cutOptimizer';
import * as fs from 'fs';

interface TestCase {
    name: string;
    parts: any[];
    panelW: number;
    panelH: number;
}

const cases: TestCase[] = [
    {
        name: "v44-Reference (Industrial)",
        panelW: 2750,
        panelH: 1830,
        parts: [
            { name: 'P-629x570', width: 629, height: 570, thickness: 18, quantity: 4, grainDirection: 'libre' },
            { name: 'P-610x570', width: 610, height: 570, thickness: 18, quantity: 4, grainDirection: 'libre' },
            { name: 'P-500x178', width: 500, height: 178, thickness: 18, quantity: 6, grainDirection: 'libre' },
            { name: 'P-500x582', width: 500, height: 582, thickness: 18, quantity: 2, grainDirection: 'libre' },
            { name: 'P-500x562', width: 500, height: 562, thickness: 18, quantity: 1, grainDirection: 'libre' },
            { name: 'P-582x150', width: 582, height: 150, thickness: 18, quantity: 4, grainDirection: 'libre' },
            { name: 'P-463x150', width: 463, height: 150, thickness: 18, quantity: 3, grainDirection: 'libre' },
            { name: 'P-562x150', width: 562, height: 150, thickness: 18, quantity: 2, grainDirection: 'libre' },
            { name: 'P-622x245', width: 622, height: 245, thickness: 18, quantity: 2, grainDirection: 'libre' },
            { name: 'P-602x245', width: 602, height: 245, thickness: 18, quantity: 1, grainDirection: 'libre' },
            { name: 'P-70x482',  width: 70,  height: 482, thickness: 18, quantity: 6, grainDirection: 'libre' },
            { name: 'P-470x490', width: 470, height: 490, thickness: 18, quantity: 2, grainDirection: 'libre' },
            { name: 'P-495x490', width: 495, height: 490, thickness: 18, quantity: 1, grainDirection: 'libre' },
            { name: 'P-577x453', width: 577, height: 453, thickness: 18, quantity: 1, grainDirection: 'libre' },
            { name: 'P-578x470', width: 578, height: 470, thickness: 18, quantity: 2, grainDirection: 'libre' },
            { name: 'P-234x606', width: 234, height: 606, thickness: 18, quantity: 1, grainDirection: 'libre' },
            { name: 'P-248x606', width: 248, height: 606, thickness: 18, quantity: 1, grainDirection: 'libre' },
            { name: 'P-100x490', width: 100, height: 490, thickness: 18, quantity: 1, grainDirection: 'libre' },
            { name: 'P-530x400', width: 530, height: 400, thickness: 18, quantity: 2, grainDirection: 'libre' },
            { name: 'P-145x400', width: 145, height: 400, thickness: 18, quantity: 2, grainDirection: 'libre' },
            { name: 'P-530x117', width: 530, height: 117, thickness: 18, quantity: 1, grainDirection: 'libre' },
            { name: 'P-382x117', width: 382, height: 117, thickness: 18, quantity: 2, grainDirection: 'libre' },
            { name: 'P-193x117', width: 193, height: 117, thickness: 18, quantity: 1, grainDirection: 'libre' },
            { name: 'P-177x117', width: 177, height: 117, thickness: 18, quantity: 1, grainDirection: 'libre' },
            { name: 'P-124x117', width: 124, height: 117, thickness: 18, quantity: 1, grainDirection: 'libre' },
            { name: 'P-400x128', width: 400, height: 128, thickness: 18, quantity: 2, grainDirection: 'libre' },
            { name: 'P-530x100', width: 530, height: 100, thickness: 18, quantity: 1, grainDirection: 'libre' },
            { name: 'P-250x100', width: 250, height: 100, thickness: 18, quantity: 1, grainDirection: 'libre' },
            { name: 'P-315x100', width: 315, height: 100, thickness: 18, quantity: 1, grainDirection: 'libre' },
            { name: 'P-382x100', width: 382, height: 100, thickness: 18, quantity: 1, grainDirection: 'libre' },
            { name: 'P-197x100', width: 197, height: 100, thickness: 18, quantity: 1, grainDirection: 'libre' },
        ]
    },
    {
        name: "Massive Repetition (Stability)",
        panelW: 2440,
        panelH: 1220,
        parts: [
            { name: 'R-700x400', width: 700, height: 400, thickness: 18, quantity: 15, grainDirection: 'libre' },
            { name: 'R-500x300', width: 500, height: 300, thickness: 18, quantity: 20, grainDirection: 'libre' },
            { name: 'R-200x200', width: 200, height: 200, thickness: 18, quantity: 40, grainDirection: 'libre' },
        ]
    },
    {
        name: "Extreme Variety (Long-Tail)",
        panelW: 2750,
        panelH: 1830,
        parts: Array.from({ length: 40 }, (_, i) => ({
            name: `U-${i}`,
            width: 300 + Math.floor(Math.random() * 500),
            height: 200 + Math.floor(Math.random() * 400),
            thickness: 18,
            quantity: 1,
            grainDirection: 'libre'
        }))
    },
    {
        name: "Narrow & Long (Dominant Stress)",
        panelW: 2750,
        panelH: 1830,
        parts: [
            { name: 'N-2400x120', width: 2400, height: 120, thickness: 18, quantity: 6, grainDirection: 'libre' },
            { name: 'N-1500x80', width: 1500, height: 80, thickness: 18, quantity: 10, grainDirection: 'libre' },
            { name: 'N-500x500', width: 500, height: 500, thickness: 18, quantity: 4, grainDirection: 'libre' },
        ]
    },
    {
        name: "Orphan Risk (Small Pool)",
        panelW: 2440,
        panelH: 1220,
        parts: [
            { name: 'S-800x400', width: 800, height: 400, thickness: 18, quantity: 2, grainDirection: 'libre' },
            { name: 'S-400x400', width: 400, height: 400, thickness: 18, quantity: 2, grainDirection: 'libre' },
            { name: 'S-70x500',  width: 70,  height: 500, thickness: 18, quantity: 4, grainDirection: 'libre' },
        ]
    }
];

function analyzeRun(name: string, result: any, totalPiecesInPool: number) {
    const events = result.debugEvents || [];
    const downgradeEvents = events.filter((e: any) => e.type === 'BLOCK_DOWNGRADED_FOR_CONSOLIDATION');
    const blockedEvents = events.filter((e: any) => e.type === 'PIECE_BLOCKED');
    
    // --- AUDITORÍA DE JERARQUÍA PLAUSIBLE (v44.7.2) ---
    const panels = result.optimizedLayout;
    let priorityInversionMinorCount = 0;
    let priorityInversionMajorCount = 0;
    
    // Obtener Opportunity Score final de cada panel
    const finalOpportunityByPanel: Record<number, number> = {};
    events.forEach((e: any) => {
        if (e.metadata?.currentPanelOpportunityScore !== undefined) {
            finalOpportunityByPanel[e.panelNumber] = parseFloat(e.metadata.currentPanelOpportunityScore);
        }
    });

    for (let i = 0; i < panels.length - 1; i++) {
        const pCurrent = panels[i];
        const pNext = panels[i + 1];
        const delta = pNext.efficiency - pCurrent.efficiency;
        
        if (delta > 0) {
            let justified = false;
            const oppCurrent = finalOpportunityByPanel[pCurrent.panelNumber] || 1.0;
            
            if (delta <= 2.0) {
                justified = true;
                priorityInversionMinorCount++;
            } else {
                // Inversión Mayor (> 2%)
                if (oppCurrent < 0.25) justified = true;
                else if (pNext.panelNumber === panels.length) justified = true;
                
                if (!justified) priorityInversionMajorCount++;
            }
        }
    }

    // Identificar piezas únicas rescatadas y sus evaluaciones
    const pieceEvals: Record<string, number> = {};
    downgradeEvents.forEach((d: any) => {
        pieceEvals[d.pieceId] = (pieceEvals[d.pieceId] || 0) + 1;
    });

    const uniqueRescueCount = Object.keys(pieceEvals).length;
    const downgradeEvalCount = downgradeEvents.length;
    
    // Identificar piezas colocadas
    const placements = events.filter((e: any) => e.type === 'PIECE_PLACED' || (e.type === 'PIECE_SELECT' && e.winner));
    const placedPieceIds = new Set(placements.map((p: any) => p.pieceId));
    
    const placedRescueCount = Object.keys(pieceEvals).filter(id => placedPieceIds.has(id)).length;
    
    // Métricas de repetición
    const avgDowngradeEvalsPerRescuedPiece = uniqueRescueCount > 0 ? (downgradeEvalCount / uniqueRescueCount) : 0;
    const maxDowngradeEvalsForSinglePiece = uniqueRescueCount > 0 ? Math.max(...Object.values(pieceEvals)) : 0;

    const totalPanelArea = result.optimizedLayout.length * result.optimizedLayout[0].width * result.optimizedLayout[0].height;
    const usedAreaTotal = result.optimizedLayout.reduce((acc: number, p: any) => acc + (p.efficiency / 100) * (p.width * p.height), 0);
    const efficiency = totalPanelArea > 0 ? (usedAreaTotal / totalPanelArea) : 0;

    return {
        caseName: name,
        piecesTotal: totalPiecesInPool,
        panels: result.totalPanels,
        efficiency: (efficiency * 100).toFixed(2) + '%',
        priorityInversionMinorCount,
        priorityInversionMajorCount,
        panelPriorityRespected: priorityInversionMajorCount === 0,
        
        // Métricas de Auditoría Industrial (Normalizadas)
        downgradeEvalCount,
        uniqueRescueCount,
        placedRescueCount,
        
        downgradeEvalRate: (downgradeEvalCount / totalPiecesInPool).toFixed(3),
        uniqueRescueRate: (uniqueRescueCount / totalPiecesInPool).toFixed(3),
        placedRescueRate: (placedRescueCount / totalPiecesInPool).toFixed(3),
        rescueWasteRate: uniqueRescueCount > 0 ? ((uniqueRescueCount - placedRescueCount) / uniqueRescueCount).toFixed(3) : "0.000",
        
        avgDowngradeEvalsPerRescuedPiece: avgDowngradeEvalsPerRescuedPiece.toFixed(2),
        maxDowngradeEvalsForSinglePiece,
        
        blockedCount: blockedEvents.length,
        blockedRate: (blockedEvents.length / totalPiecesInPool).toFixed(3),
        
        // Métricas de Cierre de Banda
        bandCloserApplied: events.filter((e: any) => e.metadata?.bandCloserApplied).length,
        bandCloserBlocked: events.filter((e: any) => e.metadata?.bandCloserBlockedByAlternative).length
    };
}

console.log('=== SUITE DE REGRESIÓN: GATE DE PRODUCCIÓN (Métricas Normalizadas) ===\n');

const report: any[] = [];

for (const tc of cases) {
    const totalPieces = tc.parts.reduce((acc, p) => acc + p.quantity, 0);
    
    // Solo ejecutamos la versión REFINED (Actual) ya que el motor está congelado para cambios de lógica.
    const resRefined = runOptimization(tc.parts, tc.panelW, tc.panelH, 18, true, 4.5, 10);
    const m = analyzeRun(tc.name, resRefined, totalPieces);
    
    // Criterios PASS/FAIL industriales
    const pass = (parseFloat(m.rescueWasteRate) <= 0.10) && 
                 (parseFloat(m.uniqueRescueRate) < 0.60) &&
                 (parseFloat(m.avgDowngradeEvalsPerRescuedPiece) < 15);

    report.push({
        caseName: tc.name,
        piecesTotal: totalPieces,
        panels: m.panels,
        efficiency: m.efficiency,
        downgradeEvalCount: m.downgradeEvalCount,
        uniqueRescueCount: m.uniqueRescueCount,
        placedRescueCount: m.placedRescueCount,
        downgradeEvalRate: m.downgradeEvalRate,
        uniqueRescueRate: m.uniqueRescueRate,
        placedRescueRate: m.placedRescueRate,
        rescueWasteRate: m.rescueWasteRate,
        avgDowngradeEvalsPerRescuedPiece: m.avgDowngradeEvalsPerRescuedPiece,
        maxDowngradeEvalsForSinglePiece: m.maxDowngradeEvalsForSinglePiece,
        bandCloserApplied: m.bandCloserApplied,
        bandCloserBlocked: m.bandCloserBlocked,
        verdict: pass ? 'PASS' : 'FAIL'
    });
}

// Mostrar Reporte Final
console.log(JSON.stringify(report, null, 2));

console.log('\n--- TABLA RESUMEN Veredicto ---');
report.forEach(r => {
    console.log(`${r.caseName.padEnd(30)} | PANELS: ${r.panels} | EFF: ${r.efficiency} | BC_APPLIED: ${r.bandCloserApplied} | PASS: ${r.verdict === 'PASS' ? '✅' : '❌'}`);
});

const allPass = report.every(r => r.verdict === 'PASS');
console.log(`\nESTADO FINAL: ${allPass ? 'APTO PARA PRODUCCIÓN 🚀' : 'CAPACIDAD BETA CONTROLADA ⚠️'}`);

fs.writeFileSync('regression-report.json', JSON.stringify(report, null, 2));
