import { FreeRect, EngineConfig } from '../types/engine';

export interface RemnantEvaluation {
  score: number;
  blocked: boolean;
  reason?: string;
  details?: {
    remW: number;
    remH: number;
  };
}

// Constantes industriales para el balance de puntuación
const BONUS_REUSABLE_REMNANT = 5000000;    // 5M: Impactante pero menor a un full fill (25M+)
const PENALTY_SLIVER_REMNANT = -2000000;   // -2M: Desincentiva pero no bloquea si no hay opción
const BONUS_PERFECT_FIT = 10000000;       // 10M: Bonus extra por no dejar remanentes complejos

/**
 * Evalúa la calidad de los remanentes generados por una colocación local.
 * Aplica un Hard Block si se genera "basura" inmanejable.
 */
export function evaluateRemnantQuality(
  pieceW: number,
  pieceH: number,
  rect: FreeRect,
  config: EngineConfig
): RemnantEvaluation {
  const eps = config.eps || 0.5;
  const minWaste = config.minWasteBlockDim || 40;
  const minReusable = config.minReusableDim || 60;

  // 1. Calcular remanentes directos (tras kerf)
  const remW = rect.width - pieceW - config.kerf;
  const remH = rect.height - pieceH - config.kerf;

  let score = 0;
  let blocked = false;
  let reason = '';

  // 2. Lógica de Bloqueo Rígido (Hard Block)
  // Bloqueamos si el remanente es > epsilon (no es ajuste perfecto)
  // pero es < minWaste (es basura inútil)
  
  // Evaluación en Ancho
  if (remW > eps && remW < minWaste) {
    blocked = true;
    reason = `Basura en eje X (${remW.toFixed(1)}mm < ${minWaste}mm)`;
  }

  // Evaluación en Alto
  if (remH > eps && remH < minWaste) {
    blocked = true;
    reason = `Basura en eje Y (${remH.toFixed(1)}mm < ${minWaste}mm)`;
  }

  if (blocked) {
    return { score: -100000000, blocked, reason, details: { remW, remH } };
  }

  // 3. Scoring de Calidad (Nobleza)
  
  // Bonus por Ajuste Perfecto (Eje X o Y)
  if (Math.abs(remW) <= eps) score += BONUS_PERFECT_FIT / 2;
  if (Math.abs(remH) <= eps) score += BONUS_PERFECT_FIT / 2;

  // Premiar Remanentes Reutilizables
  if (remW >= minReusable) {
    score += BONUS_REUSABLE_REMNANT;
    // Plus por área útil significante
    if (remW > 300) score += 2000000;
  }
  
  if (remH >= minReusable) {
    score += BONUS_REUSABLE_REMNANT;
    if (remH > 300) score += 2000000;
  }

  // Penalización por "Astillas" (Slivers)
  // Si está justo por encima del bloqueo pero sigue siendo difícil de reusar
  if (remW >= minWaste && remW < minReusable) {
    score += PENALTY_SLIVER_REMNANT;
  }
  if (remH >= minWaste && remH < minReusable) {
    score += PENALTY_SLIVER_REMNANT;
  }

  return {
    score,
    blocked: false,
    details: { remW, remH }
  };
}
