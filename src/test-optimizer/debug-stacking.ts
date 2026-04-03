import { loadLeptonAudit } from './lepton-parser';
import { StripGenerator } from '../server/optimizer/engine/core/stripGenerator';
import { FeatureFlags, InternalPart } from '../server/optimizer/engine/types/engine';
import * as path from 'path';

// Usamos rutas relativas a la raíz del proyecto para evitar ENOENT con npx tsx
const datasetPath = path.join(process.cwd(), 'src/test-optimizer/datasets/lepton/lepton-6.xml');
const audit = loadLeptonAudit(datasetPath);
const generator = new StripGenerator(4.5);

const panelW = audit.sheetWidth;
const panelH = audit.sheetHeight;

const pieces: InternalPart[] = audit.parts.map((p, i) => ({
    id: `p-${i}`,
    name: p.code || p.id,
    width: p.width,
    height: p.height,
    thickness: 15,
    quantity: 1,
    grainDirection: 'libre',
    placed: false
}));

const baseFeatures: FeatureFlags = {
    useStripLock: false,
    useSmartSplit: true,
    penalizeSmallLeftovers: true,
    useContinuityBonus: false,
    useSmartFreeRectOrder: false,
    useGeometricContinuity: false,
    useIndexedSelection: false,
    useBacktracking: false,
    useExplorationNoise: false,
    useTopKSelection: false,
    useMultiStrip: false,
    useLookahead: false,
    useInvalidCache: false,
    maxActiveStrips: 1
};

function runTest(penalize: boolean, strategy: 'horizontal' | 'vertical') {
    console.log(`\n--- TEST: strategy=${strategy}, penalize=${penalize} ---`);
    const features = { ...baseFeatures, penalizeSmallLeftovers: penalize };
    const results = generator.generateStrips(pieces, panelW, panelH, strategy, features);
    const best = results[0];
    
    if (!best) {
        console.log("No se generaron candidatos.");
        return;
    }

    const col1 = strategy === 'horizontal' 
        ? best.parts.filter(p => p.x === 0)
        : best.parts.filter(p => p.y === 0);
        
    console.log(`- Piezas en la primera Banda/Columna: ${col1.length}`);
    const lastPos = strategy === 'horizontal'
        ? col1[col1.length - 1].y + col1[col1.length - 1].piece.height
        : col1[col1.length - 1].x + col1[col1.length - 1].piece.width;
        
    const limit = strategy === 'horizontal' ? panelH : panelW;
    console.log(`- Dimensión ocupada: ${lastPos.toFixed(2)} / ${limit}`);
    console.log(`- Aire restante: ${(limit - lastPos).toFixed(2)}`);
    console.log(`- Score Final: ${best.finalScore.toFixed(2)}`);
}

console.log("PANELES: " + panelW + "x" + panelH);
console.log("COMPARACIÓN ESTRATÉGICA LEPTON-6:");
runTest(true, 'horizontal');
runTest(false, 'horizontal');
runTest(true, 'vertical');
runTest(false, 'vertical');
