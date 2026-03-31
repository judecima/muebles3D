/**
 * Benchmark Industrial A/B v44.8: Auditoría Profunda de KPIs
 * Compara v44.7.2 (Legacy) vs v44.8 (Balanced Industrial)
 * 
 * Uso: npx tsx src/test-optimizer/test-real-case.ts
 */

import { runOptimization } from '../server/optimizer/cutOptimizer';

const testParts = [
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
];

const panelW = 2750;
const panelH = 1830;

function deepAudit(result: any) {
  const panels = result.optimizedLayout;
  const debugEvents = result.debugEvents || [];

  // 1. Eficiencia por Panel
  const effByPanel = panels.map((p: any) => p.efficiency);
  
  // 2. Transferencias Indebidas P1->P2
  const p1Leftovers = panels[0]?.parts.filter((p: any) => p.isLeftover) || [];
  const p2Pieces = panels[1]?.parts.filter((p: any) => !p.isLeftover) || [];
  let potentialP1Fits = 0;
  for (const p2 of p2Pieces) {
    const orientations = [{ w: p2.width, h: p2.height }, { w: p2.height, h: p2.width }];
    let fits = false;
    for (const rem of p1Leftovers) {
      for (const opt of orientations) {
        if (opt.w <= rem.width + 0.5 && opt.h <= rem.height + 0.5) { fits = true; break; }
      }
      if (fits) break;
    }
    if (fits) {
      potentialP1Fits++;
      console.log(`[AUDIT] Transferencia detectada: ${p2.name} (${p2.width}x${p2.height})`);
    }
  }

  // 3. Calidad del Sobrante del Último Panel
  const lastPanel = panels[panels.length - 1];
  const lastLeftovers = lastPanel?.parts.filter((p: any) => p.isLeftover) || [];
  const biggestLastLeftoverArea = Math.max(...(lastLeftovers.map((l: any) => l.width * l.height)), 0);
  const noodlesCount = lastLeftovers.filter((l: any) => Math.min(l.width, l.height) < 60).length;

  // 4. Activaciones de Modos
  const modes = { fill: 0, hybrid: 0, remanent: 0 };
  debugEvents.forEach((e: any) => {
    if (e.type === 'PIECE_SELECT' && e.metadata?.modeTransitionState) {
      modes[e.metadata.modeTransitionState as keyof typeof modes]++;
    }
  });

  // 5. Impacto de Rescue (LRP)
  let lrpTriggered = 0;
  let lrpSuccess = 0;
  debugEvents.forEach((e: any) => {
    if (e.metadata?.lastReasonablePassTriggered) {
      lrpTriggered++;
      if (e.winner) lrpSuccess++;
    }
  });

  return {
    panelCount: panels.length,
    effByPanel,
    totalEff: result.totalEfficiency,
    potentialP1Fits,
    biggestLastLeftoverM2: biggestLastLeftoverArea / 1000000,
    noodlesCount,
    modes,
    lrpTriggered,
    lrpSuccess,
    lrpCeremonial: lrpTriggered - lrpSuccess
  };
}

console.log('=== AUDITORÍA INDUSTRIAL A/B: v44.7.2 vs v44.8 ===\n');

// RAMA A: v44.7.2 (Legacy)
console.log('\n--- AUDITORÍA RAMA A (v44.7.2) ---');
const resA = runOptimization(testParts, panelW, panelH, 18, true, 4.5, 10, false);
const auditA = deepAudit(resA);

// RAMA B: v44.8 (Balanced)
console.log('\n--- AUDITORÍA RAMA B (v44.8.1-final) ---');
const resB = runOptimization(testParts, panelW, panelH, 18, true, 4.5, 10, true);
const auditB = deepAudit(resB);

console.log(`| KPI Industrial | v44.7.2 (Legacy) | v44.8 (Balanced) | Impacto (Delta) |`);
console.log(`| :--- | :--- | :--- | :--- |`);
console.log(`| Paneles Totales | ${auditA.panelCount} | ${auditB.panelCount} | ${auditB.panelCount - auditA.panelCount} |`);
console.log(`| Eficiencia P1 | ${auditA.effByPanel[0]?.toFixed(2)}% | ${auditB.effByPanel[0]?.toFixed(2)}% | ${(auditB.effByPanel[0] - auditA.effByPanel[0]).toFixed(2)}% |`);
console.log(`| Eficiencia P2 | ${auditA.effByPanel[1]?.toFixed(2) || 'N/A'}% | ${auditB.effByPanel[1]?.toFixed(2) || 'N/A'}% | ${((auditB.effByPanel[1] || 0) - (auditA.effByPanel[1] || 0)).toFixed(2)}% |`);
console.log(`| Eficiencia Último Panel | ${auditA.effByPanel[auditA.effByPanel.length - 1]?.toFixed(2)}% | ${auditB.effByPanel[auditB.effByPanel.length - 1]?.toFixed(2)}% | ${(auditB.effByPanel[auditB.effByPanel.length - 1] - auditA.effByPanel[auditA.effByPanel.length - 1]).toFixed(2)}% |`);
console.log(`| Eficiencia Global | ${auditA.totalEff.toFixed(2)}% | ${auditB.totalEff.toFixed(2)}% | ${(auditB.totalEff - auditA.totalEff).toFixed(2)}% |`);
console.log(`| Transferencias P1->P2 | ${auditA.potentialP1Fits} | ${auditB.potentialP1Fits} | ${auditB.potentialP1Fits - auditA.potentialP1Fits} |`);
console.log(`| Sobrante Premium Último (m²) | ${auditA.biggestLastLeftoverM2.toFixed(3)} | ${auditB.biggestLastLeftoverM2.toFixed(3)} | ${(auditB.biggestLastLeftoverM2 - auditA.biggestLastLeftoverM2).toFixed(3)} |`);
console.log(`| Retazos <60mm (Noodles) | ${auditA.noodlesCount} | ${auditB.noodlesCount} | ${auditB.noodlesCount - auditA.noodlesCount} |`);

console.log(`\n=== IMPACTO DEL RESCATE (Last Reasonable Pass) ===`);
console.log(`Activaciones: ${auditB.lrpTriggered}`);
console.log(`Colocaciones Reales (Impacto): ${auditB.lrpSuccess}`);
console.log(`Activaciones Ceremoniales: ${auditB.lrpCeremonial}`);

console.log(`\n=== DISTRIBUCIÓN DE MODOS (v44.8) ===`);
console.log(`Decisiones en FILL: ${auditB.modes.fill}`);
console.log(`Decisiones en HYBRID: ${auditB.modes.hybrid}`);
console.log(`Decisiones en REMANENT: ${auditB.modes.remanent}`);

const improvement = 
    (auditB.potentialP1Fits < auditA.potentialP1Fits) && 
    (auditB.panelCount <= auditA.panelCount) && 
    (auditB.lrpSuccess > 0);

console.log(`\nVEREDICTO FINAL:`);
if (improvement) {
    console.log(`"v44.8 mejora realmente a v44.7.2: Reduce transferencias indebidas mediante rescate activo sin degradar el conteo de paneles."`);
} else {
    console.log(`"v44.8 corrige transferencias pero no mejora suficiente para reemplazar baseline."`);
}
