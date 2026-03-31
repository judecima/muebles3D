import { runOptimization } from './src/server/optimizer/cutOptimizer';

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

const result = runOptimization(testParts, panelW, panelH, 18, true, 4.5, 10);

console.log(`METRICS_START`);
console.log(`TotalPanels: ${result.totalPanels}`);

let totalLinearMeters = 0;
let totalCuts = 0;
let smallRemnantsCount = 0;
let narrowColumnsCount = 0;

for (const panel of result.optimizedLayout) {
  console.log(`PANEL_${panel.panelNumber}_EFF: ${panel.efficiency.toFixed(2)}`);
  
  const pieces = panel.parts.filter((p: any) => !p.isLeftover);
  const leftovers = panel.parts.filter((p: any) => p.isLeftover);

  // Metros lineales estimados: perímetro de piezas + cortes de guillotina
  pieces.forEach((p: any) => {
    totalLinearMeters += (p.width + p.height) / 1000;
    totalCuts += 2; // Cada pieza implica al menos 2 cortes
  });

  smallRemnantsCount += leftovers.filter((l: any) => Math.min(l.width, l.height) < 70).length;
  narrowColumnsCount += pieces.filter((p: any) => p.width < 100 || p.height < 100).length;
}

console.log(`TotalLinearMeters: ${totalLinearMeters.toFixed(2)}`);
console.log(`TotalCuts: ${totalCuts}`);
console.log(`SmallRemnantsCount: ${smallRemnantsCount}`);
console.log(`NarrowColumnsCount: ${narrowColumnsCount}`);

// Analizar eventos de debug para bandCloser
const events = result.debugEvents || [];
const applied = events.filter((e: any) => e.metadata?.bandCloserApplied).length;
const blocked = events.filter((e: any) => e.metadata?.bandCloserBlockedByAlternative).length;

console.log(`BandCloserApplied: ${applied}`);
console.log(`BandCloserBlockedByAlternative: ${blocked}`);
console.log(`METRICS_END`);
