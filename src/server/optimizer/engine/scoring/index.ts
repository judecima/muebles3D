import { FreeRect, EngineConfig, EngineState } from '../types/engine';
import { approxEqual, log } from '../utils';
import { GuillotineStrategy } from '../space/guillotine';

const STRICT_EPS_FACTOR = 0.5;
export const DOWNGRADED_HARD_BLOCK_PENALTY = 25000000;

export function scorePlacement(
  pieceW: number,
  pieceH: number,
  rect: FreeRect,
  config: EngineConfig,
  state: EngineState,
  poolContext?: any
): number {
  let score = pieceW * pieceH;
  const pieceArea = pieceW * pieceH;

  // 2. Bonus de Llenado de Tira (Segmentación Estricta - XML Style)
  const guidingDim = config.strategy === 'horizontal' ? rect.height : rect.width;
  const pieceGuidingDim = config.strategy === 'horizontal' ? pieceH : pieceW;
  
  const fillRatio = (pieceGuidingDim + config.kerf) / guidingDim;

  if (approxEqual(pieceGuidingDim, guidingDim, config.eps)) {
      score += 80000000;
  } else if (fillRatio > 0.995) {
      score += 75000000;
  } else if (fillRatio > 0.98) {
      score += 70000000;
  } else if (fillRatio > 0.95) {
      score += 60000000;
  } else if (fillRatio > 0.90) {
      score += 40000000;
  } else if (fillRatio > 0.6) {
      score += Math.floor(fillRatio * 30000000);
  }

  const remW = rect.width - pieceW - config.kerf;
  const remH = rect.height - pieceH - config.kerf;
  const completionDim = config.strategy === 'horizontal' ? remW : remH;

  if (Math.abs(completionDim) < 0.5) {
      score += 25000000;
  } else if (completionDim > 0 && completionDim < config.minReusableDim) {
      score -= 25000000; // Incrementado para forzar cierre limpio
  }

  // --- HEURÍSTICA ADAPTATIVA DE CONSOLIDACIÓN INDUSTRIAL ---
  let adaptiveBonus = 0;
  let metadata: any = {};

  if (poolContext && poolContext.topKPoolDims) {
      const { topKPoolDims, remainingPiecesCount, remainingPoolArea } = poolContext;
      
      const matchW = topKPoolDims.find((d: any) => approxEqual(remW, d.value, config.eps || 0.5));
      const matchH = topKPoolDims.find((d: any) => approxEqual(remH, d.value, config.eps || 0.5));
      const bestMatch = matchW || matchH;

      let tier: 'high'|'medium'|'dimension_only'|'none' = 'none';
      let reason = "";
      let strategicValue: 'high' | 'medium' | 'low' = 'low';
      let localFeasibilityScore = 1.0;
      let hbcConflictAvoided = false;

      if (bestMatch) {
          // 1. UTILIDAD GEOMÉTRICA (Industrial Match)
          const matchedAxis = matchW ? 'width' : 'height';
          const otherAxisDim = matchW ? remH : remW;
          const isIndustrialMatch = otherAxisDim >= (config.minReusableDim || 60);

          // 2. VALOR ESTRATÉGICO (Pool Value Match)
          const countRatio = remainingPiecesCount > 0 ? (bestMatch.count / remainingPiecesCount) : 0;
          const areaRatio = remainingPoolArea > 0 ? (bestMatch.totalArea / remainingPoolArea) : 0;
          
          if (remainingPiecesCount <= 12) {
              if (countRatio >= 0.1 || areaRatio >= 0.08) strategicValue = 'high';
              else strategicValue = 'medium';
          } else {
              if (countRatio >= 0.05 || areaRatio >= 0.15) strategicValue = 'high';
              else if (countRatio >= 0.02 || areaRatio >= 0.05) strategicValue = 'medium';
          }

          // 3. FACTIBILIDAD LOCAL (Local Feasibility Gate)
          if (otherAxisDim > 0.5 && otherAxisDim < (config.minReusableDim || 60)) {
              hbcConflictAvoided = true;
              localFeasibilityScore = 0.5;
          }
          
          const isRightEdge = (rect.x + pieceW) > (config.panelWidth * 0.7);
          if (config.strategy === 'horizontal' && matchedAxis === 'height' && remW < 40 && isRightEdge) {
              localFeasibilityScore = 0.2;
          }

          if (isIndustrialMatch) {
              if (strategicValue === 'high' && localFeasibilityScore > 0.4) {
                  tier = 'high';
                  adaptiveBonus = (20000000 + (5000000 * countRatio)) * localFeasibilityScore;
                  reason = "high_validated";
              } else if (strategicValue === 'high' || strategicValue === 'medium') {
                  tier = 'medium';
                  adaptiveBonus = (8000000 + (4000000 * countRatio)) * localFeasibilityScore;
                  reason = localFeasibilityScore <= 0.4 ? "downgraded_by_local_cost" : "medium_strategic_value";
              } else {
                  tier = 'dimension_only';
                  adaptiveBonus = 1000000 + (1000000 * localFeasibilityScore);
                  reason = "low_strategic_value";
              }
          }
      }

      // --- PRIORIDAD PROGRESIVA DINÁMICA (v44.7 Adaptive) ---
      const pNumber = config.panelNumber || 1;
      const panelIndexWeight = pNumber === 1 ? 1.0
                             : pNumber === 2 ? 0.7
                             : pNumber === 3 ? 0.4
                             : 0.2;
      
      // --- v44.8: MANTENIMIENTO DE JERARQUÍA Y CONTROL DE DIFERIMIENTO ---
      const isV44Balanced = config.features.enableV44BalancedMode;
      const confidence = poolContext.lastPanelConfidence || 0;
      const mode = poolContext.modeTransitionState || "fill";
      
      let retentionWeight = 1.0;
      let remnantWeight = 0.0;
      let blendFactor = 0;

      if (isV44Balanced) {
        let dynamicShift = 0;
        const opportunityScore = poolContext.currentPanelOpportunityScore || 0;
        
        // v44.8.1-final: Suavizado del sesgo Pro-Fill en paneles no finales
        if (!poolContext.isLikelyLastPanel) {
          dynamicShift = 0.08 + (opportunityScore * 0.1); // Shift dinámico suave (0.08 - 0.18)
        }

        if (mode === "hybrid") {
          const t = Math.max(0, Math.min(1, (confidence - (0.4 + dynamicShift)) / 0.3));
          blendFactor = t * t; // Blending Quadrático (Sesgo Pro-Fill)
          retentionWeight = 1.0 - (blendFactor * (1.0 - (poolContext.isLikelyLastPanel ? 0.2 : 0.4)));
          remnantWeight = blendFactor; // Sube de 0.0 a 1.0
        } else if (mode === "remanent") {
          retentionWeight = poolContext.isLikelyLastPanel ? 0.2 : 0.4;
          remnantWeight = 1.0;
        }

        (poolContext as any).dynamicHybridShiftApplied = dynamicShift;
        (poolContext as any).effectiveHybridStart = (0.4 + dynamicShift).toFixed(3);
      }

      const opportunityScore = poolContext.currentPanelOpportunityScore || 0;
      const finalPriorityScore = panelIndexWeight * opportunityScore;

      // --- DOMINANCIA DEL PANEL 1 (v44.7.5 Legacy Support) ---
      const isP1Magnet = pNumber === 1;
      const isSmallOrNarrow = (pieceArea < 200000) || (pieceW < 100) || (pieceH < 100);
      const panel1DominanceBonus = isP1Magnet ? (isSmallOrNarrow ? 50000000 : 25000000) : 0;

      // --- SEÑAL DE CERRADOR DE BANDA (ESTRUCTURAL) - INDEPENDIENTE DEL MATCH ---
      let bandCloserValue = 0;
      let bandCloserApplied = false;
      let bandCloserBlockedByAlternative = false;
      let bandCloserReason = "no_match";
      let alternativeBlockReason: 'better_band_match' | 'better_local_closure' | 'significantly_higher_area' | 'none' = 'none';

      const isMatchingHeight = approxEqual(pieceH, rect.height, config.eps || 0.5);
      const isNarrowOrFinal = (pieceW < config.panelWidth * 0.2) || (remW < (config.eps || 0.5) * 2);
      
      if (config.strategy === 'horizontal' && isMatchingHeight && isNarrowOrFinal) {
          const isMature = (poolContext.bandMaturity >= 0.55) || (poolContext.rowCountInBand >= 2);
          
          const topAlt = poolContext.topAlternativeCandidate;
          if (topAlt && topAlt.id !== (state as any)._currentPieceId) {
              // Tolerancia de bloqueo dinámica según prioridad
              const closureTolerance = 0.02 + (finalPriorityScore * 0.04); // P1=0.06, P(Tail)=0.02
              
              if (topAlt.hasBandMatch && !isMatchingHeight) {
                  bandCloserBlockedByAlternative = true;
                  alternativeBlockReason = 'better_band_match';
              } else if (topAlt.fillRatio > fillRatio + closureTolerance) {
                  bandCloserBlockedByAlternative = true;
                  alternativeBlockReason = 'better_local_closure';
              } else if (topAlt.area > pieceArea * 1.5 && topAlt.fillRatio >= fillRatio - 0.01) {
                  bandCloserBlockedByAlternative = true;
                  alternativeBlockReason = 'significantly_higher_area';
              }
          }

          if (isMature && !bandCloserBlockedByAlternative) {
              bandCloserValue = Math.floor(15000000 * finalPriorityScore);
              bandCloserApplied = true;
              bandCloserReason = "mature_band";
          } else if (bandCloserBlockedByAlternative) {
              bandCloserValue = 0;
              bandCloserReason = "blocked_by_strategic_alternative";
          } else {
              bandCloserValue = Math.floor(5000000 * finalPriorityScore);
              bandCloserApplied = true;
              bandCloserReason = "young_band_no_competition";
          }
      }

      // --- v44.8: BONO DE RETENCIÓN EQUILIBRADO ---
      let balancedRetentionBonus = 0;
      if (isV44Balanced) {
          // Bono base de retención (10M escalado por prioridad y peso híbrido)
          const baseRetention = 10000000;
          balancedRetentionBonus = Math.floor(baseRetention * retentionWeight * panelIndexWeight);
      }

      // --- SEÑAL DE HIGIENE DE TIRA (PIRÁMIDE INDUSTRIAL) ---
      let stripHygienePenalty = 0;
      let isStripConsistent = true;
      if (config.strategy === 'horizontal' && fillRatio < 0.9 && !state.isConsolidationMode) {
          const hasBetterHeightMatch = poolContext.maxAreaFittingRow > (pieceArea * 1.5);
          if (hasBetterHeightMatch) {
              // Relajar higiene en modo remanente o durante la pasada de rescate
              const isLastRescue = poolContext.lastReasonablePassActive;
              const hygieneWeight = (mode === "remanent" || isLastRescue) ? 0.2 : 1.0;
              stripHygienePenalty = Math.floor((1 - fillRatio) * 10000000 * hygieneWeight);
              isStripConsistent = false;
          }
      }

      // --- v44.8.1-final: ASISTENCIA CONTEXTUAL LRP Y COMPARACIÓN H vs V ---
      let lastReasonablePassAssistance = 0;
      if (poolContext.lastReasonablePassActive) {
          lastReasonablePassAssistance = Math.floor(10000000 * panelIndexWeight);
      }

      let orientationRemnantAdvantage = 0;
      let preferredCutFlow = "standard";
      if (isV44Balanced) {
          const altW = pieceH;
          const altH = pieceW;
          const canRotate = (pieceW !== pieceH);
          if (canRotate && altW <= rect.width + 0.5 && altH <= rect.height + 0.5) {
              const currentMinRem = Math.min(remW, remH);
              const altRemW = rect.width - altW - config.kerf;
              const altRemH = rect.height - altH - config.kerf;
              const altMinRem = Math.min(altRemW, altRemH);
              if (currentMinRem > altMinRem + 5) {
                  orientationRemnantAdvantage = 4000000;
                  preferredCutFlow = "better_remnant_alignment";
              }
          }
      }

      // --- v44.9: INDUSTRIAL REFINEMENT (LOOKAHEAD & STRUCTURE) ---
      let lookaheadBonus = 0;
      let bandClosureBonus = 0;
      let fillerActivationBonus = 0;
      let microBandPenalty = 0;

      const isV449 = config.features.enableDepth1Lookahead;
      
      if (isV449) {
          // 1. BAND CLOSURE PRIORITY (Cierre de Banda Proactivo)
          const isClosingBand = config.strategy === 'horizontal' 
            ? approxEqual(pieceW, rect.width, config.eps || 0.5)
            : approxEqual(pieceH, rect.height, config.eps || 0.5);
          
          if (isClosingBand) {
              const closureStrength = 10000000 * (1 - (confidence * 0.5)); // Más fuerte en FILL
              bandClosureBonus = Math.floor(closureStrength * panelIndexWeight);
          }

          // 2. EARLY FILLER ACTIVATION (Piezas chicas para cierre)
          const isSmallFiller = (pieceArea < 120000); // < 0.12m2
          if (isSmallFiller && isClosingBand && mode === "fill") {
              fillerActivationBonus = 5000000 * panelIndexWeight;
          }

          // 3. SOFT MICRO-BAND PENALTY (120mm Threshold) - DISABLED IN P1
          const isP1 = config.panelNumber === 1;
          const microThreshold = 120;
          const resultingStripDim = config.strategy === 'horizontal' ? remH : remW;
          
          if (!isP1 && resultingStripDim > 0.5 && resultingStripDim < microThreshold) {
              const severity = (microThreshold - resultingStripDim) / microThreshold;
              const basePenalty = 4000000; // Reducido de 8M a 4M
              
              // Solo penalizar si NO hay match en el pool para ese espacio residual
              const poolMatch = poolContext.topKPoolDims.some((d: any) => Math.abs(d.value - resultingStripDim) < 2.0);
              const utilityFactor = (tier !== 'none' || poolMatch) ? 0.2 : 1.0;
              
              microBandPenalty = Math.floor(basePenalty * severity * utilityFactor * panelIndexWeight);
          }
      }

      // Aplicar Cierre de Banda, Higiene y Dominancia
      const legacyBonus = bandCloserValue - stripHygienePenalty + (isV44Balanced ? 0 : panel1DominanceBonus);
      const v448Bonus = balancedRetentionBonus + (bandCloserValue * (1 - remnantWeight)) - (stripHygienePenalty * (1 - remnantWeight));
      const v449Bonus = bandClosureBonus + fillerActivationBonus - microBandPenalty;
      
      const totalAdaptive = (isV44Balanced ? v448Bonus : legacyBonus) + 
                          lastReasonablePassAssistance + 
                          orientationRemnantAdvantage +
                          (isV449 ? v449Bonus : 0);

      const cappedBonus = Math.max(-25000000, Math.min(totalAdaptive, 25000000));
      const isCapped = totalAdaptive > 25000000 || totalAdaptive < -25000000;
      adaptiveBonus = cappedBonus;

      metadata = {
          industrialMatchTier: tier,
          industrialMatchTierReason: reason,
          poolValueMatchScore: strategicValue,
          localFeasibilityPassed: localFeasibilityScore > 0.4,
          hbcConflictAvoided,
          // v44.8 Traceability
          lastPanelConfidence: confidence.toFixed(3),
          modeTransitionState: mode,
          hybridRetentionWeight: retentionWeight.toFixed(3),
          hybridRemnantWeight: remnantWeight.toFixed(3),
          blendingFactor: blendFactor.toFixed(3),
          balancedRetentionBonus,
          // v44.9 Industrial Refinement
          bandClosureBonus,
          fillerActivationBonus,
          microBandPenalty,
          isV449Active: isV449,
          // Legacy Compatibility / Context
          panelIndexWeight: panelIndexWeight.toFixed(2),
          currentPanelOpportunityScore: (poolContext.currentPanelOpportunityScore || 0).toFixed(3),
          finalPriorityScore: finalPriorityScore.toFixed(3),
          panel1DominanceBonus,
          stripHygienePenalty,
          bonusCappedByLocalRule: isCapped,
          // v44.8.1 Industrial Traceability
          isLikelyLastPanel: poolContext.isLikelyLastPanel,
          lastPanelModeReason: poolContext.lastPanelModeReason,
          dynamicHybridShiftApplied: (poolContext as any).dynamicHybridShiftApplied?.toFixed(3),
          effectiveHybridStart: (poolContext as any).effectiveHybridStart,
          lastReasonablePassAssistanceApplied: lastReasonablePassAssistance > 0,
          orientationRemnantAdvantage,
          preferredCutFlow
      };
  }

  // 4. CONTINUIDAD GEOMÉTRICA (Penalizaciones Base)
  const sideDim = config.strategy === 'horizontal' ? remH : remW;
  const threshold = config.minReusableDim || 70;
  
  let deadWasteScore = 0;
  if (sideDim > 0.5 && sideDim < threshold) {
      // Modular penalización de basura por el modo (el modo remanente es más estricto)
      const wasteWeight = poolContext.modeTransitionState === "remanent" ? 1.5 : 1.0;
      deadWasteScore -= Math.floor(2000000 * wasteWeight);
      deadWasteScore -= Math.floor(sideDim * 100000 * wasteWeight); 
  }

  // Inyectar metadatos en el estado para que selectBestPiece los capture
  if (config.debug && (state as any)._currentMetadata) {
      (state as any)._currentMetadata = metadata;
  }

  return score + deadWasteScore + adaptiveBonus;
}

