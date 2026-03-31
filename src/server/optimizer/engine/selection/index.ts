import { InternalPart, FreeRect, EngineConfig, EngineState } from '../types/engine';
import { scoreWithLookahead, DOWNGRADED_HARD_BLOCK_PENALTY } from '../scoring';
import { evaluateRemnantQuality } from '../scoring/remnantQuality';

function getPlacementKey(p: InternalPart, r: FreeRect, state: EngineState): string {
  return `${p.width}x${p.height}@${r.width}x${r.height}`;
}

export function selectBestPiece(
  pieces: InternalPart[],
  rect: FreeRect,
  config: EngineConfig,
  state: EngineState,
  panelNumber: number
): { piece: InternalPart; rotated: boolean } | null {
  let bestPiece: InternalPart | null = null;
  let bestRotated = false;
  let bestScore = -Infinity;
  let winnerRescued = false;

  const candidates: any[] = [];
  const discards: any[] = [];
  
  let validCandidateCount = 0;
  let blockedCount = 0;
  let downgradedCount = 0;

  const rectSnapshot = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };

  // --- INFRAESTRUCTURA DE HEURÍSTICA ADAPTATIVA ---
  const activePool = pieces.filter(p => !p.placed);
  const remainingPiecesCount = activePool.length;
  const remainingPoolArea = activePool.reduce((acc, p) => acc + (p.width * p.height), 0);
  
  // Calcular Top-K Dimensiones Relevantes (Peso = count * sqrt(area))
  const dimWeights = new Map<number, { count: number, area: number, weight: number }>();
  activePool.forEach(p => {
    [p.width, p.height].forEach(d => {
      if (d < (config.minReusableDim || 60)) return;
      const stats = dimWeights.get(d) || { count: 0, area: p.width * p.height, weight: 0 };
      stats.count++;
      stats.area = Math.max(stats.area, p.width * p.height); // Area representativa
      stats.weight += Math.sqrt(p.width * p.height);
      dimWeights.set(d, stats);
    });
  });

  const topKPoolDims = Array.from(dimWeights.entries())
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 5)
    .map(([value, stats]) => ({
      value,
      count: stats.count,
      totalArea: stats.area * stats.count, // Estimado
      weight: stats.weight
    }));

  // Determinar Madurez de la Banda (Fila actual rect.y)
  const partsInSameRow = state.placedParts?.filter(p => Math.abs((p as any).y - rect.y) < 0.5) || [];
  const occupiedWidth = partsInSameRow.reduce((acc, p) => acc + p.width + config.kerf, 0);
  const rowCount = partsInSameRow.length;
  const bandMaturity = occupiedWidth / config.usableW;

  // Encontrar la pieza más grande que cabe REALMENTE en el rect actual (Competencia Real)
  const maxAreaFittingRow = activePool.reduce((max, p) => {
    const fitsDirect = (p.width <= rect.width + 0.5 && p.height <= rect.height + 0.5);
    const fitsRotated = !config.hasGrain || (p.grainDirection === 'libre') 
       ? (p.height <= rect.width + 0.5 && p.width <= rect.height + 0.5) 
       : false;
    return (fitsDirect || fitsRotated) ? Math.max(max, p.width * p.height) : max;
  }, 0);

  // --- INFRAESTRUCTURA DE HEURÍSTICA ADAPTATIVA (v44.2 Balanced) ---
  const guidingDim = config.strategy === 'horizontal' ? rect.height : rect.width;

  // Encontrar la MEJOR alternativa real que cabe en este rect (Prioridad Industrial)
  let topAlternativeCandidate: any = null;

  for (const p of activePool) {
    const pArea = p.width * p.height;
    const canRotate = !config.hasGrain || (p.grainDirection === 'libre');
    
    const orientations = [
      { w: p.width, h: p.height, rotated: false },
      ...(canRotate ? [{ w: p.height, h: p.width, rotated: true }] : [])
    ];

    for (const opt of orientations) {
      if (opt.w <= rect.width + 0.5 && opt.h <= rect.height + 0.5) {
        const pGuidingDim = config.strategy === 'horizontal' ? opt.h : opt.w;
        const bandDelta = Math.abs(pGuidingDim - guidingDim);
        const hasBandMatch = bandDelta <= 2.0; // Tolerancia Industrial ±2mm
        const fillRatio = (pGuidingDim + config.kerf) / guidingDim;

        const candidate = {
          id: p.id,
          name: p.name,
          area: pArea,
          width: opt.w,
          height: opt.h,
          rotated: opt.rotated,
          bandDelta,
          hasBandMatch,
          fillRatio,
          priorityScore: 0
        };

        // Prioridad 1: Mejor Band Match
        if (hasBandMatch) candidate.priorityScore += 1000;
        // Prioridad 2: Mejor Cierre Local (Fill Ratio)
        candidate.priorityScore += (fillRatio * 100);
        // Prioridad 3: Área
        candidate.priorityScore += (pArea / 10000);

        if (!topAlternativeCandidate || candidate.priorityScore > topAlternativeCandidate.priorityScore) {
          topAlternativeCandidate = candidate;
        }
      }
    }
  }

  // --- INFRAESTRUCTURA DE SIMULACIÓN ESTRUCTURAL ADAPTATIVA (v44.7) ---
  const totalPanelArea = config.panelWidth * config.panelHeight;
  const currentPanelOccupiedArea = (state.placedParts || []).reduce((acc, p) => acc + (p.width * p.height), 0);
  const currentPanelEfficiency = currentPanelOccupiedArea / (totalPanelArea || 1);
  
  // 1. Filtrar y Priorizar Espacios Relevantes (Adaptive Top-N)
  const allFreeRects = [...(state.freeRects || [])].sort((a, b) => (b.width * b.height) - (a.width * a.height));
  const maxRectArea = allFreeRects.length > 0 ? (allFreeRects[0].width * allFreeRects[0].height) : 0;
  const relevanceThreshold = Math.max(2500, maxRectArea * 0.05); // Adaptativo: 5% del mayor o 2500mm2
  
  const relevantRects = allFreeRects.filter(r => (r.width * r.height) >= relevanceThreshold || (r.width >= 60 && r.height >= 60));
  const simulatedRectsLimit = Math.max(5, Math.min(15, relevantRects.length));
  const rectsToSimulate = relevantRects.slice(0, simulatedRectsLimit);

  // 2. Greedy Structural Fit (v44.7 prioritized simulation)
  let conservativeArea = 0;
  let dominantUsableBandCount = 0;
  let simulatedPiecesCount = 0;
  const fitReasonDist: Record<string, number> = { band_match: 0, high_fill: 0, area_fallback: 0 };
  
  const simulatedPool = activePool.map(p => ({ ...p })); // Copia liviana
  const maxAreaInPool = activePool.length > 0 ? Math.max(...activePool.map(p => p.width * p.height)) : 1;

  for (const r of rectsToSimulate) {
    let bestSimPieceIdx = -1;
    let bestSimScore = -1;
    let bestSimReason: 'band_match' | 'high_fill' | 'area_fallback' = 'area_fallback';

    for (let i = 0; i < simulatedPool.length; i++) {
      const p = simulatedPool[i];
      if (p.placed) continue;

      const canRot = !config.hasGrain || (p.grainDirection === 'libre');
      const orientations = [{ w: p.width, h: p.height }, ...(canRot ? [{ w: p.height, h: p.width }] : [])];
      
      for (const opt of orientations) {
        if (opt.w <= r.width + 0.5 && opt.h <= r.height + 0.5) {
          const pGuiding = config.strategy === 'horizontal' ? opt.h : opt.w;
          const rGuiding = config.strategy === 'horizontal' ? r.height : r.width;
          
          const bandMatch = Math.abs(pGuiding - rGuiding) <= 2.0; // Tolerancia industrial ±2mm
          const fillRatio = (pGuiding + config.kerf) / rGuiding;
          
          // Puntaje continuo adaptativo para la simulación
          let simScore = 0;
          let reason: 'band_match' | 'high_fill' | 'area_fallback' = 'area_fallback';
          
          if (bandMatch) {
            simScore += 10000;
            reason = 'band_match';
          }
          if (fillRatio > 0.85) {
            simScore += (fillRatio * 5000);
            reason = reason === 'band_match' ? 'band_match' : 'high_fill';
          } else {
            simScore += (fillRatio * 1000);
          }
          simScore += ((p.width * p.height) / maxAreaInPool) * 500;

          if (simScore > bestSimScore) {
            bestSimScore = simScore;
            bestSimPieceIdx = i;
            bestSimReason = reason;
          }
        }
      }
    }

    if (bestSimPieceIdx !== -1) {
      const p = simulatedPool[bestSimPieceIdx];
      conservativeArea += (p.width * p.height);
      simulatedPiecesCount++;
      fitReasonDist[bestSimReason]++;
      if (bestSimReason === 'band_match') dominantUsableBandCount++;
      simulatedPool[bestSimPieceIdx].placed = true; // "Usada" en la simulación
    }
  }

  // 3. Calcular Opportunity Score (Adaptativo y Consolidado)
  const healthTargetArea = (totalPanelArea * 0.92) - currentPanelOccupiedArea;
  const currentPanelOpportunityScore = healthTargetArea > 0 
    ? Math.min(1.0, (conservativeArea / healthTargetArea) * (dominantUsableBandCount > 0 ? 1.0 : 0.8))
    : 1.0;

  const poolContext: any = {
    topKPoolDims,
    remainingPiecesCount,
    remainingPoolArea,
    panelWidth: config.panelWidth,
    panelHeight: config.panelHeight,
    bandMaturity,
    rowCountInBand: rowCount,
    maxAreaFittingRow,
    topAlternativeCandidate,
    currentPanelEfficiency,
    currentPanelOpportunityScore,
    compatibleAreaForCurrentPanelConservative: conservativeArea,
    simulatedRectsUsed: rectsToSimulate.length,
    simulatedRectsLimit,
    simulatedPiecesCount,
    dominantUsableBandCount,
    structuralFitReasonDistribution: fitReasonDist,
    opportunitySimulationMode: "greedy_structural_fit"
  };

  // --- v44.8: CÁLCULO DE CONFIANZA NORMALIZADO (INDUSTRIAL) ---
  if (config.features.enableV44BalancedMode) {
    const totalArea = config.panelWidth * config.panelHeight;
    
    // S1: Oportunidad Inversa (40%)
    const s1 = 1.0 - currentPanelOpportunityScore;
    
    // S2: Agotamiento Estructural Gradual (20%)
    const s2 = Math.max(0, 1.0 - (dominantUsableBandCount / 2.0));
    
    // S3: Agotamiento de Área del Pool (20%)
    const s3 = Math.max(0, 1.0 - (remainingPoolArea / totalArea));
    
    // S4: Agotamiento de Piezas Auxiliar (10%)
    const s4 = Math.max(0, 1.0 - (remainingPiecesCount / 15.0));
    
    // S5: Madurez del Panel (10%)
    const s5 = Math.min(1.0, currentPanelEfficiency);

    const confidence = (s1 * 0.4) + (s2 * 0.2) + (s3 * 0.2) + (s4 * 0.1) + (s5 * 0.1);
    poolContext.lastPanelConfidence = Math.max(0, Math.min(1, confidence));
    
    if (poolContext.lastPanelConfidence < 0.4) {
      poolContext.modeTransitionState = "fill";
    } else if (poolContext.lastPanelConfidence <= 0.7) {
      poolContext.modeTransitionState = "hybrid";
    } else {
      poolContext.modeTransitionState = "remanent";
    }

    poolContext.confidenceComponentsRaw = { s1, s2, s3, s4, s5 };
    poolContext.confidenceComponentsNormalized = {
      s1: s1 * 0.4,
      s2: s2 * 0.2,
      s3: s3 * 0.2,
      s4: s4 * 0.1,
      s5: s5 * 0.1
    };

    // --- v44.8.1-final: DETECCIÓN ROBUSTA DE PANEL TERMINAL ---
    const inventoryClosing = (remainingPoolArea < totalArea * 1.15) || (remainingPiecesCount <= 8);
    const geometricClosing = (dominantUsableBandCount <= 1) && (simulatedPiecesCount <= 3);
    const largeSpaceMissing = maxRectArea < (totalArea * 0.15);
    
    // Convergencia de señales
    const closingSignals = [inventoryClosing, geometricClosing, largeSpaceMissing].filter(Boolean).length;
    poolContext.isLikelyLastPanel = closingSignals >= 2;
    poolContext.lastPanelModeReason = poolContext.isLikelyLastPanel ? "geometric_inventory_convergence" : "active_production";
    poolContext.usefulFreeRectCount = relevantRects.length;
    poolContext.largestUsefulRectArea = maxRectArea;
    poolContext.reasonableFitCandidateCount = simulatedPiecesCount;
    poolContext.dominantUsableBandCount = dominantUsableBandCount;
  }
  // ------------------------------------------------

  const tryPiece = (piece: InternalPart, w: number, h: number, rotated: boolean) => {
    const pieceLabel = `${piece.name} (${w}x${h})`;
    const pieceArea = w * h;
    
    // Tolerancia industrial
    if (w <= rect.width + 1.5 && h <= rect.height + 1.5) {
      const isP1InTry = config.panelNumber === 1;
      const key = getPlacementKey(piece, rect, state);

      if (config.features.useInvalidCache && state.invalidCache?.has(key) && !isP1InTry) {
        discards.push({ piece: pieceLabel, reason: 'invalid_cache', blockReasonCode: 'invalid_cache' });
        return;
      }

      (state as any)._currentMetadata = {};
      const baseScore = scoreWithLookahead(w, h, rect, config, state, poolContext);
      const adaptiveMetadata = { ...(state as any)._currentMetadata || {} };

      if (config.features.useInvalidCache && state.invalidCache && baseScore < -1000000 && !isP1InTry) {
        state.invalidCache.add(key);
        discards.push({ piece: pieceLabel, reason: 'invalidated_by_score_threshold', blockReasonCode: 'invalidated_by_score_threshold' });
        return;
      }

      // FASE 2: Evaluación de Calidad de Remanente (HBC)
      const remEval = evaluateRemnantQuality(w, h, rect, config);
      let pieceScore = baseScore + remEval.score;
      let rescuedByHbc = false;
      let downgradeReasons: string[] = [];
      let primaryDowngradeGate: string | null = null;
      const areaRatioStrict = state.remainingArea > 0 ? (pieceArea / state.remainingArea) : 0;

      if (remEval.blocked) {
        // Lógica de Hard Block Condicional (HBC) Recalibrada
        const orphanRisk = state.poolSize < 8;
        const isDominantDim = w > rect.width * 0.7 || h > rect.height * 0.7;
        const criticalArea = areaRatioStrict >= 0.20 || (isDominantDim && areaRatioStrict >= 0.08);
        const consolidationNeedRescuable = state.isConsolidationMode && areaRatioStrict >= 0.08;

        // lastOfType con prioridad name+size y fallback size_only
        const sameNameSize = pieces.filter(p => !p.placed && p.name === piece.name && p.width === piece.width && p.height === piece.height);
        const sameSizeOnly = pieces.filter(p => !p.placed && p.width === piece.width && p.height === piece.height);
        
        let lastOfType = false;
        let lastOfTypeMode = "";
        let lastOfTypeStrength: "strong" | "medium" | "weak" | null = null;

        if (sameNameSize.length === 1) {
          lastOfType = true;
          lastOfTypeMode = "name+size";
        } else if (sameSizeOnly.length === 1) {
          lastOfType = true;
          lastOfTypeMode = "size_only";
        }

        if (lastOfType) {
          if (areaRatioStrict >= 0.03) lastOfTypeStrength = "strong";
          else if (isDominantDim) lastOfTypeStrength = "medium";
          else lastOfTypeStrength = "weak";
        }

        // Determinar si el downgrade está permitido por jerarquía (v44.7.4 experimental - Agresivo)
        const isP1 = config.panelNumber === 1;
        const currentPanelOpportunity = poolContext.currentPanelOpportunityScore || 0;
        
        // v44.8.1-final: Redefinición semántica de Agotamiento (No solo oportunidad, sino falta de rects útiles)
        const exhaustionByOpportunity = currentPanelOpportunity < 0.12;
        const exhaustionByGeometry = (poolContext.usefulFreeRectCount || 0) < 3 && (poolContext.largestUsefulRectArea || 0) < (totalPanelArea * 0.05);
        const currentPanelExhausted = exhaustionByOpportunity || ( exhaustionByGeometry && poolContext.lastPanelConfidence > 0.3);
        const currentPanelExhaustedReason = exhaustionByOpportunity ? "low_opportunity_simulation" : (exhaustionByGeometry ? "geometry_starvation" : "none");
        const fitsCurrentPanelReasonably = (w <= rect.width + 0.5 && h <= rect.height + 0.5);
        // En v44.7.4 quitamos la condición de !exhausted: si cabe en P1, se queda en P1.
        const deferredFitToNextPanelRisk = isP1 && fitsCurrentPanelReasonably;

        if (deferredFitToNextPanelRisk) {
          primaryDowngradeGate = "primary_panel_dominance";
          downgradeReasons.push("primary_panel_dominance");
        } else if (orphanRisk) {
          primaryDowngradeGate = "orphan_risk";
        } else if (lastOfType) {
          // Un last_of_type "weak" solo rescata si el pool es pequeño (<=12)
          if (lastOfTypeStrength !== "weak" || state.poolSize <= 12) {
            primaryDowngradeGate = "last_of_type";
          }
        } else if (consolidationNeedRescuable) {
          primaryDowngradeGate = "consolidation_plus_area";
        } else if (criticalArea) {
          primaryDowngradeGate = "critical_area";
        }

        if (primaryDowngradeGate) {
          const finalScoreAfterPenalty = baseScore - DOWNGRADED_HARD_BLOCK_PENALTY;
          
          // Blindaje: No rescatar si el score es negativo, a menos que sea:
          // 1. Riesgo de huérfano (poolSize < 8)
          // 2. last_of_type con peso industrial (poolSize <= 12 o areaRatioStrict >= 0.03)
          // 3. Dominancia del Panel 1 (v44.7.4 experimental: Rescate Incondicional para P1)
          let isCriticalRescue = primaryDowngradeGate === "orphan_risk" || primaryDowngradeGate === "primary_panel_dominance";
          
          if (primaryDowngradeGate === "last_of_type") {
             if (state.poolSize <= 12 || areaRatioStrict >= 0.03) {
               isCriticalRescue = true;
             }
          }
          
          // v44.7.4: Si es P1, aceptamos incluso score negativo profundo para forzar la pieza
          if (finalScoreAfterPenalty >= 0 || isCriticalRescue || isP1) {
            rescuedByHbc = true;
            downgradedCount++;
            pieceScore = isP1 && finalScoreAfterPenalty < 0 ? 0 : finalScoreAfterPenalty;
            
            if (orphanRisk) downgradeReasons.push("orphan_risk");
            if (lastOfType) downgradeReasons.push("last_of_type");
            if (consolidationNeedRescuable) downgradeReasons.push("consolidation_mode");
            if (criticalArea) downgradeReasons.push("critical_area");

            if (config.debug && state.debugEvents) {
              state.debugEvents.push({
                type: 'BLOCK_DOWNGRADED_FOR_CONSOLIDATION',
                stage: 'SELECTION',
                message: `HBC: Rescuing ${piece.name} via ${primaryDowngradeGate} (${lastOfTypeStrength || 'N/A'})`,
                seq: ++state.debugSeq!,
                panelNumber,
                rect: rectSnapshot,
                pieceId: piece.id,
                metadata: {
                  reason: remEval.reason,
                  remnant: remEval.details,
                  downgradeReasonCodes: downgradeReasons,
                  primaryDowngradeGate,
                  lastOfTypeStrength,
                  pieceArea,
                  rectWidth: rect.width,
                  rectHeight: rect.height,
                  finalScoreAfterPenalty: pieceScore,
                  penaltyApplied: DOWNGRADED_HARD_BLOCK_PENALTY,
                  lastOfTypeMode,
                  isDominantDim,
                  areaRatioStrict,
                  poolSize: state.poolSize,
                  // Auditoría v44.8.1 (Neutralización de Legados)
                  currentPanelExhausted,
                  currentPanelExhaustedReason,
                  fitsCurrentPanelReasonably,
                  deferredFitToNextPanelRisk,
                  panel1DominanceBonus: 0 // Removido bono hardcoded de 15M / 50M
                }
              });
            }
          }
        }

        if (!rescuedByHbc) {
          blockedCount++;
          if (config.debug && state.debugEvents) {
            state.debugEvents.push({
              type: 'PIECE_BLOCKED',
              stage: 'SELECTION',
              message: `Blocked ${piece.name} due to remnant quality (HBC filter failed)`,
              seq: ++state.debugSeq!,
              panelNumber,
              rect: rectSnapshot,
              pieceId: piece.id,
              metadata: {
                blockReasonCode: 'remnant_hard_block',
                reason: remEval.reason,
                remnant: remEval.details,
                pieceArea,
                rectWidth: rect.width,
                rectHeight: rect.height,
                areaRatioStrict,
                lastOfType,
                lastOfTypeStrength,
                poolSize: state.poolSize,
                consolidationMode: state.isConsolidationMode,
                // Auditoría v44.7.3 (Causa de transferencia potencial)
                fitsCurrentPanelReasonably,
                deferredFitToNextPanelRisk,
                currentPanelExhausted,
                currentPanelExhaustedReason,
                whyNotPlacedInCurrentPanel: "remnant_quality_hbc_block_without_rescue"
              }
            });
          }
          discards.push({ 
            piece: pieceLabel, 
            reason: remEval.reason, 
            blockReasonCode: 'remnant_hard_block',
            remnant: remEval.details 
          });
          return;
        }
      }

      validCandidateCount++;
      candidates.push({ 
        piece: pieceLabel, 
        pieceId: piece.id,
        baseScore, 
        remnantScore: rescuedByHbc ? -DOWNGRADED_HARD_BLOCK_PENALTY : remEval.score,
        finalScore: pieceScore,
        rescuedByHbc,
        remnant: remEval.details,
        metadata: adaptiveMetadata
      });

      if (pieceScore > bestScore) {
        bestScore = pieceScore;
        bestPiece = piece;
        bestRotated = rotated;
        winnerRescued = rescuedByHbc;
      }
    } else {
      discards.push({ piece: pieceLabel, reason: 'fits_no', blockReasonCode: 'fits_no' });
    }
  };

  const performSelectionPass = (isLastReasonablePass: boolean = false) => {
    poolContext.lastReasonablePassActive = isLastReasonablePass;

    for (const piece of pieces) {
      if (piece.placed) continue;
      const canRot = !config.hasGrain || (piece.grainDirection === 'libre');
      tryPiece(piece, piece.width, piece.height, false);
      if (canRot) tryPiece(piece, piece.height, piece.width, true);
    }
  };

  // PASADA 1: Búsqueda Estándar
  performSelectionPass(false);

  // v44.8.1: LAST REASONABLE PASS (Pasada de Rescate)
  if (!bestPiece && config.features.enableV44BalancedMode) {
    const isExhausted = poolContext.lastPanelConfidence > 0.85;
    const hasViability = poolContext.currentPanelOpportunityScore > 0.05;
    
    if (!isExhausted && hasViability) {
      poolContext.lastReasonablePassTriggered = true;
      
      // Instrumentación pré-LRP
      poolContext.lastReasonablePassCandidateBeforeAssistance = null;
      
      performSelectionPass(true);

      // Auditoría post-pasada
      if (bestPiece) {
        poolContext.lastReasonablePassFoundCandidate = true;
        poolContext.lastReasonablePassImpactApplied = true;
      } else {
        poolContext.lastReasonablePassFoundCandidate = false;
        poolContext.lastReasonablePassRejectedReason = "no_valid_fit_even_with_assistance";
      }
    } else {
      poolContext.lastReasonablePassSkippedReason = isExhausted ? "exhausted" : "no_viability";
    }
  }

  // Persistir traza si debug está activo
  if (config.debug && state.debugEvents) {
    const winnerPiece = bestPiece as InternalPart | null;
    let selectionReason = "best_score";
    if (winnerRescued) {
      selectionReason = "rescued_by_hbc";
    } else if (validCandidateCount === 1) {
      selectionReason = "only_viable";
    }

    state.debugEvents.push({
      type: 'PIECE_SELECT',
      stage: 'SELECTION',
      message: winnerPiece ? `Selected ${winnerPiece.name}` : 'No piece selected',
      seq: ++state.debugSeq!,
      panelNumber,
      rect: rectSnapshot,
      pieceId: winnerPiece?.id,
      candidates,
      discards,
      metadata: {
        selectionReason,
        validCandidateCount,
        discardCount: discards.length,
        blockedCount,
        downgradedCount,
        // Metadatos de Heurística Adaptativa (del ganador si existe)
        ...(winnerPiece && candidates.find(c => c.pieceId === winnerPiece.id)?.metadata || {}),
        // v44.8 Traceability
        lastPanelConfidence: poolContext.lastPanelConfidence,
        modeTransitionState: poolContext.modeTransitionState,
        confidenceComponentsRaw: poolContext.confidenceComponentsRaw,
        confidenceComponentsNormalized: poolContext.confidenceComponentsNormalized,
        lastReasonablePassTriggered: poolContext.lastReasonablePassTriggered,
        lastReasonablePassSkippedReason: poolContext.lastReasonablePassSkippedReason,
        blendingCurveType: "quadratic_bias_fill"
      },
      winner: winnerPiece ? { 
        name: winnerPiece.name, 
        score: bestScore, 
        rotated: bestRotated 
      } : null,
      motive: !winnerPiece ? 'No pieces fit or all were blocked by remnant quality' : undefined
    });
  }

  if (!bestPiece) return null;
  return { piece: bestPiece, rotated: bestRotated };
}
