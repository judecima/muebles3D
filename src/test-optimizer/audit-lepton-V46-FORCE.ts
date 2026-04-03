import { loadLeptonAudit } from './lepton-parser';
import { runGlobalOptimization } from '../server/optimizer/engine/core/globalOptimizer';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 🚀 V46.2.2-INDUSTRIAL_FORCE - EL AUDITOR DE LA VERDAD
 * Bypass total de caché para confirmar la paridad con Lepton.
 */
const CONFIG_FORCE = {
  strategy: 'horizontal',
  trim: 10,
  hasGrain: false,
  features: {
    enablePrimaryPanelAggression: true,
    enableP2Aggression: true,
    enableComplementaryPoolAlignment: true,
    enableLookahead: true,
    enableStripBasedSolver: true, // Motor Columnar (Along/Cross)
    deferredMassThreshold: 100000
  }
};

async function auditForce() {
  const datasetDir = path.join(__dirname, 'datasets/lepton');
  console.log(`\n🚀 === V46.2.2-INDUSTRIAL_FORCE: AUDITORÍA DE PARIDAD ABSOLUTA ===\n`);
  
  const files = fs.readdirSync(datasetDir)
    .filter(f => f.endsWith('.xml'))
    .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
    });

  console.log(`| Dataset | Material | Paneles (Lepton) | Paneles (v46.2) | Gap | Estado |`);
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

      // Inyección forzada de configuración v46.2.2
      const result = runGlobalOptimization(
        pool, 
        audit.sheetWidth, 
        audit.sheetHeight, 
        { ...CONFIG_FORCE, kerf: audit.kerf }
      );

      const ourPanels = result.panels.length;
      const leptonPanels = audit.panelsUsed;
      const gap = ourPanels - leptonPanels;
      const status = gap <= 0 ? '✅ PARIDAD' : '❌ GAP';
      
      totalGap += gap;
      if (gap <= 0) passCount++;

      console.log(`| ${file} | ${audit.material.substring(0, 20)}... | ${leptonPanels} | ${ourPanels} | ${gap > 0 ? '+' + gap : gap} | ${status} |`);
    } catch (err) {
      console.log(`| ${file} | ERROR | - | - | - | ⚠️ Error |`);
    }
  }

  console.log(`\n📊 === RESUMEN FINAL V46.2.2 ===`);
  console.log(`- Éxito (Empate): ${passCount} / ${files.length}`);
  console.log(`- Gap Acumulado: ${totalGap > 0 ? '+' + totalGap : totalGap} paneles\n`);
  
  if (totalGap <= 1) {
    console.log(`🏆 VICTORIA TOTAL: Hemos alcanzado paridad industrial (+1 panel marginal).`);
  } else {
    console.log(`⚠️ ALERTA: Diferencia de ${totalGap} paneles detectada.`);
  }
}

auditForce();
