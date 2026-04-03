import { GrainDirection, OptimizedPanel, OptimizedPart } from '../../../../lib/types';
import { FreeRect, EngineConfig, EngineState, InternalPart, EngineDebugEvent } from '../types/engine';
import { stableSortParts, orderFreeRects } from '../utils';
import { selectBestPiece } from '../selection';
import { GuillotineStrategy } from '../space/guillotine';
import { evaluatePanelQuality } from '../scoring';
import { runGlobalOptimization } from './globalOptimizer';
import { StripGenerator } from './stripGenerator';
import { RipCutSelector } from './ripCutSelector';

export const engineMetadata = {
  version: 'v46.2.2-industrial',
  name: 'Antigravity Industrial Engine'
};

export function runOptimization(
  parts: any[],
  panelWidth: number,
  panelHeight: number,
  thickness: number,
  hasGrain: boolean,
  kerf: number = 4.5,
  trim: number = 10,
  features: any = {}
): any {
  const thick = thickness || 18;
  const usableW = panelWidth - trim;
  const usableH = panelHeight - trim;
  const totalArea = panelWidth * panelHeight;

  const pool: InternalPart[] = parts.flatMap(p => 
    Array.from({ length: p.quantity }, (_, i) => ({
      ...p,
      id: `${p.name}-${i}`,
      placed: false
    }))
  );

  const colors = generateColors(parts);
  
  // v44.9: Normalización de flags para soportar objetos de configuración
  const normalizedFeatures = (typeof features === 'boolean') 
    ? { enableV44BalancedMode: features } 
    : (features || {});

  const config = {
    kerf,
    trim,
    panelWidth,
    panelHeight,
    strategy: 'horizontal' as const,
    hasGrain,
    ...normalizedFeatures,
    features: normalizedFeatures // Para reuso en globalOptimizer
  };

  // v47.1: Cálculo de área total para conciencia de fase
  const totalRequiredArea = pool.reduce((acc, p) => acc + (p.width * p.height), 0);

  const { panels, debugEvents } = runGlobalOptimization(
    pool,
    panelWidth,
    panelHeight,
    { ...config, features: { ...config.features, totalRequiredArea } },
    colors
  );

  const usedAreaTotal = panels.reduce((acc: number, p: any) => acc + (p.efficiency / 100) * totalArea, 0);
  const totalAreaAllPanels = panels.length * panelWidth * panelHeight;
  const totalEff = totalAreaAllPanels > 0 ? (usedAreaTotal / totalAreaAllPanels) * 100 : 0;

  return { 
    optimizedLayout: panels, 
    totalPanels: panels.length, 
    totalEfficiency: totalEff, 
    debugEvents,
    summary: {
      wastePercentage: 100 - totalEff,
      totalM2: totalAreaAllPanels / 1000000,
      usedM2: usedAreaTotal / 1000000,
      totalCuts: 0,
      cutLength: 0
    },
    kerf, 
    trim, 
    selectedThickness: thick 
  };
}

