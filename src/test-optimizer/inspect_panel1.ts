import { runGlobalOptimization } from '../server/optimizer/engine/core/globalOptimizer';
import * as fs from 'fs';
import * as path from 'path';

const datasetPath = path.join(__dirname, 'datasets', 'grafito-95-piezas.json');
const data = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

const pool = data.items.flatMap((item: any) => 
  Array.from({ length: item.qty || item.quantity }, (_, i) => ({
    id: `${item.id}-${i}`,
    name: item.label || item.name,
    width: item.w || item.width,
    height: item.h || item.height,
    thickness: 18,
    quantity: 1,
    grainDirection: 'none' as any,
    placed: false
  }))
);

const config = {
  strategy: 'horizontal',
  trim: 10,
  hasGrain: false,
  features: {
    enablePrimaryPanelAggression: true,
    enableP2Aggression: true,
    enableComplementaryPoolAlignment: true,
    enableLookahead: true,
    enableStripBasedSolver: true,
    deferredMassThreshold: 100000
  },
  kerf: data.config.kerf,
  panelWidth: data.config.panelWidth,
  panelHeight: data.config.panelHeight
};

const result = runGlobalOptimization(pool, data.config.panelWidth, data.config.panelHeight, config);

console.log(`\n=== INSPECCIÓN PANEL 1 ===`);
const p1 = result.panels[0];
console.log(`Dimensiones Usables: ${p1.width - 10}x${p1.height - 10}`);

let totalArea = 0;
let overlaps = 0;
let outOfBounds = 0;

const parts = p1.parts.filter((p: any) => !p.isLeftover);

for (let i = 0; i < parts.length; i++) {
  const a = parts[i];
  totalArea += a.width * a.height;

  if (a.x + a.width > p1.width || a.y + a.height > p1.height) {
    outOfBounds++;
    console.log(`❌ OUT OF BOUNDS: ${a.name} (${a.id}) at (${a.x}, ${a.y}) size ${a.width}x${a.height}`);
  }

  for (let j = i + 1; j < parts.length; j++) {
    const b = parts[j];
    const hasOverlap = !(
      a.x + a.width <= b.x ||
      b.x + b.width <= a.x ||
      a.y + a.height <= b.y ||
      b.y + b.height <= a.y
    );
    if (hasOverlap) {
      overlaps++;
      console.log(`❌ OVERLAP: ${a.name} (${a.id}) and ${b.name} (${b.id})`);
    }
  }
}

console.log(`\nResultados:`);
console.log(`- Piezas: ${parts.length}`);
console.log(`- Área Total Piezas: ${totalArea}`);
console.log(`- Área Panel: ${p1.width * p1.height}`);
console.log(`- Overlaps detectados: ${overlaps}`);
console.log(`- Fuera de límites: ${outOfBounds}`);
