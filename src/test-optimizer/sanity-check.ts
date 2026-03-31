import { runOptimization } from '../server/optimizer/cutOptimizer';
import * as fs from 'fs';
import * as path from 'path';

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

console.log('=== SANITY CHECK: TRAZABILIDAD INDUSTRIAL ===\n');

const result = runOptimization(testParts, panelW, panelH, 18, true, 4.5, 10);

if (!result.debugEvents) {
  console.log('❌ ERROR: debugEvents no está presente en el resultado.');
  process.exit(1);
}

const events = result.debugEvents;
const counts: Record<string, number> = {};

events.forEach((em: any) => {
  counts[em.type] = (counts[em.type] || 0) + 1;
});

console.log(`📊 Total Paneles: ${result.totalPanels}`);
console.log(`📊 Total Eventos: ${events.length}`);
console.table(counts);

// Validar consistencia
let issues = 0;
events.forEach((ev: any, i: number) => {
  if (ev.panelNumber === undefined) {
    console.log(`❌ Evento ${i} (${ev.type}) no tiene panelNumber.`);
    issues++;
  }
  if (ev.seq === undefined) {
    console.log(`❌ Evento ${i} (${ev.type}) no tiene seq.`);
    issues++;
  }
});

if (issues === 0) {
  console.log('\n✅ Consistencia básica validada (panelNumber y seq presentes).');
}

// Buscar un HBC real
const hbcEvents = events.filter((e: any) => e.type === 'BLOCK_DOWNGRADED_FOR_CONSOLIDATION');
if (hbcEvents.length > 0) {
  console.log(`\n✅ Se encontraron ${hbcEvents.length} eventos de downgrade HBC.`);
  console.log('Ejemplo real:');
  console.log(JSON.stringify(hbcEvents[0], null, 2));
} else {
  console.log('\n⚠️ No se encontraron eventos de downgrade HBC en esta corrida.');
}

// Exportar a archivo
fs.writeFileSync('optimizer-debug.json', JSON.stringify(events, null, 2));
console.log('\n📁 Archivo optimizer-debug.json generado.');