export function fillSinglePanel(
  pieces: InternalPart[],
  usableW: number,
  usableH: number,
  kerf: number,
  trimSize: number,
  pW: number,
  pH: number,
  colors: Record<string, string>,
  strategy: 'vertical' | 'horizontal',
  panelNumber: number,
  hasGrain: boolean,
  debugOverride: boolean = true,
  features: any = {}
): OptimizedPanel {
  const normalizedFeatures = (typeof features === 'boolean') 
    ? { enableV44BalancedMode: features } 
    : (features || {});

  const config: EngineConfig = {
    strategy, kerf, trim: trimSize, panelWidth: pW, panelHeight: pH, usableW, usableH, hasGrain,
    features: {
      useStripLock: true,
      useSmartSplit: false,
      penalizeSmallLeftovers: true,
      useContinuityBonus: true,
      useSmartFreeRectOrder: false,
      useGeometricContinuity: false,
      useIndexedSelection: false,
      useBacktracking: true,
      useExplorationNoise: false,
      useTopKSelection: false,
      useMultiStrip: false,
      useLookahead: true,
      useInvalidCache: true,
      enableV44BalancedMode: false,
      maxActiveStrips: 0,
      ...normalizedFeatures
    },
    maxFreeRects: 150,
    minReusableDim: 60,
    minWasteBlockDim: 60, // Fase 2: Bloqueo de basura industrial (Sincronizado a 60mm)
    eps: 0.5,
    debug: debugOverride
  };

  const placedParts: OptimizedPart[] = [];
  const debugEvents: EngineDebugEvent[] | undefined = config.debug ? [] : undefined;

  const currentPool = pieces.filter(p => !p.placed);
  const initialPoolSize = currentPool.length;
  const initialRemainingArea = currentPool.reduce((acc, p) => acc + (p.width * p.height), 0);

  let state: EngineState = {
    freeRects: [{ x: 0, y: 0, width: usableW, height: usableH, colX: 0, rowY: 0 } as any],
    activeStrips: [],
    invalidCache: new Set(),
    placedParts,
    debugSeq: 0,
    debugEvents,
    poolSize: initialPoolSize,
    remainingArea: initialRemainingArea,
    isConsolidationMode: false
  };

  // v46.0: INTELIGENCIA INDUSTRIAL (STRIP-BASED SOLVER)
  // Si la flag está activa, cambiamos el modelo de decisión FreeRect por el de Franjas.
  if (normalizedFeatures.enableStripBasedSolver) {
      const generator = new StripGenerator(kerf);
      const selector = new RipCutSelector(generator);
      
      const { strategy: bestStrategy, bestStrip } = selector.selectInitialStrategy(pieces, usableW, usableH, normalizedFeatures);
      
      // Forzar la estrategia ganadora por masa crítica
      strategy = bestStrategy;

      if (state.debugEvents) {
          state.debugEvents.push({
              type: 'CONTAINER_SELECT',
              stage: 'STRATEGY',
              message: `Industrial Strategy Selected: ${bestStrategy.toUpperCase()} (Top Strip Thickness: ${bestStrip?.thickness}mm)`,
              seq: ++state.debugSeq!,
              metadata: { bestStrategy, initialStrip: bestStrip?.thickness }
          });
      }
  }

  // [NEW_PANEL] Apertura de panel industrial
  if (state.debugEvents) {
    state.debugEvents.push({
      type: 'NEW_PANEL',
      stage: 'CORE',
      message: `Opening Panel ${panelNumber}`,
      seq: ++state.debugSeq!,
      panelNumber: panelNumber,
      metadata: {
        initialPoolSize,
        initialRemainingArea,
        strategy,
        usableW,
        usableH
      }
    });

    // [PANEL_START] Inicio de procesamiento interno
    state.debugEvents.push({
      type: 'PANEL_START',
      stage: 'CORE',
      message: `Starting Processing Panel ${panelNumber}`,
      seq: ++state.debugSeq!,
      panelNumber: panelNumber,
      metadata: {
        initialPoolSize,
        initialRemainingArea,
        strategy
      }
    });
  }

  const spaceManager = new GuillotineStrategy();
  const leftoversList: FreeRect[] = [];

  while (state.freeRects.length > 0) {
    // Actualizar Contexto Global antes de seleccionar
    const pool = pieces.filter(p => !p.placed);
    state.poolSize = pool.length;
    state.remainingArea = pool.reduce((acc, p) => acc + (p.width * p.height), 0);
    
    const panelArea = usableW * usableH;
    state.isConsolidationMode = 
      state.poolSize < 8 || 
      state.remainingArea < (panelArea * 0.25) ||
      (state.freeRects.length < 5 && state.poolSize < 12);

    state.freeRects = orderFreeRects(state.freeRects, config, state);
    const rect = state.freeRects.shift()!;

    if (rect.width < 1 || rect.height < 1) continue;

    // v46.2.3: Filtrar pool por paridad de estado antes de generar candidatos
    const unplacedInPanel = pieces.filter(p => !p.placed);
    if (unplacedInPanel.length === 0) break;

    if (normalizedFeatures.enableStripBasedSolver) {
        const generator = new StripGenerator(kerf);
        
        // v47.3: Restaurar Conciencia de Fase - ¿Estamos cerrando el pedido?
        const totalRequiredArea = normalizedFeatures.totalRequiredArea || 0;
        const currentRemainingArea = pieces.filter(p => !p.placed).reduce((acc, p) => acc + (p.width * p.height), 0);
        const isClosingPhase = totalRequiredArea > 0 && (currentRemainingArea < totalRequiredArea * 0.40);

        // v46.2.4: Evolución Multimodal - Evaluamos todos los mundos posibles para este espacio
        const hCandidates = generator.generateStrips(unplacedInPanel, rect.width, rect.height, 'horizontal', { ...normalizedFeatures, isClosingPhase });
        const vCandidates = generator.generateStrips(unplacedInPanel, rect.width, rect.height, 'vertical', { ...normalizedFeatures, isClosingPhase });
        
        const allCandidates = [...hCandidates, ...vCandidates].sort((a, b) => b.finalScore - a.finalScore);
        const bestStrip = allCandidates[0];

        if (bestStrip) {
            const currentStrategy = bestStrip.orientation;

            if (state.debugEvents) {
                state.debugEvents.push({
                    type: 'CONTAINER_SELECT',
                    stage: 'STRIP_PLACEMENT',
                    message: `Placing ${currentStrategy.toUpperCase()} Strip: ${bestStrip.parts.length} pieces, efficiency ${bestStrip.efficiency.toFixed(1)}%`,
                    seq: ++state.debugSeq!,
                    metadata: { efficiency: bestStrip.efficiency, parts: bestStrip.parts.length, strategy: currentStrategy }
                });
            }

            // Colocar cada pieza de la franja y sincronizar pool
            for (const pInfo of bestStrip.parts) {
                const { piece, rotated, x, y } = pInfo;
                const target = pieces.find(p => p.id === piece.id && !p.placed);
                if (target) {
                    const w = rotated ? target.height : target.width;
                    const h = rotated ? target.width : target.height;

                    state.placedParts!.push({
                        id: target.id,
                        name: target.name,
                        x: rect.x + x,
                        y: rect.y + y,
                        width: w,
                        height: h,
                        isLeftover: false,
                        color: colors[target.name] || '#cccccc',
                        rotated
                    });
                    target.placed = true;
                }
            }

            // Generar el Split del resto del rectángulo (Guillotina Pura)
            if (currentStrategy === 'horizontal') {
                // 1. El espacio SOBRE la franja (Ancho completo)
                if (rect.height - bestStrip.thickness - kerf > 0) {
                    state.freeRects.push({
                        x: rect.x,
                        y: rect.y + bestStrip.thickness + kerf,
                        width: rect.width,
                        height: rect.height - bestStrip.thickness - kerf,
                        colX: rect.x,
                        rowY: rect.y + bestStrip.thickness + kerf
                    } as any);
                }
                // 2. El espacio a la DERECHA de la franja (Solo la altura de la franja)
                if (rect.width - bestStrip.length - kerf >= 60) {
                    state.freeRects.push({
                        x: rect.x + bestStrip.length + kerf,
                        y: rect.y,
                        width: rect.width - bestStrip.length - kerf,
                        height: bestStrip.thickness,
                        colX: rect.x + bestStrip.length + kerf,
                        rowY: rect.y
                    } as any);
                }
            } else {
                // 1. El espacio a la DERECHA de la franja (Alto completo)
                if (rect.width - bestStrip.thickness - kerf > 0) {
                    state.freeRects.push({
                        x: rect.x + bestStrip.thickness + kerf,
                        y: rect.y,
                        width: rect.width - bestStrip.thickness - kerf,
                        height: rect.height,
                        colX: rect.x + bestStrip.thickness + kerf,
                        rowY: rect.y
                    } as any);
                }
                // 2. El espacio DEBAJO de la franja (Solo el ancho de la franja)
                if (rect.height - bestStrip.length - kerf >= 60) {
                    state.freeRects.push({
                        x: rect.x,
                        y: rect.y + bestStrip.length + kerf,
                        width: bestStrip.thickness,
                        height: rect.height - bestStrip.length - kerf,
                        colX: rect.x,
                        rowY: rect.y + bestStrip.length + kerf
                    } as any);
                }
            }
            continue; 
        }
    }

    const selection = selectBestPiece(pieces, rect, config, state, panelNumber);

    if (selection) {
      const { piece, rotated } = selection;
      const w = rotated ? piece.height : piece.width;
      const h = rotated ? piece.width : piece.height;

      state.placedParts!.push({
        id: piece.id,
        name: piece.name,
        x: rect.x,
        y: rect.y,
        width: w,
        height: h,
        isLeftover: false,
        color: colors[piece.name] || '#cccccc',
        rotated
      });
      piece.placed = true;

      // [PIECE_PLACED] Registro post-colocación real
      if (state.debugEvents) {
        const postPool = pieces.filter(p => !p.placed);
        const postPoolSize = postPool.length;
        const postRemainingArea = postPool.reduce((acc, p) => acc + (p.width * p.height), 0);

        state.debugEvents.push({
          type: 'PIECE_PLACED',
          stage: 'PLACEMENT',
          message: `Placed ${piece.name} at (${rect.x}, ${rect.y})`,
          seq: ++state.debugSeq!,
          panelNumber: panelNumber,
          pieceId: piece.id,
          rect: { x: rect.x, y: rect.y, width: w, height: h },
          metadata: {
            pieceWidth: w,
            pieceHeight: h,
            rotated,
            placedX: rect.x,
            placedY: rect.y,
            poolSizeAfterPlacement: postPoolSize,
            remainingAreaAfterPlacement: postRemainingArea
          }
        });
      }

      const split = spaceManager.split(rect, w, h, config, state);
      state.freeRects.push(...split.rects);
    } else {
      leftoversList.push(rect);
    }
  }

  const usedArea = state.placedParts!.reduce((acc, p) => acc + (p.width * p.height), 0);
  const totalArea = pW * pH;
  const efficiency = (usedArea / totalArea) * 100;

  // [PANEL_END] Cierre de panel con snapshot final
  if (state.debugEvents) {
    state.debugEvents.push({
      type: 'PANEL_END',
      stage: 'CORE',
      message: `Finished Panel ${panelNumber}`,
      seq: ++state.debugSeq!,
      panelNumber: panelNumber,
      metadata: {
        panelNumber,
        finalPoolSize: pieces.filter(p => !p.placed).length,
        finalRemainingArea: pieces.filter(p => !p.placed).reduce((acc, p) => acc + (p.width * p.height), 0),
        placedCount: state.placedParts!.length,
        leftoversCount: leftoversList.filter(r => r.width >= 60 && r.height >= 60).length,
        usedArea,
        totalArea,
        efficiency,
        freeRectsRemaining: state.freeRects.length,
        debugEventCountAtPanelEnd: state.debugEvents.length
      }
    });
  }

  const leftovers: OptimizedPart[] = leftoversList
    .filter(r => r.width >= 60 && r.height >= 60)
    .map((r, i) => ({
      id: `L-${panelNumber}-${i}`,
      name: 'Sobrante',
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      isLeftover: true,
      color: '#f0f0f0',
      rotated: false
    }));

  const leftoverArea = leftovers.reduce((acc, l) => acc + (l.width * l.height), 0);

  const stats = {
    totalAreaM2: totalArea / 1000000,
    usedAreaM2: usedArea / 1000000,
    wasteAreaM2: (totalArea - usedArea - leftoverArea) / 1000000,
    leftoverAreaM2: leftoverArea / 1000000,
    wastePercentage: ((totalArea - usedArea - leftoverArea) / totalArea) * 100,
    displacements: state.placedParts!.length * 2,
    linearMeters: (usedArea / 1000)
  };

  return { 
    panelNumber, 
    width: pW, 
    height: pH, 
    efficiency, 
    usedArea,
    totalArea,
    parts: [...state.placedParts!, ...leftovers], 
    strategy, 
    stats,
    debugEvents: state.debugEvents
  } as any;
}

function generateColors(parts: any[]): Record<string, string> {
  const uniqueNames = Array.from(new Set(parts.map(p => p.name)));
  const colors: Record<string, string> = {};
  uniqueNames.forEach((name, i) => {
    colors[name] = `hsl(${(i * 137.5) % 360}, 70%, 60%)`;
  });
  return colors;
}
