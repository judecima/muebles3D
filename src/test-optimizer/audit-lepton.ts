import { loadLeptonAudit } from './lepton-parser';
import { runGlobalOptimization } from '../server/optimizer/engine/core/globalOptimizer';
import * as fs from 'fs';
import * as path from 'path';

/**
 * CONFIGURACIÓN v46.2.2 - INDUSTRIAL PARITY
 */
const PRODUCTION_CONFIG_V46 = {
  strategy: 'horizontal',
  trim: 10,
  hasGrain: false,
  features: {
    enablePrimaryPanelAggression: true,
    enableP2Aggression: true,
    enableComplementaryPoolAlignment: true,
    enableLookahead: true,
    enableStripBasedSolver: true, // NUESTRO MOTOR COLUMNAR
    deferredMassThreshold: 100000
  }
};

async function auditAll() {
  const datasetDir = path.join(__dirname, 'datasets/lepton');
  if (!fs.existsSync(datasetDir)) {
    console.error(`Error: No se encontró el directorio ${datasetDir}`);
    return;
  }

  const files = fs.readdirSync(datasetDir)
    .filter(f => f.endsWith('.xml'))
    .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
    });

  console.log(`\n🚀 === AUDITORÍA FINAL DE PARIDAD INDUSTRIAL (v46.2.2 vs LEPTON) ===\n`);
  console.log(`| Dataset | Material | Paneles (Lepton) | Paneles (Nosotros) | Gap | Resultado |`);
  console.log(`| :--- | :--- | :---: | :---: | :---: | :--- |`);

  let totalGap = 0;
  let passCount = 0;

  for (const file of files) {
    try {
      const audit = loadLeptonAudit(path.join(datasetDir, file));
      
      const pool = audit.parts.map(p => ({
        id: p.id,
        name: p.code || p.id,
        width: p.width,
        height: p.height,
        thickness: 18,
        quantity: 1,
        grainDirection: 'none' as any,
        placed: false
      }));

      const result = runGlobalOptimization(
        pool, 
        audit.sheetWidth, 
        audit.sheetHeight, 
        { ...PRODUCTION_CONFIG_V46, kerf: audit.kerf }
      );

      const ourPanels = result.panels.length;
      const leptonPanels = audit.panelsUsed;
      const gap = ourPanels - leptonPanels;
      const status = gap <= 0 ? '✅ PASS' : '❌ FAIL';
      
      totalGap += gap;
      if (gap <= 0) passCount++;

      console.log(`| ${file} | ${audit.material.substring(0, 20)}... | ${leptonPanels} | ${ourPanels} | ${gap > 0 ? '+' + gap : gap} | ${status} |`);
    } catch (err) {
      console.log(`| ${file} | ERROR | - | - | - | ⚠️ Parser Error |`);
    }
  }

  console.log(`\n📊 === RESUMEN FINAL ===`);
  console.log(`- Casos Procesados: ${files.length}`);
  console.log(`- Éxito (Empate o Mejor): ${passCount} / ${files.length}`);
  console.log(`- Gap Acumulado: ${totalGap > 0 ? '+' + totalGap : totalGap} paneles\n`);
  
  if (totalGap <= 1) {
    console.log(`🏆 VICTORIA: Hemos alcanzado paridad industrial con un gap marginal de ${totalGap}.`);
  } else {
    console.log(`⚠️ ALERTA: Persiste un gap de ${totalGap} paneles.`);
  }
}

auditAll();
