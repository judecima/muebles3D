import { classifyRemnant } from './remnantEvaluator';
import { pickBestContainerAdvanced } from './containerSelector';
import { fillSinglePanel } from './engine';
import { InternalPart } from '../types/engine';

interface Remnant {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export function runGlobalOptimization(pool: InternalPart[], panelW: number, panelH: number, config: any, colors: Record<string, string> = {}) {
  const remnantPool: Remnant[] = [];
  const panels = [];
  const globalDebugEvents: any[] = [];

  let panelIndex = 1;

  while (pool.some(p => !p.placed)) {
    const remainingPieces = pool.filter(p => !p.placed);
    if (remainingPieces.length === 0) break;

    const containers = [
      ...remnantPool.map(r => ({ ...r, isRemnant: true })),
      { width: panelW, height: panelH, x: 0, y: 0, isRemnant: false }
    ];

    const container = pickBestContainerAdvanced(containers, remainingPieces, config, colors, globalDebugEvents);

    if (!container) break;

    const result = fillSinglePanel(
      remainingPieces,
      container.width,
      container.height,
      config.kerf,
      container.isRemnant ? 0 : config.trim,
      container.width,
      container.height,
      colors,
      config.strategy,
      panelIndex,
      config.hasGrain,
      true,
      config.enableV44BalancedMode
    );

    // marcar piezas como colocadas
    const placedIds = new Set(result.parts.filter((p: any) => !p.isLeftover).map((p: any) => p.id));
    
    // Safety break if no pieces placed in a remnant to avoid loops
    if (placedIds.size === 0 && container.isRemnant) {
        const idx = remnantPool.findIndex(r => r.width === container.width && r.height === container.height);
        if (idx !== -1) remnantPool.splice(idx, 1);
        continue;
    }

    pool.forEach(p => {
      if (placedIds.has(p.id)) p.placed = true;
    });

    // recolectar sobrantes y reinyectar
    const newRemnants: Remnant[] = result.parts
      .filter((p: any) => p.isLeftover)
      .map((r: any) => ({
        width: r.width,
        height: r.height,
        x: r.x,
        y: r.y
      }))
      .filter((r: any) => classifyRemnant(r) !== 'WASTE');

    // Si era un remanente y lo usamos, lo quitamos
    if (container.isRemnant) {
        const idx = remnantPool.findIndex(r => r.width === container.width && r.height === container.height);
        if (idx !== -1) remnantPool.splice(idx, 1);
    }

    remnantPool.push(...newRemnants);

    if (!container.isRemnant) {
      if ((result as any).debugEvents) {
        globalDebugEvents.push(...(result as any).debugEvents);
      }
      panels.push(result);
      panelIndex++;
    }
  }

  return { panels, debugEvents: globalDebugEvents };
}
