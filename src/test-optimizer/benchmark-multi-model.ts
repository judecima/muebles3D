// Suite de Validación Multi-Modelo (Anti-Sobreajuste)
// Gate de Producción Industrial v45.3 (Balanced P2 Aggression)

import { runOptimization } from '../server/optimizer/cutOptimizer';
import { performance } from 'perf_hooks';
import { EngineConfig } from '../server/optimizer/engine/types/engine';

interface Model {
  id: string;
  name: string;
  parts: any[];
  panelW: number;
  panelH: number;
}

const ModelA: Model = {
  id: "A",
  name: "Reference Industrial",
  panelW: 2750, panelH: 1830,
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

const ModelB: Model = {
  id: "B",
  name: "Filler Heavy",
  panelW: 2440, panelH: 1220,
  parts: [
    { name: 'R-700x400', width: 700, height: 400, thickness: 18, quantity: 15, grainDirection: 'libre' },
    { name: 'R-500x300', width: 500, height: 300, thickness: 18, quantity: 20, grainDirection: 'libre' },
    { name: 'R-200x200', width: 200, height: 200, thickness: 18, quantity: 40, grainDirection: 'libre' },
  ]
};

const ModelC: Model = {
  id: "C",
  name: "Variety Heavy",
  panelW: 2750, panelH: 1830,
  parts: Array.from({ length: 40 }, (_, i) => ({
    name: `U-${i}`,
    width: 300 + Math.floor(((i * 7) % 500)),
    height: 200 + Math.floor(((i * 3) % 400)),
    thickness: 18, quantity: 1, grainDirection: 'libre'
  }))
};

const ModelD: Model = {
  id: "D",
  name: "Narrow & Long",
  panelW: 2750, panelH: 1830,
  parts: [
    { name: 'N-2400x120', width: 2400, height: 120, thickness: 18, quantity: 6, grainDirection: 'libre' },
    { name: 'N-1500x80', width: 1500, height: 80, thickness: 18, quantity: 10, grainDirection: 'libre' },
    { name: 'N-500x500', width: 500, height: 500, thickness: 18, quantity: 4, grainDirection: 'libre' },
  ]
};

const models = [ModelA, ModelB, ModelC, ModelD];

export function runBenchmarkSuite(features: any) {
  return models.map(model => {
    const start = performance.now();
    const res = runOptimization(model.parts, model.panelW, model.panelH, 18, true, 4.5, 10, features);
    const end = performance.now();

    const panels = res.optimizedLayout || [];
    const p1Efficiency = panels[0]?.efficiency || 0;
    const totalEfficiency = res.totalEfficiency;
    
    // Quality metrics
    const lastPanel = panels[panels.length - 1];
    const lastLeftovers = lastPanel?.parts.filter((p: any) => p.isLeftover) || [];
    const biggestLastLeftoverArea = Math.max(...(lastLeftovers.map((l: any) => l.width * l.height)), 0);
    const noodleCount = lastLeftovers.filter((l: any) => Math.min(l.width, l.height) < 60).length;

    // Audit results extraction
    const debugEvents = res.debugEvents || [];
    let panel2AggressionApplied = false;
    let winnerChangedByP2Aggression = 0;
    let panel2AbsorptionFailureReason = "N/A";
    let deferredMassThresholdUsed = 0;

    debugEvents.forEach((e: any) => {
      if (e.panelNumber === 2) {
        if (e.metadata?.panel2AggressionApplied) panel2AggressionApplied = true;
        if (e.metadata?.p2DecisionsFlippedByScaling) winnerChangedByP2Aggression += e.metadata.p2DecisionsFlippedByScaling;
        if (e.metadata?.panel2AbsorptionFailureReason) panel2AbsorptionFailureReason = e.metadata.panel2AbsorptionFailureReason;
        if (e.metadata?.deferredMassThresholdUsed) deferredMassThresholdUsed = e.metadata.deferredMassThresholdUsed;
      }
    });

    return {
      id: model.id,
      name: model.name,
      result: {
        panelCount: panels.length,
        p1Efficiency,
        totalEfficiency,
        premiumLeftover: biggestLastLeftoverArea / 1_000_000,
        noodleCount,
        executionTimeMs: end - start
      },
      diagnostics: {
        panel2AggressionApplied,
        panel2AbsorptionFailureReason,
        winnerChangedByP2Aggression,
        deferredMassThresholdUsed
      }
    };
  });
}

// Standalone execution support
if (process.argv[1]?.includes('benchmark-multi-model.ts')) {
  const BASE_FEATURES = {
    useStripLock: true,
    useSmartSplit: true,
    penalizeSmallLeftovers: true,
    useContinuityBonus: true,
    useGeometricContinuity: true,
    useBacktracking: true,
    useInvalidCache: true,
    enableV44BalancedMode: true,
    enableP2Aggression: true
  };
  
  console.log('=== MULTI-MODEL INDUSTRIAL BENCHMARK (Standalone) ===\n');
  const results = runBenchmarkSuite(BASE_FEATURES);
  results.forEach(r => {
    console.log(`MODELO: ${r.name}`);
    console.log(`| Panels: ${r.result.panelCount} | P1: ${r.result.p1Efficiency.toFixed(2)}% | Total: ${r.result.totalEfficiency.toFixed(2)}% | Time: ${r.result.executionTimeMs.toFixed(0)}ms | P2 Aggr: ${r.diagnostics.panel2AggressionApplied ? 'SÍ' : 'no'} |`);
  });
}
