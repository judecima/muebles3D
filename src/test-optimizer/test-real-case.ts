/**
 * Benchmark v44: MDF FAPLAC MESOPOTAMIA GRIS TAPIR 18MM
 * Piezas: 62 unidades totales
 * Panel: 2750x1830mm, kerf 4.5mm, trim 10mm
 * 
 * Ejecutar: npx tsx src/test-optimizer/test-real-case.ts
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

console.log('=== TEST v44 INDUSTRIAL ===\n');
const startTime = performance.now();
const result = runOptimization(testParts, panelW, panelH, 18, true, 4.5, 10);
const elapsed = performance.now() - startTime;

console.log(`⏱️ Tiempo: ${elapsed.toFixed(1)}ms`);
console.log(`📊 Paneles: ${result.totalPanels}`);
console.log(`✅ Eficiencia Total: ${result.totalEfficiency.toFixed(2)}%\n`);

for (const panel of result.optimizedLayout) {
  const pCount = panel.parts.filter((p: any) => !p.isLeftover).length;
  console.log(`--- Panel ${panel.panelNumber} (${panel.strategy}) ---`);
  console.log(`  Piezas: ${pCount}`);
  console.log(`  Eficiencia: ${panel.efficiency.toFixed(2)}%`);
  
  if (panel.panelNumber === 1) {
    const sortedParts = [...panel.parts].sort((a: any, b: any) => a.y !== b.y ? a.y - b.y : a.x - b.x);
    for (const p of sortedParts) {
      if (!p.isLeftover) {
        console.log(`    [x:${p.x.toFixed(1)}, y:${p.y.toFixed(1)}] ${p.name} (${p.width}x${p.height}) ${p.rotated ? 'Rotated' : ''}`);
      }
    }
  }
  console.log(`  Eficiencia: ${panel.efficiency.toFixed(2)}%`);
  
  const pieceNames = panel.parts.filter((p: any) => !p.isLeftover).map((p: any) => p.name);
  const nameCounts: Record<string, number> = {};
  pieceNames.forEach((n: string) => nameCounts[n] = (nameCounts[n] || 0) + 1);
  console.log(`  Distribución: ${JSON.stringify(nameCounts)}`);
  
  const leftovers = panel.parts.filter((p: any) => p.isLeftover);
  console.log(`  Sobrantes (${leftovers.length}): ${JSON.stringify(leftovers.map((l: any) => `${Math.round(l.width)}x${Math.round(l.height)}`))}`);
  
  // Metas del usuario
  if (panel.panelNumber === 1 && panel.efficiency >= 94) console.log('  ✅ META PANEL 1 ALCANZADA (>= 94%)');
  if (panel.panelNumber === 2 && panel.efficiency >= 72) console.log('  ✅ META PANEL 2 ALCANZADA (>= 72%)');
}

const totalRequired = testParts.reduce((acc, p) => acc + p.quantity, 0);
const totalPlaced = result.optimizedLayout.reduce((acc: number, p: any) => acc + p.parts.filter((x: any) => !x.isLeftover).length, 0);

console.log(`\n=== RESUMEN ===`);
console.log(`Piezas: ${totalPlaced}/${totalRequired} colocadas`);
if (totalPlaced === totalRequired) console.log('✅ TODAS las piezas colocadas correctamente.');
else console.log(`❌ ERROR: Faltan ${totalRequired - totalPlaced} piezas.`);
