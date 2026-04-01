// Benchmark Industrial A/B/C/D v45.0: Structural Pair Closure (Depth 1.5)
// Comprehensive audit of global closure heuristics and industrial efficiency.

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
  const panels = result.optimizedLayout || [];
  const debugEvents = result.debugEvents || [];
  const effByPanel = panels.map((p: any) => p.efficiency || 0);
  
  const lastPanel = panels[panels.length - 1];
  const lastLeftovers = lastPanel?.parts.filter((p: any) => p.isLeftover) || [];
  const biggestLastLeftoverArea = Math.max(...(lastLeftovers.map((l: any) => l.width * l.height)), 0);
  const noodlesCount = lastLeftovers.filter((l: any) => Math.min(l.width, l.height) < 60).length;

  let lookaheadWinnerChange = 0;
  let closureCriticalActivations = 0;
  let forcedConsumptionApplied = 0;
  let pairClosureApplied = 0;
  let pairClosureChangedWinnerCount = 0;
  let nearPerfectFoundCount = 0;
  let bestPairRatioSum = 0;
  let pairClosureEvents = 0;

  debugEvents.forEach((e: any) => {
    if (e.metadata?.lookaheadWinnerChange) lookaheadWinnerChange++;
    if (e.metadata?.closureCriticalZone) closureCriticalActivations++;
    if (e.metadata?.forcedConsumptionOrderingApplied) forcedConsumptionApplied++;
    if (e.metadata?.pairClosureApplied) {
      pairClosureApplied++;
      bestPairRatioSum += e.metadata.pairClosureBestRatio || 0;
      pairClosureEvents++;
      if (e.metadata.nearPerfectPairClosureFound) nearPerfectFoundCount++;
    }
    if (e.metadata?.pairClosureChangedWinner) pairClosureChangedWinnerCount++;
  });

  return {
    panelCount: panels.length,
    effByPanel,
    totalEff: result.totalEfficiency,
    biggestLastLeftoverM2: biggestLastLeftoverArea / 1_000_000,
    noodlesCount,
    lookaheadWinnerChange,
    pairClosureApplied,
    pairClosureChangedWinnerCount,
    nearPerfectFoundCount,
    avgPairRatio: pairClosureEvents > 0 ? (bestPairRatioSum / pairClosureEvents) : 0,
    timeMs: result.stats?.timeMs || 0,
  };
}

const BASE_FEATURES = {
  useStripLock: true,
  useSmartSplit: true,
  penalizeSmallLeftovers: true,
  useContinuityBonus: true,
  useGeometricContinuity: true,
  useBacktracking: true,
  useInvalidCache: true,
};

const runs = [
  { name: 'v44.7.2 (Legacy)', config: { ...BASE_FEATURES } },
  { name: 'v44.8.1 (Balanced)', config: { ...BASE_FEATURES, enableV44BalancedMode: true } },
  { name: 'v44.9.3-rev2e (P1-Aggr)', config: { ...BASE_FEATURES, enableV44BalancedMode: true, enableDepth1Lookahead: true, enableDepth1LookaheadV2: true, enableForcedConsumptionZone: true, enablePrimaryPanelAggression: true } },
  { name: 'v45.0 (Pair Closure)', config: { ...BASE_FEATURES, enableV44BalancedMode: true, enableDepth1Lookahead: true, enableDepth1LookaheadV2: true, enableForcedConsumptionZone: true, enablePrimaryPanelAggression: true, enableStructuralPairClosure: true } },
];

console.log('=== BENCHMARK INDUSTRIAL COMPLETO: v44.7 -> v45.0 (Pair Closure) ===\n');

const results: any[] = [];
for (const run of runs) {
  const res = runOptimization(testParts, panelW, panelH, 18, true, 4.5, 10, run.config as any);
  const audit = deepAudit(res);
  results.push({ name: run.name, audit });
}

// Summary Table
console.log('| Versión | Paneles | P1 Eff | Total Eff | Premium Sobrante | LH Changes | PC Applied | PC Winner Flips | Near-Perfect | PC Avg Ratio |');
console.log('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
results.forEach(r => {
  console.log(`| ${r.name.padEnd(25)} | ${r.audit.panelCount} | ${r.audit.effByPanel[0]?.toFixed(2)}% | ${r.audit.totalEff.toFixed(2)}% | ${r.audit.biggestLastLeftoverM2.toFixed(3)} m² | ${r.audit.lookaheadWinnerChange} | ${r.audit.pairClosureApplied} | ${r.audit.pairClosureChangedWinnerCount} | ${r.audit.nearPerfectFoundCount} | ${r.audit.avgPairRatio.toFixed(3)} |`);
});

const v93 = results[2].audit;
const v45 = results[3].audit;

console.log('\n--- Análisis v45.0 vs v44.9.3-rev2e ---');
console.log(`PC Winner Flips (v45.0): ${v45.pairClosureChangedWinnerCount}`);
console.log(`Near-Perfect Found (v45.0): ${v45.nearPerfectFoundCount}`);
console.log(`P1 Efficiency (v45.0): ${v45.effByPanel[0]?.toFixed(2)}%`);
console.log(`Total Panels: ${v45.panelCount}`);

console.log('\n--- RESPUESTAS OBLIGATORIAS ---');
console.log(`¿P1 sube por fin?: ${v45.effByPanel[0] > v93.effByPanel[0] ? 'SÍ ✅' : 'NO ❌ (' + v45.effByPanel[0].toFixed(2) + '%)'}`);
console.log(`¿v45.0 vuelve a 2 paneles?: ${v45.panelCount === 2 ? 'SÍ ✅' : 'NO ❌ (' + v45.panelCount + ')'}`);
console.log(`¿La mejora vino de pares y no de score?: ${v45.pairClosureChangedWinnerCount > 0 ? 'SÍ ✅' : 'NO'}`);
console.log(`¿Se mantuvo controlado el remanente?: ${v45.biggestLastLeftoverM2 > 0.3 ? 'SÍ ✅' : 'NO'}`);

const verdict = v45.panelCount === 2 ? 'LEPTON_GRADE_V45_SUCCESS' : (v45.effByPanel[0] > v93.effByPanel[0] ? 'INCREMENTAL_STRUCTURAL_IMPROVEMENT' : 'STILL_ROOM_FOR_GROWTH');
console.log(`\nVEREDICTO FINAL: ${verdict}`);
