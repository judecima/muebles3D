// Suite de Validación de Robustez v45.3 (Module Edition)
// Objetivo: Verificar estabilidad bajo permutaciones y mutaciones

import { runOptimization } from '../server/optimizer/cutOptimizer';

interface Piece {
  name: string;
  width: number;
  height: number;
  thickness: number;
  quantity: number;
  grainDirection: 'libre' | 'horizontal' | 'vertical';
}

const ModelA_Base: Piece[] = [
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

function shuffle(array: any[]) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function jitterPieces(array: Piece[], factor: number = 0.05) {
  return array.map(p => ({
    ...p,
    width: Math.round(p.width * (1 + (Math.random() * 2 - 1) * factor)),
    height: Math.round(p.height * (1 + (Math.random() * 2 - 1) * factor))
  }));
}

function removeRandomPieces(array: Piece[], count: number = 2) {
  const arr = [...array];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * arr.length);
    arr.splice(idx, 1);
  }
  return arr;
}

function runIteration(parts: any[], features: any) {
  const res = runOptimization(parts, 2750, 1830, 18, true, 4.5, 10, features);
  const panels = res.optimizedLayout || [];
  let p2Aggr = false;
  res.debugEvents?.forEach((e: any) => { if (e.panelNumber === 2 && e.metadata?.panel2AggressionApplied) p2Aggr = true; });
  return { panels: panels.length, p1Efficiency: panels[0]?.efficiency || 0, p2Aggr };
}

export function runRobustnessSuite(features: any) {
  const iterations = 10;
  
  // Shuffle Variant
  let shuffleSuccess = 0;
  let shuffleP1Sum = 0;
  let shufflePanelSum = 0;
  for (let i = 0; i < iterations; i++) {
    const r = runIteration(shuffle(ModelA_Base), features);
    if (r.panels <= 2) shuffleSuccess++;
    shuffleP1Sum += r.p1Efficiency;
    shufflePanelSum += r.panels;
  }

  // Jitter Variant
  let jitterSuccess = 0;
  let jitterP1Sum = 0;
  let jitterPanelSum = 0;
  for (let i = 0; i < iterations; i++) {
    const r = runIteration(jitterPieces(ModelA_Base, 0.05), features);
    if (r.panels <= 2) jitterSuccess++;
    jitterP1Sum += r.p1Efficiency;
    jitterPanelSum += r.panels;
  }

  // Remove Variant
  let removeSuccess = 0;
  let removeP1Sum = 0;
  let removePanelSum = 0;
  for (let i = 0; i < iterations; i++) {
    const r = runIteration(removeRandomPieces(ModelA_Base, 2), features);
    if (r.panels <= 2) removeSuccess++;
    removeP1Sum += r.p1Efficiency;
    removePanelSum += r.panels;
  }

  // Threshold Sensitivity (Specific for Model A Base)
  const thresholds = [80000, 100000, 120000];
  const sensitivity = thresholds.map(t => {
    const r = runIteration(ModelA_Base, { ...features, deferredMassThreshold: t });
    return {
      deferredMassThreshold: t,
      panelCount: r.panels,
      p2AggressionApplied: r.p2Aggr
    };
  });

  return {
    enabled: true,
    variantsTested: iterations * 3,
    shuffle: {
      iterations,
      successRate: shuffleSuccess / iterations,
      averagePanelCount: shufflePanelSum / iterations,
      averageP1Efficiency: shuffleP1Sum / iterations
    },
    jitter5: {
      iterations,
      successRate: jitterSuccess / iterations,
      averagePanelCount: jitterPanelSum / iterations,
      averageP1Efficiency: jitterP1Sum / iterations
    },
    remove2pieces: {
      iterations,
      successRate: removeSuccess / iterations,
      averagePanelCount: removePanelSum / iterations,
      averageP1Efficiency: removeP1Sum / iterations
    },
    thresholdSensitivity: sensitivity
  };
}

// Standalone execution support
if (process.argv[1]?.includes('robustness-validation.ts')) {
   const BASE_FEATURES = { enableV44BalancedMode: true, enableP2Aggression: true };
   console.log('=== ROBUSTEZ (Standalone) ===\n');
   const stats = runRobustnessSuite(BASE_FEATURES);
   console.log(`Shuffle: ${(stats.shuffle.successRate * 100).toFixed(0)}% success`);
   console.log(`Jitter: ${(stats.jitter5.successRate * 100).toFixed(0)}% success`);
}
