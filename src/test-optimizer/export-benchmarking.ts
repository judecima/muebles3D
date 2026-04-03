import { loadLeptonAudit } from './lepton-parser';
import * as fs from 'fs';

const benchmarks = [1, 2, 3, 4, 5, 6, 7].map(i => {
    const audit = loadLeptonAudit(`./src/test-optimizer/datasets/lepton/lepton-${i}.xml`);
    return {
        id: `lepton-${i}`,
        name: `BENCHMARK: Lepton-${i} (${audit.parts.length} Piezas)`,
        parts: audit.parts.map(p => ({
            name: p.code || p.id,
            width: p.width,
            height: p.height,
            quantity: 1,
            grainDirection: 'libre'
        })),
        auditPanel: { width: audit.sheetWidth, height: audit.sheetHeight }
    };
});

fs.writeFileSync('./src/test-optimizer/benchmarks.json', JSON.stringify(benchmarks, null, 2));
console.log("Benchmarks exportados a src/test-optimizer/benchmarks.json");
