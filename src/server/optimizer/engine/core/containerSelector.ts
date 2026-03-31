import { evaluateRemnantValue } from './remnantEvaluator';
import { fillSinglePanel } from './engine';
import { InternalPart, EngineDebugEvent } from '../types/engine';

interface Container {
  width: number;
  height: number;
  isRemnant: boolean;
  x?: number;
  y?: number;
}

export function simulateContainer(container: Container, pieces: InternalPart[], config: any, colors: Record<string, string> = {}, debugEvents?: any[]) {
  // Simular solo con las primeras 3 piezas para ver el impacto inmediato
  const testPieces = pieces.slice(0, 3).map(p => ({ ...p, placed: false }));

  return fillSinglePanel(
    testPieces,
    container.width,
    container.height,
    config.kerf,
    container.isRemnant ? 0 : config.trim,
    container.width,
    container.height,
    colors,
    config.strategy,
    0,
    config.hasGrain
  );
}

function simulateFuture(container: Container, pieces: InternalPart[], config: any, colors: Record<string, string> = {}) {
  const sim1 = simulateContainer(container, pieces, config, colors);

  // Ver qué piezas quedarían si eligiéramos este contenedor
  const placedIds = new Set(sim1.parts.filter((p: any) => !p.isLeftover).map((p: any) => p.id));
  const remaining = pieces.filter(p => !placedIds.has(p.id));

  if (remaining.length === 0) return sim1.usedArea;

  // Simular qué pasaría después en una placa nueva
  const nextContainer: Container = {
    width: config.panelWidth,
    height: config.panelHeight,
    isRemnant: false
  };

  const sim2 = simulateContainer(nextContainer, remaining, config, colors);

  // Retornar el área total útil proyectada
  return sim1.usedArea + sim2.usedArea;
}

export function pickBestContainerAdvanced(containers: Container[], pieces: InternalPart[], config: any, colors: Record<string, string> = {}, debugEvents?: any[]) {
  let best = null;
  let bestScore = -Infinity;
  const candidates: any[] = [];

  for (const c of containers) {
    const sim = simulateContainer(c, pieces, config, colors);

    const remnantValue = (sim.parts || [])
      .filter((p: any) => p.isLeftover)
      .reduce((acc: number, r: any) => acc + evaluateRemnantValue(r), 0);

    // FASE 2: Lookahead Real
    const futureScore = simulateFuture(c, pieces, config, colors);

    // Scoring industrial: Área usada + Bonus por calidad de sobrante + Proyección a futuro
    const score =
      futureScore +
      remnantValue * 2 + 
      (c.isRemnant ? 1000000 : 0); // Bonus por priorizar reuso de sobrante existente

    candidates.push({
      container: `${c.width}x${c.height}${c.isRemnant ? ' (Remnant)' : ' (New Panel)'}`,
      score,
      futureScore,
      remnantValue
    });

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  if (config.debug && debugEvents) {
    const winner: EngineDebugEvent['winner'] = best ? { 
      width: best.width, 
      height: best.height, 
      isRemnant: best.isRemnant, 
      totalScore: bestScore 
    } : null;

    debugEvents.push({
      type: 'CONTAINER_SELECT',
      stage: 'GLOBAL_OPTIMIZATION',
      message: best ? `Selected container ${best.width}x${best.height}` : 'No container selected',
      seq: debugEvents.length + 1,
      candidates,
      winner
    });
  }

  return best;
}
