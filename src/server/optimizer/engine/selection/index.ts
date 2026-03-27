import { InternalPart, FreeRect, EngineConfig, EngineState, IndexedPieces } from '../types/engine';
import { scoreWithLookahead } from '../scoring';

export function removeFromIndex(indexed: IndexedPieces, piece: InternalPart) {
  const hList = indexed.byHeight.get(piece.height);
  if (hList) {
    const filtered = hList.filter(p => p !== piece);
    if (filtered.length) indexed.byHeight.set(piece.height, filtered);
    else indexed.byHeight.delete(piece.height);
  }
  const wList = indexed.byWidth.get(piece.width);
  if (wList) {
    const filtered = wList.filter(p => p !== piece);
    if (filtered.length) indexed.byWidth.set(piece.width, filtered);
    else indexed.byWidth.delete(piece.width);
  }
}

function getCandidatesByDim(map: Map<number, InternalPart[]>, target: number, eps: number): InternalPart[] {
  const candidates: InternalPart[] = [];
  const start = Math.floor(target - eps);
  const end = Math.ceil(target + eps);
  for (let d = start; d <= end; d++) {
    const list = map.get(d);
    if (list) candidates.push(...list);
  }
  return candidates;
}

function deterministicRandom(seed: number, placements: number): number {
  const value = Math.sin(seed + placements) * 10000;
  return value - Math.floor(value);
}

function getPlacementKey(piece: InternalPart, rect: FreeRect, state: EngineState): string {
  let key = `${piece.name}_${piece.width}x${piece.height}_${rect.x}_${rect.y}_${rect.width}x${rect.height}`;
  if (state.activeStrips.length > 0) {
    key += `_strips:${state.activeStrips.map(s => `${s.strategy}_${s.lockedDim}_${s.startX}_${s.startY}`).join(',')}`;
  }
  const freeCount = Math.min(20, state.freeRects.length);
  key += `_free:${freeCount}_p:${state.stats.placements}`;
  return key;
}

export function selectBestPiece(
  pieces: InternalPart[],
  rect: FreeRect,
  config: EngineConfig,
  state: EngineState,
  indexed: IndexedPieces
): { piece: InternalPart; rotated: boolean; w: number; h: number } | null {
  let bestPiece: InternalPart | null = null;
  let bestScore = -Infinity;
  let bestRotated = false;

  const topK = config.features.useTopKSelection ? 3 : 1;
  const candidatesScored: { piece: InternalPart; score: number; rotated: boolean }[] = [];

  const tryPiece = (piece: InternalPart, w: number, h: number, rotated: boolean) => {
    if (w <= rect.width && h <= rect.height) {
      const key = getPlacementKey(piece, rect, state);

      if (config.features.useInvalidCache && state.invalidCache) {
        if (state.invalidCache.has(key)) return;
      }

      const score = scoreWithLookahead(w, h, rect, config, state);

      if (config.features.useInvalidCache && state.invalidCache && score < -50000 && state.stats.placements > 5) {
        state.invalidCache.add(key);
        return;
      }

      if (topK === 1) {
        if (score > bestScore) {
          bestScore = score;
          bestPiece = piece;
          bestRotated = rotated;
        }
      } else {
        candidatesScored.push({ piece, score, rotated });
      }
    }
  };

  let candidates: InternalPart[] = [];
  if (config.features.useIndexedSelection && state.activeStrips.length > 0) {
    const locked = state.activeStrips[0].lockedDim;
    if (config.strategy === 'horizontal') {
      candidates = getCandidatesByDim(indexed.byHeight, locked, config.eps);
    } else {
      candidates = getCandidatesByDim(indexed.byWidth, locked, config.eps);
    }
    if (candidates.length === 0) candidates = pieces;
  } else {
    candidates = pieces;
  }

  for (const piece of candidates) {
    if (piece.placed) continue;
    const canRot = !config.hasGrain || (piece.grainDirection === 'libre');

    tryPiece(piece, piece.width, piece.height, false);
    if (canRot) tryPiece(piece, piece.height, piece.width, true);
  }

  if (topK === 1) {
    if (!bestPiece) return null;
    const w = bestRotated ? bestPiece.height : bestPiece.width;
    const h = bestRotated ? bestPiece.width : bestPiece.height;
    return { piece: bestPiece, rotated: bestRotated, w, h };
  } else {
    if (candidatesScored.length === 0) return null;
    candidatesScored.sort((a, b) => b.score - a.score);
    const r = deterministicRandom(config.seed ?? 0, state.stats.placements);
    const selectedIdx = Math.floor(r * Math.min(topK, candidatesScored.length));
    const selected = candidatesScored[selectedIdx];
    const w = selected.rotated ? selected.piece.height : selected.piece.width;
    const h = selected.rotated ? selected.piece.width : selected.piece.height;
    return { piece: selected.piece, rotated: selected.rotated, w, h };
  }
}
