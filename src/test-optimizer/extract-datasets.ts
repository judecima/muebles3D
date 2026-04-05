import * as fs from 'fs';
import { loadLeptonAudit } from './lepton-parser';

const leptonDir = './src/test-optimizer/datasets/lepton';
const files = fs.readdirSync(leptonDir).filter(f => f.endsWith('.xml'));

console.log('| File | Material | Pieces | Panels (Lepton) |');
console.log('| :--- | :--- | :--- | :--- |');

files.forEach(file => {
    try {
        const data = loadLeptonAudit(`${leptonDir}/${file}`);
        console.log(`| ${file} | ${data.material} | ${data.parts.length} | ${data.panelsUsed} |`);
        
        // Save as JSON
        const jsonPath = `./src/test-optimizer/datasets/${file.replace('.xml', '.json')}`;
        fs.writeFileSync(jsonPath, JSON.stringify({
            name: `Lepton Case: ${data.material}`,
            config: {
                panelWidth: data.sheetWidth,
                panelHeight: data.sheetHeight,
                trim: 10,
                kerf: data.kerf,
                minMachineCut: 60,
                goldMeasures: [600, 500, 450, 300, 150]
            },
            items: data.parts.map(p => ({
                id: p.id,
                w: p.width,
                h: p.height,
                qty: p.quantity,
                label: p.code
            }))
        }, null, 2));
    } catch (e) {
        console.log(`| ${file} | Error | - | - |`);
    }
});
