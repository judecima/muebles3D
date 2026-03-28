import { InternalPart, FreeRect, EngineConfig, EngineState } from '../types/engine';
import { scoreWithLookahead } from '../scoring';

function getPlacementKey(p: InternalPart, r: FreeRect, state: EngineState): string {
  return `${p.width}x${p.height}@${r.width}x${r.height}`;
}

export function selectBestPiece(
  pieces: InternalPart[],
  rect: FreeRect,
  config: EngineConfig,
  state: EngineState,
  indexed: any
): { piece: InternalPart; rotated: boolean } | null {
  let bestPiece: InternalPart | null = null;
  let bestRotated = false;
  let bestScore = -Infinity;

  const tryPiece = (piece: InternalPart, w: number, h: number, rotated: boolean) => {
    // Tolerancia de 1.5mm para lidiar con errores de punto flotante y kerf
    if (w <= rect.width + 1.5 && h <= rect.height + 1.5) {
      const key = getPlacementKey(piece, rect, state);

      if (config.features.useInvalidCache && state.invalidCache?.has(key)) return;

      const score = scoreWithLookahead(w, h, rect, config, state);

      if (config.features.useInvalidCache && state.invalidCache && score < -1000000) {
        state.invalidCache.add(key);
        return;
      }

      if (score > bestScore) {
        bestScore = score;
        bestPiece = piece;
        bestRotated = rotated;
      }
    }
  };

  for (const piece of pieces) {
    if (piece.placed) continue;
    
    const canRot = !config.hasGrain || (piece.grainDirection === 'libre');

    tryPiece(piece, piece.width, piece.height, false);
    if (canRot) tryPiece(piece, piece.height, piece.width, true);
  }

  if (!bestPiece) return null;
  
  const bp: InternalPart = bestPiece;
  return { piece: bp, rotated: bestRotated };
}
