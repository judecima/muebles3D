
import { runOptimization } from '../server/optimizer/engine/core/engine';

const GOLD_MEASURES = [600, 500, 450, 300, 150];
const MARGEN = 15;

async function runGoldTest() {
    console.log("🚀 INICIANDO TEST DE EXCELENCIA INDUSTRIAL (100 piezas)...");
    
    // Generamos 100 piezas de 400x300 (ideal para llenar franjas)
    const testParts = [
        { name: "Pieza-Base", width: 400, height: 300, quantity: 100 }
    ];

    const result = runOptimization(
        testParts,
        1830, // Ancho placa
        2600, // Alto placa
        18,   // Espesor
        false // Veta
    );

    console.log(`\n📊 RESULTADOS:`);
    console.log(`- Paneles totales: ${result.totalPanels}`);
    console.log(`- Eficiencia Global: ${result.totalEfficiency.toFixed(2)}%`);

    let goldCount = 0;
    
    result.optimizedLayout.forEach((panel: any, idx: number) => {
        // En cada panel, buscamos el aire restante en el eje principal
        // (Asumimos que el motor compactó las piezas)
        const totalUsedAlong = Math.max(...panel.parts.map((p: any) => p.x + p.width));
        const totalUsedCross = Math.max(...panel.parts.map((p: any) => p.y + p.height));
        
        const remW = 1830 - totalUsedAlong - 10; // -10 de trim
        const remH = 2600 - totalUsedCross - 10;
        
        console.log(`\nPanel ${idx + 1}:`);
        console.log(`  Remanente Neto: ${remW.toFixed(1)} x ${remH.toFixed(1)}mm`);

        GOLD_MEASURES.forEach(gold => {
            if (Math.abs(remW - gold) <= MARGEN || Math.abs(remH - gold) <= MARGEN) {
                console.log(`  ✨ ¡REMANENTE ORO DETECTADO! (Cerca de ${gold}mm)`);
                goldCount++;
            }
        });
    });

    console.log(`\n🏆 TOTAL REMANENTES ORO SALVADOS: ${goldCount}`);
}

runGoldTest().catch(console.error);
