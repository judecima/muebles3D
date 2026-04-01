import { InternalPart, FreeRect, EngineConfig, EngineState } from '../types/engine';
import { scoreWithLookahead, DOWNGRADED_HARD_BLOCK_PENALTY } from '../scoring';
import { evaluateRemnantQuality } from '../scoring/remnantQuality';
import { GuillotineStrategy } from '../space/guillotine';

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
  let p1AggressionBonusFlippedWinner = false;
  let pairClosureApplied = false;
  let pairClosureChangedWinner = false;
  let pairClosurePairsEvaluated = 0;
  let pairClosureBestRatio = 0;
  let nearPerfectPairClosureFound = false;

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
  // --- v44.9.1: Fill Opportunity Score (soft global pressure helper) ---
  const fillOpportunity = Math.min(1, poolContext.remainingPoolArea / (rect.width * rect.height + 1));
  const closurePressureWeight = 0.08; // soft weight
  // expose to context for later use
  poolContext.fillOpportunity = fillOpportunity;
  poolContext.closurePressureWeight = closurePressureWeight;

  // --- v44.8: CÁLCULO DE CONFIANZA NORMALIZADO (INDUSTRIAL) ---
  if (config.features.enableV44BalancedMode) {
    const totalArea = config.panelWidth * config.panelHeight;
    const s1 = 1.0 - currentPanelOpportunityScore;
    const s2 = Math.max(0, 1.0 - (dominantUsableBandCount / 2.0));
    const s3 = Math.max(0, 1.0 - (remainingPoolArea / totalArea));
    const s4 = Math.max(0, 1.0 - (remainingPiecesCount / 15.0));
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
      s1: s1 * 0.4, s2: s2 * 0.2, s3: s3 * 0.2, s4: s4 * 0.1, s5: s5 * 0.1
    };

    // --- v44.8.1-final: DETECCIÓN ROBUSTA DE PANEL TERMINAL ---
    const remainingUsableArea = totalArea - currentPanelOccupiedArea;
    const poolFitsInCurrent = remainingPoolArea < (remainingUsableArea * 1.2);
    const inventoryClosing = (remainingPoolArea < totalArea * 0.4) || (remainingPiecesCount <= 8);
    const geometricClosing = (dominantUsableBandCount <= 1) && (simulatedPiecesCount <= 3);
    const largeSpaceMissing = maxRectArea < (totalArea * 0.15);
    
    // Convergencia de señales: Debe ser FIN de inventario Y señales geométricas
    const closingSignals = [inventoryClosing, geometricClosing, largeSpaceMissing, poolFitsInCurrent].filter(Boolean).length;
    const isLikelyLastPanel = closingSignals >= 3;
    poolContext.isLikelyLastPanel = isLikelyLastPanel;
    poolContext.lastPanelModeReason = isLikelyLastPanel ? "geometric_inventory_convergence" : "active_production";
    poolContext.usefulFreeRectCount = relevantRects.length;
    poolContext.largestUsefulRectArea = maxRectArea;
    poolContext.reasonableFitCandidateCount = simulatedPiecesCount;
    poolContext.dominantUsableBandCount = dominantUsableBandCount;

    // --- v44.9.2: Closure‑Critical Zone detection ---
    const rectArea = rect.width * rect.height;
    const areaRatio = Math.min(1, rectArea / (poolContext.remainingPoolArea + 1));
    const notLast = poolContext.isLikelyLastPanel ? 0 : 1;
    
    // Scoring based on standard pool context metrics
    const closureCriticalScore =
      0.25 * areaRatio +
      0.20 * Math.min(1, (poolContext.reasonableFitCandidateCount / 4)) +
      0.15 * Math.min(1, (poolContext.dominantUsableBandCount / 2)) + 
      0.15 * Math.min(1, (poolContext.usefulFreeRectCount / 5)) +
      0.15 * (1 - poolContext.fillOpportunity) +
      0.10 * notLast;

    poolContext.closureCriticalScore = closureCriticalScore;
    poolContext.closureCriticalZone = closureCriticalScore >= 0.40;
  }

  const tryPiece = (piece: InternalPart, w: number, h: number, rotated: boolean) => {
    const pieceLabel = `${piece.name} (${w}x${h})`;
    const pieceArea = w * h;
    if (w <= rect.width + 1.5 && h <= rect.height + 1.5) {
      const isP1InTry = config.panelNumber === 1;
      const key = getPlacementKey(piece, rect, state);
      if (config.features.useInvalidCache && state.invalidCache?.has(key) && !isP1InTry) return;

      (state as any)._currentMetadata = {};
      const baseScore = scoreWithLookahead(w, h, rect, config, state, poolContext);
      const adaptiveMetadata = { ...(state as any)._currentMetadata || {} };

      const remEval = evaluateRemnantQuality(w, h, rect, config);
      let pieceScore = baseScore + remEval.score;
      let rescuedByHbc = false;
      const areaRatioStrict = state.remainingArea > 0 ? (pieceArea / state.remainingArea) : 0;

      if (remEval.blocked) {
        const orphanRisk = state.poolSize < 8;
        const isDominantDim = w > rect.width * 0.7 || h > rect.height * 0.7;
        const criticalArea = areaRatioStrict >= 0.20 || (isDominantDim && areaRatioStrict >= 0.08);
        const consolidationNeedRescuable = state.isConsolidationMode && areaRatioStrict >= 0.08;
        const sameNameSize = pieces.filter(p => !p.placed && p.name === piece.name && p.width === piece.width && p.height === piece.height);
        const sameSizeOnly = pieces.filter(p => !p.placed && p.width === piece.width && p.height === piece.height);
        let lastOfType = (sameNameSize.length === 1) || (sameSizeOnly.length === 1);
        let primaryDowngradeGate = null;
        const isP1 = config.panelNumber === 1;
        const fitsReasonably = (w <= rect.width + 0.5 && h <= rect.height + 0.5);

        if (isP1 && fitsReasonably) primaryDowngradeGate = "primary_panel_dominance";
        else if (orphanRisk) primaryDowngradeGate = "orphan_risk";
        else if (lastOfType) primaryDowngradeGate = "last_of_type";
        else if (consolidationNeedRescuable) primaryDowngradeGate = "consolidation_mode";
        else if (criticalArea) primaryDowngradeGate = "critical_area";

        if (primaryDowngradeGate) {
          const finalScoreAfterPenalty = baseScore - DOWNGRADED_HARD_BLOCK_PENALTY;
          if (finalScoreAfterPenalty >= 0 || primaryDowngradeGate === "primary_panel_dominance" || isP1) {
            rescuedByHbc = true;
            pieceScore = isP1 && finalScoreAfterPenalty < 0 ? 0 : finalScoreAfterPenalty;
            downgradedCount++;
          }
        }
        if (!rescuedByHbc) {
          blockedCount++;
          discards.push({ piece: pieceLabel, reason: remEval.reason, blockReasonCode: 'remnant_hard_block' });
          return;
        }
      }

      validCandidateCount++;
      candidates.push({ piece: pieceLabel, pieceId: piece.id, w, h, rotated, baseScore, finalScore: pieceScore, rescuedByHbc, metadata: adaptiveMetadata });
      if (pieceScore > bestScore) {
        bestScore = pieceScore; bestPiece = piece; bestRotated = rotated; winnerRescued = rescuedByHbc;
      }
    } else {
      discards.push({ piece: pieceLabel, reason: 'fits_no', blockReasonCode: 'fits_no' });
    }
  };

  const performSelectionPass = (isLastPass: boolean = false) => {
    poolContext.lastReasonablePassActive = isLastPass;
    for (const piece of pieces) {
      if (piece.placed) continue;
      const canRot = !config.hasGrain || (piece.grainDirection === 'libre');
      tryPiece(piece, piece.width, piece.height, false);
      if (canRot) tryPiece(piece, piece.height, piece.width, true);
    }
  };

  performSelectionPass(false);
  if (!bestPiece && config.features.enableV44BalancedMode) {
    if (poolContext.lastPanelConfidence <= 0.85 && poolContext.currentPanelOpportunityScore > 0.05) {
      poolContext.lastReasonablePassTriggered = true;
      performSelectionPass(true);
    }
  }

  // --- v44.9.2: FORCED CONSUMPTION ORDERING (Targeted Pool Reduction) ---
  let forcedConsumptionOrderingApplied = false;
  
  // Suppression only if pool is truly trivial (e.g. < 0.2m2) to preserve final remnant quality
  // If we have significant pool, we must force consumption even if we think it's the last panel
  // to avoid accidentally opening an extra panel.
  const poolIsTrivial = poolContext.remainingPoolArea < 200000;
  let forcedConsumptionSuppressedForLastPanel = poolContext.isLikelyLastPanel && poolIsTrivial;
  
  let topCandidatesForLookahead = [...candidates];

  if (config.features.enableForcedConsumptionZone && poolContext.closureCriticalZone && !forcedConsumptionSuppressedForLastPanel && candidates.length > 1) {
    const MIN_BAND = Math.max(30, config.kerf * 2);
    const rectArea = rect.width * rect.height;

    candidates.forEach(cat => {
      const remainingWidth = rect.width - cat.w;
      const remainingHeight = rect.height - cat.h;
      const dominantReductionRatio = Math.max(remainingWidth / rect.width, remainingHeight / rect.height);
      const leftoverRatio = (remainingWidth * remainingHeight) / rectArea;
      const microBandPenalty = (remainingWidth < MIN_BAND && remainingHeight < MIN_BAND) ? 1 : 0;
      
      const closureScore = 
        0.35 * ((cat.w * cat.h) / rectArea) +
        0.25 * (1 - dominantReductionRatio) +
        0.25 * (1 - leftoverRatio) -
        0.15 * microBandPenalty;
      
      cat.closureScore = closureScore;
      cat.metadata = { ...(cat.metadata || {}), closureConsumptionScore: closureScore };
    });

    candidates.sort((a, b) => (b.closureScore || 0) - (a.closureScore || 0));
    forcedConsumptionOrderingApplied = true;

    const CLOSURE_TOP_N = 6;
    topCandidatesForLookahead = candidates.slice(0, CLOSURE_TOP_N);
    
    // Assign rank metadata
    topCandidatesForLookahead.forEach((cat, idx) => {
       cat.metadata = { ...(cat.metadata || {}), closureConsumptionRank: idx };
    });
  }

  // --- v44.9.3: PRIMARY PANEL AGGRESSION (Asymmetric P1 Optimization) ---
  const panelEfficiency = poolContext.currentPanelEfficiency;
  const hasGeometricOpportunity = poolContext.closureCriticalZone || poolContext.reasonableFitCandidateCount > 0;
  
  const primaryPanelAggressionActive = 
    config.features.enablePrimaryPanelAggression &&
    panelNumber === 1 &&
    panelEfficiency < 0.85 &&
    !poolContext.isLikelyLastPanel &&
    hasGeometricOpportunity;
  
  const primaryPanelAggressionBonusValue = primaryPanelAggressionActive ? 20_000_000 : 0;
  
  const primaryAggressionExpandedLookaheadActive =
    primaryPanelAggressionActive;
  
  const aggressionReason = primaryPanelAggressionActive 
    ? `P1 early stage (Eff: ${(panelEfficiency * 100).toFixed(1)}%) with geometric opportunity`
    : (panelNumber === 1 && panelEfficiency >= 0.85 ? 'P1 reached efficiency threshold' : 'Not P1 or likely last panel');

  let lookaheadWinnerChange = false;
  let originalWinnerId = (bestPiece as any)?.id;
  const lookaheadCandidateCount = primaryAggressionExpandedLookaheadActive ? 6 : 3;
  if (config.features.enableDepth1Lookahead && topCandidatesForLookahead.length > 1 && !poolContext.isLikelyLastPanel) {
    const topCandidates = topCandidatesForLookahead.sort((a, b) => b.finalScore - a.finalScore).slice(0, lookaheadCandidateCount);
    const spaceManager = new GuillotineStrategy();
    for (const cat of topCandidates) {
      const currentPiece = pieces.find(p => p.id === cat.pieceId)!;
      currentPiece.placed = true;
      const split = spaceManager.split(rect, cat.w, cat.h, config, state);
      let nextBest = 0;
      const nextPool = pieces.filter(p => !p.placed).slice(0, 15);
      for (const nextRect of split.rects) {
        for (const nextPiece of nextPool) {
          const orientations = [{ w: nextPiece.width, h: nextPiece.height }, ...(!config.hasGrain || nextPiece.grainDirection === 'libre' ? [{ w: nextPiece.height, h: nextPiece.width }] : [])];
          for (const opt of orientations) {
            if (opt.w <= nextRect.width + 1.5 && opt.h <= nextRect.height + 1.5) {
              nextBest = Math.max(nextBest, scoreWithLookahead(opt.w, opt.h, nextRect, config, state, poolContext));
            }
          }
        }
      }
      currentPiece.placed = false;
      // --- v44.9.1: Adjust lookahead bonus with soft global risk penalty (25% reduction) ---
      const wouldOpenNewPanel = !poolContext.isLikelyLastPanel &&
        ((rect.width * rect.height - cat.w * cat.h) / (poolContext.remainingPoolArea + 1)) > 0.5;
      
      // v44.9.3: Aggression reduces global risk penalty by 50% (Revision 2c)
      const riskReductionFactor = primaryPanelAggressionActive ? 0.50 : 1.0;
      const globalRiskPenalty = (wouldOpenNewPanel ? cat.lookaheadBonus * 0.25 : 0) * riskReductionFactor;
      cat.lookaheadBonus -= globalRiskPenalty;
      
      // Attach metadata for risk penalty
      cat.metadata = {
        ...(cat.metadata || {}),
        lookaheadGlobalRiskPenalty: globalRiskPenalty,
        lookaheadWouldIncreasePanelRisk: wouldOpenNewPanel,
        lookaheadGlobalRiskReductionFactor: riskReductionFactor
      };
      
      // Apply adjusted lookahead bonus
      cat.finalScore += cat.lookaheadBonus;

      // --- v44.9.2: Geometric-Consistency Refined Leftover Penalty ---
      const remainingWidth = rect.width - cat.w;
      const remainingHeight = rect.height - cat.h;
      const leftoverRatio = (remainingWidth * remainingHeight) / (rect.width * rect.height);
      const leftoverAreaAbs = leftoverRatio * rect.width * rect.height;
      
      // Industrial threshold: 8% of current free space or roughly 1m2 (whichever more context-aware)
      const MIN_PREMIUM_LEFTOVER_RATIO = 0.08;
      const hasCompatiblePieces = activePool.some(p => p.width <= rect.width && p.height <= rect.height);
      
      if (!poolContext.isLikelyLastPanel && leftoverRatio > MIN_PREMIUM_LEFTOVER_RATIO && hasCompatiblePieces) {
        // v44.9.3: Aggression reduces premium penalty by 65% (Revision 2c)
        const penaltyReductionFactor = primaryPanelAggressionActive ? 0.35 : 1.0;
        const premiumPenalty = (Math.log10(leftoverAreaAbs || 1) * 0.1) * penaltyReductionFactor;
        
        cat.finalScore -= premiumPenalty;
        cat.metadata = {
          ...(cat.metadata || {}),
          nonFinalPremiumLeftoverPenalty: premiumPenalty,
          premiumLeftoverRatio: leftoverRatio,
          premiumLeftoverArea: leftoverAreaAbs,
          premiumLeftoverWouldForceNextPanel: leftoverAreaAbs > 2_000_000,
          premiumLeftoverPenaltyReason: 'large clean leftover on non‑final panel (ratio‑based)',
          premiumLeftoverPenaltyReductionFactor: penaltyReductionFactor
        };
      }

      // --- v44.9.1: Panel Closure Pressure (soft) ---
      const closurePressure = Math.min(1, (rect.width * rect.height) / (poolContext.remainingPoolArea + 1));
      const adjustedClosurePressure = closurePressure * poolContext.fillOpportunity;
      
      // v44.9.3: Aggression reduces closure pressure by 65% (Revision 2c)
      const pressureReductionFactor = primaryPanelAggressionActive ? 0.35 : 1.0;
      const pressureScore = (adjustedClosurePressure * poolContext.closurePressureWeight * cat.baseScore) * pressureReductionFactor;
      
      cat.finalScore -= pressureScore;
      
      // v44.9.3-rev2d: Apply Moderate P1 Aggression Bonus to flip winners against industrial beauty
      if (primaryPanelAggressionBonusValue > 0) {
        cat.finalScore += primaryPanelAggressionBonusValue;
      }
      
      cat.metadata = {
        ...(cat.metadata || {}),
        panelClosurePressureApplied: true,
        panelClosurePressureScore: adjustedClosurePressure,
        closurePressureReason: 'large residual area vs remaining pool',
        estimatedExtraPanelRisk: adjustedClosurePressure > 0.6,
        panelClosurePressureReductionFactor: pressureReductionFactor,
        primaryPanelAggressionBonusApplied: primaryPanelAggressionBonusValue > 0,
        primaryPanelAggressionBonusValue: primaryPanelAggressionBonusValue
      };
    }
    
    // Capture winner before pair closure for audit
    const prePairWinnerId = topCandidatesForLookahead.length > 0 
      ? [...topCandidatesForLookahead].sort((a, b) => b.finalScore - a.finalScore)[0].pieceId 
      : "";

    // v45.0 Phase 3: Structural Pair Closure (Depth 1.5)
    // Evaluate if any of the Top-4 primary candidates enables a near-perfect strip closure.
    if (config.features.enableStructuralPairClosure && primaryPanelAggressionActive && topCandidatesForLookahead.length > 1) {
      pairClosureApplied = true;
      const spaceManager = new GuillotineStrategy();
      const pcTopCandidates = [...topCandidatesForLookahead].sort((a, b) => b.finalScore - a.finalScore).slice(0, 4);
      
      for (const cat of pcTopCandidates) {
        const currentPiece = pieces.find(p => p.id === cat.pieceId)!;
        currentPiece.placed = true;
        const split = spaceManager.split(rect, cat.w, cat.h, config, state);
        
        let bestSecondaryArea = 0;
        const secondaryPool = pieces.filter(p => !p.placed).slice(0, 12);
        pairClosurePairsEvaluated++;

        for (const nextRect of split.rects) {
          // Only search in the resulting rects of the same "strip" decision
          for (const nextPiece of secondaryPool) {
             const orientations = [{ w: nextPiece.width, h: nextPiece.height }, ...(!config.hasGrain || nextPiece.grainDirection === 'libre' ? [{ w: nextPiece.height, h: nextPiece.width }] : [])];
             for (const opt of orientations) {
               if (opt.w <= nextRect.width + 0.5 && opt.h <= nextRect.height + 0.5) {
                 bestSecondaryArea = Math.max(bestSecondaryArea, opt.w * opt.h);
               }
             }
          }
        }
        currentPiece.placed = false;
        
        const rectArea = rect.width * rect.height;
        const combinedRatio = (cat.w * cat.h + bestSecondaryArea) / rectArea;
        pairClosureBestRatio = Math.max(pairClosureBestRatio, combinedRatio);

        let structuralBonus = 0;
        let isNearPerfect = false;
        if (combinedRatio >= 0.97) {
          isNearPerfect = true;
          nearPerfectPairClosureFound = true;
          structuralBonus = 85_000_000; // Beats 80M bandMatch
        } else if (combinedRatio >= 0.93) {
          structuralBonus = 40_000_000; // Strong push for high density
        }

        if (structuralBonus > 0) {
          cat.finalScore += structuralBonus;
          cat.metadata = { 
            ...(cat.metadata || {}), 
            pairClosureApplied: true, 
            pairClosureFillRatio: combinedRatio,
            nearPerfectPairClosure: isNearPerfect,
            pairClosureStructuralBonus: structuralBonus
          };
        }
      }
    }

    // v44.9.3-rev2e: Track if the bonus flipped the top candidate before lookahead
    let preBonusTopCandidateId = "";
    if (primaryPanelAggressionBonusValue > 0 && topCandidatesForLookahead.length > 0) {
      const copy = [...topCandidatesForLookahead].sort((a, b) => (b.finalScore - primaryPanelAggressionBonusValue) - (a.finalScore - primaryPanelAggressionBonusValue));
      preBonusTopCandidateId = copy[0].pieceId;
    }

    topCandidatesForLookahead.sort((a, b) => b.finalScore - a.finalScore);
    const top = topCandidatesForLookahead[0];
    pairClosureChangedWinner = prePairWinnerId !== "" && top.pieceId !== prePairWinnerId;
    const p1AggressionBonusFlippedWinner = preBonusTopCandidateId !== "" && top.pieceId !== preBonusTopCandidateId;

    if (top.pieceId !== originalWinnerId && top.finalScore > bestScore) {
      lookaheadWinnerChange = true;
      bestPiece = pieces.find(p => p.id === top.pieceId)!;
      bestRotated = top.rotated;
      bestScore = top.finalScore;
      winnerRescued = top.rescuedByHbc;
    }
    const winnerData = candidates.find(c => c.pieceId === bestPiece?.id);
    if (winnerData) winnerData.metadata = { ...winnerData.metadata, lookaheadApplied: true, lookaheadWinnerChange, lookaheadBonus: winnerData.lookaheadBonus || 0 };
  }

  if (config.debug && state.debugEvents) {
    const winnerPiece = bestPiece as InternalPart | null;
    let reason = lookaheadWinnerChange ? "lookahead_structural" : (winnerRescued ? "rescued_by_hbc" : "best_score");
    state.debugEvents.push({
      type: 'PIECE_SELECT', stage: 'SELECTION', message: winnerPiece ? `Selected ${winnerPiece.name}` : 'No piece selected', seq: ++state.debugSeq!, panelNumber, rect: rectSnapshot, pieceId: winnerPiece?.id, candidates, discards,
      metadata: { 
        selectionReason: reason, validCandidateCount, discardCount: discards.length, blockedCount, downgradedCount, 
        ...(winnerPiece && candidates.find(c => c.pieceId === winnerPiece.id)?.metadata || {}),
        lookaheadWinnerChange, 
        lastPanelConfidence: poolContext.lastPanelConfidence, 
        isLikelyLastPanel: poolContext.isLikelyLastPanel,
        closureCriticalZone: poolContext.closureCriticalZone,
        closureCriticalScore: poolContext.closureCriticalScore,
        forcedConsumptionOrderingApplied,
        forcedConsumptionSuppressedForLastPanel,
        lookaheadPoolReorderedByClosure: forcedConsumptionOrderingApplied,
        primaryPanelAggressionApplied: primaryPanelAggressionActive,
        primaryAggressionExpandedLookaheadApplied: primaryAggressionExpandedLookaheadActive,
        primaryPanelAggressionReason: aggressionReason,
        panelEfficiencyAtAggression: panelEfficiency,
        lookaheadCandidateCountUsed: lookaheadCandidateCount,
        primaryPanelAggressionBonusApplied: primaryPanelAggressionBonusValue > 0,
        primaryPanelAggressionBonusValue: primaryPanelAggressionBonusValue,
        p1AggressionBonusFlippedWinner: p1AggressionBonusFlippedWinner,
        pairClosureApplied,
        pairClosureChangedWinner,
        pairClosurePairsEvaluated,
        pairClosureBestRatio,
        nearPerfectPairClosureFound
      },
      winner: winnerPiece ? { name: winnerPiece.name, score: bestScore, rotated: bestRotated } : null
    });
  }

  if (!bestPiece) return null;
  return { piece: bestPiece, rotated: bestRotated };
}
