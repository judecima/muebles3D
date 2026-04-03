import { runGlobalOptimization } from '../server/optimizer/engine/core/globalOptimizer';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_V47 = {
  strategy: 'horizontal',
  trim: 10,
  hasGrain: false,
  features: {
    enablePrimaryPanelAggression: true,
    enableP2Aggression: true,
    enableComplementaryPoolAlignment: true,
    enableLookahead: true,
    enableStripBasedSolver: true, // Motor Columnar v46+
    deferredMassThreshold: 100000
  }
};

async function runBenchmark() {
  const datasets = [
    { file: 'grafito-95-piezas.json', target: 5 },
    { file: 'gris-tapir-61-piezas.json', target: 2 }
  ];

  console.log(`\n🚀 === AUDITORÍA DE PARIDAD INDUSTRIAL v47.2 ===\n`);
  console.log(`| Dataset | PIEZAS | Placas (Lepton) | Placas (Nosotros) | Eficiencia | Gap | Status |`);
  console.log(`| :--- | :---: | :---: | :---: | :---: | :---: | :--- |`);

  const datasetPath = path.join(__dirname, 'datasets');

  for (const ds of datasets) {
    const fullPath = path.join(datasetPath, ds.file);
    if (!fs.existsSync(fullPath)) {
      console.log(`| ${ds.file} | - | ${ds.target} | - | - | - | ❌ Missing |`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    
    // Mapeo de items al formato del motor
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
      ...CONFIG_V47,
      kerf: data.config.kerf,
      trim: data.config.trim,
      panelWidth: data.config.panelWidth,
      panelHeight: data.config.panelHeight
    };

    const result = runGlobalOptimization(
      pool,
      data.config.panelWidth,
      data.config.panelHeight,
      config
    );

    const ourPanels = result.panels.length;
    const gap = ourPanels - ds.target;
    // Calcular eficiencia global real
    const totalAreaUsed = result.panels.reduce((acc: number, p: any) => acc + p.usedArea, 0);
    const totalAreaAvailable = ourPanels * data.config.panelWidth * data.config.panelHeight;
    const efficiency = (totalAreaUsed / totalAreaAvailable) * 100;

    const status = gap <= 0 ? '✅ PASS' : '❌ FAIL';

    console.log(`| ${ds.file} | ${pool.length} | ${ds.target} | ${ourPanels} | ${efficiency.toFixed(1)}% | ${gap > 0 ? '+' + gap : gap} | ${status} |`);
  }
}

runBenchmark().catch(console.error);
