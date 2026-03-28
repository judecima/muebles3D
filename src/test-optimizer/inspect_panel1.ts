import { fillSinglePanel } from '../server/optimizer/engine/core/engine';

const kerf = 4.5;
const trim = 10;
const pW = 2750;
const pH = 1830;
const usableW = pW - trim;
const usableH = pH - trim;

const pieces = [
  { name: 'P-629x570', width: 629, height: 570, count: 4 },
  { name: 'P-610x570', width: 610, height: 570, count: 4 },
  { name: 'P-500x582', width: 500, height: 582, count: 2 },
  { name: 'P-582x150', width: 582, height: 150, count: 4 },
  { name: 'P-562x150', width: 562, height: 150, count: 2 },
  { name: 'P-117x177', width: 117, height: 177, count: 1 },
];

const inputParts = pieces.flatMap(p => Array.from({ length: p.count }, (_, i) => ({
  id: `${p.name}-${i}`,
  name: p.name,
  width: p.width,
  height: p.height,
  placed: false,
  quantity: 1,
  grainDirection: 'libre',
  thickness: 18
})));

const colors = {};

const panel = fillSinglePanel(
  inputParts,
  usableW,
  usableH,
  kerf,
  trim,
  pW,
  pH,
  colors,
  'horizontal',
  1,
  false // hasGrain
);

console.log(`=== Panel 1 Strategy: ${panel.strategy} ===`);
console.log(`Eficiencia: ${panel.efficiency.toFixed(2)}%`);
panel.parts.forEach((p: any) => {
  console.log(`- ${p.name} [${p.isLeftover ? 'SOBRANTE' : 'PIEZA'}] ${p.rotated ? '(Rot)' : ''}: ${p.width}x${p.height} at (${p.x}, ${p.y})`);
});

