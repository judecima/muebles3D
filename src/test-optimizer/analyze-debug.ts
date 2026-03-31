import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('optimizer-debug.json', 'utf8'));
const downgrades = data.filter((e: any) => e.type === 'BLOCK_DOWNGRADED_FOR_CONSOLIDATION');

console.log(`Downgrades totales: ${downgrades.length}`);
console.log(`Downgrades con score < 0: ${downgrades.filter((d: any) => d.metadata.finalScoreAfterPenalty < 0).length}`);

const gates: Record<string, number> = {};
const strengths: Record<string, number> = {};
const uniquePiecesRescued = new Set<string>();

// 1. Analizar eventos de selección para ver quién ganó por rescate
const selections = data.filter((e: any) => e.type === 'PIECE_SELECT');
const winnersByRescue = new Set<string>();
const rescueEvaluations = data.filter((e: any) => e.type === 'BLOCK_DOWNGRADED_FOR_CONSOLIDATION');

selections.forEach((s: any) => {
  if (s.metadata?.selectionReason === 'rescued_by_hbc' && s.winner) {
    winnersByRescue.add(s.pieceId);
  }
});

// 2. Analizar evaluaciones (candidatos rescatados por HBC)
const pieceRescueStatus: Record<string, { 
    evals: number, 
    placed: boolean, 
    wonByRescue: boolean, 
    strength: string, 
    firstSeq: number, 
    placedSeq?: number,
    score: number
}> = {};

rescueEvaluations.forEach((d: any) => {
  const pieceId = d.pieceId;
  const strength = d.metadata.lastOfTypeStrength || 'N/A';
  uniquePiecesRescued.add(pieceId);

  if (!pieceRescueStatus[pieceId]) {
    pieceRescueStatus[pieceId] = {
      evals: 0,
      placed: false,
      wonByRescue: false,
      strength: strength,
      firstSeq: d.seq,
      score: d.metadata.finalScoreAfterPenalty
    };
  }
  pieceRescueStatus[pieceId].evals++;
  
  const gate = d.metadata.primaryDowngradeGate;
  gates[gate] = (gates[gate] || 0) + 1;
  if (gate === 'last_of_type') {
    strengths[strength] = (strengths[strength] || 0) + 1;
  }
});

// 3. Cruzar con colocaciones
const placements = data.filter((e: any) => e.type === 'PIECE_PLACED');
placements.forEach((p: any) => {
  if (pieceRescueStatus[p.pieceId]) {
    pieceRescueStatus[p.pieceId].placed = true;
    pieceRescueStatus[p.pieceId].placedSeq = p.seq;
    if (winnersByRescue.has(p.pieceId)) {
        pieceRescueStatus[p.pieceId].wonByRescue = true;
    }
  }
});

const totalUnique = uniquePiecesRescued.size;
const placedUnique = Object.values(pieceRescueStatus).filter(r => r.placed).length;
const directSuccess = Object.values(pieceRescueStatus).filter(r => r.wonByRescue).length;

console.log('--- MÉTRICAS DE EFECTIVIDAD HBC ---');
console.log(`Piezas únicas rescatadas: ${totalUnique}`);
console.log(`Piezas colocadas finalmente: ${placedUnique} (${((placedUnique/totalUnique)*100).toFixed(2)}%)`);
console.log(`Éxitos directos (Gano por ser rescatada): ${directSuccess}`);
console.log(`Rescates redundantes (Evals totales / Piezas): ${(rescueEvaluations.length / totalUnique).toFixed(1)} evals/pieza`);

console.log('\n--- DISTRIBUCIÓN DE GATE ---');
console.table(gates);
console.log('Fortaleza de last_of_type:');
console.table(strengths);

// Strength Metrics
const strengthMetrics: any = {};
['strong', 'medium', 'weak'].forEach(s => {
    const list = Object.values(pieceRescueStatus).filter(r => r.strength === s);
    if (list.length > 0) {
        const placed = list.filter(r => r.placed).length;
        const won = list.filter(r => r.wonByRescue).length;
        strengthMetrics[s] = {
            totalPieces: list.length,
            placed: placed,
            directWin: won,
            waste: (list.length - placed)
        };
    }
});
console.log('\nRescue by Strength:');
console.table(strengthMetrics);

// Negative Rescue
const negRescues = Object.values(pieceRescueStatus).filter(r => r.score < 0);
if (negRescues.length > 0) {
    const negPlaced = negRescues.filter(r => r.placed).length;
    console.log(`\nNegative Rescue Success (score < 0):`);
    console.log(`- Total piezas únicas: ${negRescues.length}`);
    console.log(`- Colocadas: ${negPlaced} (${((negPlaced/negRescues.length)*100).toFixed(2)}%)`);
}

// Pasos promedio
const steps = Object.values(pieceRescueStatus)
    .filter(r => r.placed)
    .map(r => r.placedSeq! - r.firstSeq);
if (steps.length > 0) {
    const avgSteps = steps.reduce((a, b) => a + b, 0) / steps.length;
    console.log(`\nPromedio de pasos (seq) desde primer rescate hasta colocación: ${avgSteps.toFixed(1)}`);
}
