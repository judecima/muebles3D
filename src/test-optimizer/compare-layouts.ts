import { loadLeptonAudit, LeptonPlacedPiece } from './lepton-parser';
import { runGlobalOptimization } from '../server/optimizer/engine/core/globalOptimizer';
import * as path from 'path';

const PRODUCTION_CONFIG_V46_1 = {
  strategy: 'horizontal',
  trim: 10,
  hasGrain: false,
  features: {
    enablePrimaryPanelAggression: true,
    enableP2Aggression: true,
    enableComplementaryPoolAlignment: true,
    enableLookahead: true,
    enableStripBasedSolver: true, // v46.1 active
    deferredMassThreshold: 100000
  }
};

/**
 * GENERADOR DE MAPA VISUAL (ASCII)
 * Representa una placa de 2750x1830 en una rejilla.
 */
function drawMap(pieces: any[], sheetW: number, sheetH: number, title: string) {
    const rows = 36; // ~50mm por celda en H
    const cols = 55; // ~50mm por celda en W
    const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill('·'));

    const scaleW = sheetW / cols;
    const scaleH = sheetH / rows;

    for (const p of pieces) {
        const startR = Math.floor(p.y / scaleH);
        const endR = Math.ceil((p.y + p.height) / scaleH);
        const startC = Math.floor(p.x / scaleW);
        const endC = Math.ceil((p.x + p.width) / scaleW);

        for (let r = startR; r < endR && r < rows; r++) {
            for (let c = startC; c < endC && c < cols; c++) {
                grid[r][c] = p.isLeftover ? '░' : '█';
            }
        }
    }

    console.log(`\n--- ${title} ---`);
    console.log(grid.map(row => row.join('')).join('\n'));
}

async function runDiagnostic() {
    const filePath = path.join(__dirname, 'datasets/lepton/lepton-5.xml');
    const audit = loadLeptonAudit(filePath);
    
    // 1. Mapa de Lepton (Panel 1)
    const leptonPanel1 = audit.placedPieces.filter(p => p.panel === 1);
    drawMap(leptonPanel1, audit.sheetWidth, audit.sheetHeight, "HUELLA LEPTON (PANEL 1)");

    // 2. Nuestro Mapa (v46.1 - Panel 1)
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
        { ...PRODUCTION_CONFIG_V46_1, kerf: audit.kerf }
    );

    const ourPanel1 = result.panels[0].parts;
    drawMap(ourPanel1, audit.sheetWidth, audit.sheetHeight, "NUESTRA HUELLA v46.1 (PANEL 1)");

    console.log(`\n📊 DATOS PANEL 1:`);
    console.log(`- Lepton:   ${leptonPanel1.length} piezas | Eficiencia: ${(leptonPanel1.reduce((sum, p) => sum + p.width * p.height, 0) / (audit.sheetWidth * audit.sheetHeight) * 100).toFixed(2)}%`);
    console.log(`- Nosotros: ${ourPanel1.filter((p: any) => !p.isLeftover).length} piezas | Eficiencia: ${result.panels[0].efficiency.toFixed(2)}%`);
}

runDiagnostic();
