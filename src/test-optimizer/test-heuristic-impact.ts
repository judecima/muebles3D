import { runOptimization } from '../server/optimizer/cutOptimizer';
import * as fs from 'fs';

const caseIndustrial62 = {
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
};

console.log('=== TEST DE IMPACTO: HEURÍSTICA ADAPTATIVA COMPLEMENTARIA ===');

const result = runOptimization(caseIndustrial62.parts, caseIndustrial62.panelW, caseIndustrial62.panelH, 18, true, 4.5, 10);

console.log(`\nPaneles Totales: ${result.totalPanels}`);
result.optimizedLayout.forEach((p: any, i: number) => {
    console.log(`Panel #${i + 1} Eficiencia: ${p.efficiency.toFixed(2)}%`);
});

const events = result.debugEvents || [];
const tierStats = {
    high: 0,
    medium: 0,
    dimension_only: 0,
    none: 0,
    downgraded: 0,
    hbcConflictAvoided: 0
};

events.filter((e: any) => e.type === 'PIECE_SELECT' && e.winner).forEach((e: any) => {
    const tier = e.metadata?.industrialMatchTier;
    if (tier) (tierStats as any)[tier]++;
    if (e.metadata?.industrialMatchTierReason === 'downgraded_by_local_cost') tierStats.downgraded++;
    if (e.metadata?.hbcConflictAvoided) tierStats.hbcConflictAvoided++;
});

console.log('\nMétricas de Heurística Adaptativa:');
console.log(JSON.stringify(tierStats, null, 2));

const panelsPass = result.optimizedLayout[0].efficiency > 94 && (result.optimizedLayout[1]?.efficiency || 0) > 73;
console.log(`\n¿Cumple Objetivos (P1 > 94%, P2 > 73%): ${panelsPass ? '✅' : '❌'}`);

fs.writeFileSync('experimental-impact-62.json', JSON.stringify(result, null, 2));