export function scoreWithLookahead(
  pieceW: number,
  pieceH: number,
  rect: FreeRect,
  config: EngineConfig,
  state: EngineState,
  poolContext?: any
): number {
  return scorePlacement(pieceW, pieceH, rect, config, state, poolContext);
}

export function evaluatePanelQuality(panel: any, isLastPanel: boolean = false): number {
  // 1. Eficiencia base (Prioridad máxima)
  let score = panel.efficiency * 1000000;
  
  // 2. Penalizar fuertemente la fragmentación
  const leftoverCount = panel.leftovers?.length || 0;
  score -= (leftoverCount * 1000000); 
  
  // 3. Premiar "Sobrante Premium" REUTILIZABLE (Estilo Lepton)
  if (panel.leftovers && panel.leftovers.length > 0) {
    const areas = panel.leftovers.map((l: any) => l.width * l.height);
    const maxArea = Math.max(...areas);
    
    // Bonus por área del retazo más grande (Escala masiva para consolidación)
    score += maxArea * 5; 

    // Encontrar el retazo más grande
    const biggest = panel.leftovers.reduce((prev: any, current: any) => 
      (current.width * current.height > prev.width * prev.height) ? current : prev
    );
    
    const minDim = Math.min(biggest.width, biggest.height);
    const maxDim = Math.max(biggest.width, biggest.height);
    const aspectRatio = maxDim / (minDim || 1);

    // Si mide más de 300x600 o similar, es muy valioso
    if (minDim >= 300 && maxDim >= 600) score += 10000000;
    
    // Penalización agresiva por "Fideos" (Noodles)
    if (aspectRatio > 7) score -= 20000000;
    
    // Bonus por "Planimetría": piezas más cuadradas son mejores
    if (aspectRatio < 3) score += 5000000;
  }

  // 4. PREFERENCIAS POR PANEL (Alineación con XML de Lepton)
  if (panel.panelNumber === 1 && panel.strategy === 'horizontal') {
      score += 20000000;
  }
  if (panel.panelNumber === 2 && panel.strategy === 'vertical') {
      score += 50000000;
  }
  
  // 5. Penalizar "Columnas Finitas" en Vertical (Dificultad de corte)
  if (panel.strategy === 'vertical') {
     const narrowStrips = panel.parts.filter((p: any) => !p.isLeftover && p.width < 100).length;
     score -= (narrowStrips * 500000);
  }
  
  return score;
}
