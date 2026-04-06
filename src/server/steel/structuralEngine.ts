import * as math from 'mathjs';
import { Beam, DistributedLoad } from '@/lib/steel/beamEngine';
import { SteelOpening, SteelHouseConfig, SteelWall, WallPanelData, PanelLoads, InternalWall, FastenerPoint, StructuralAnalysisResult, HeaderAnalysis } from '@/lib/steel/types';
import { STEEL_PROFILES } from './profilesDB';
import { analyzeBeamProfessional } from './feaEngine';
import { GlobalAssembler } from './assembler/GlobalAssembler';
import { Truss2DSolver } from './solver/Truss2DSolver';
import { Beam2DSolver } from './solver/Beam2DSolver';
import { MemberCheckerPRO } from './checks/MemberChecker';
import { HouseStructuralViewModel } from '@/lib/steel/structuralDTO';
import { Reaction, MemberResult } from './analysis/AnalysisResult';
import { MemberCheckSummary } from './checks/types';
import { PanelGenerator } from './drawings/PanelGenerator';

export interface StructuralMemberProps {
  name: string;
  area: number; // mm2
  ix: number;   // mm4
  wx: number;   // mm3
  weight: number; // kg/m
}

export interface BlockingData {
  xStart: number;
  xEnd: number;
  y: number;
}

export interface CrippleData {
  x: number;
  yStart: number;
  yEnd: number;
  type: 'upper' | 'lower';
}

export interface JunctionData {
  wallId: string;
  x: number;
  type: 'T' | 'L' | 'cross';
  targetWallId: string;
}

export class StructuralEngine {
  // Feature flag técnico:
  public static STEEL_CORE_VERSION: 'legacy' | 'fem_v1' = 'fem_v1';

  private static readonly STEEL_MODULUS = 203000; // MPa (N/mm2)
  private static readonly STEEL_YIELD = 230; // MPa
  
  // Propiedades típicas PGC 100x40x15 x 0.9 / 1.25
  private static readonly PGC_100_09: StructuralMemberProps = { name: 'PGC 100x0.9', area: 172, ix: 254000, wx: 5080, weight: 1.35 };
  private static readonly PGC_100_125: StructuralMemberProps = { name: 'PGC 100x1.25', area: 238, ix: 345000, wx: 6900, weight: 1.87 };
  
  private static readonly PGC_IX_SINGLE = 254000; 
  private static readonly TUBE_IX = 1500000; // Valor aproximado para tubo 100x100x2
  
  public static readonly CORNER_FUSION_THRESHOLD = 200; 
  private static readonly UNBRACED_SHEAR_CAPACITY_KN_M = 1.5; 

  /**
   * ORQUESTADOR PRINCIPAL DEL NUEVO FEM CORE (PHASE 3)
   * Devuelve un DTO estable puro de renderizado.
   */
  public static getStructuralViewModel(config: SteelHouseConfig): HouseStructuralViewModel | null {
      if (this.STEEL_CORE_VERSION !== 'fem_v1') return null;

      const warnings: string[] = [];
      const reactions: Reaction[] = [];
      const checks: MemberCheckSummary[] = [];

      try {
          // 1. Ensamblado Numérico Global (Matemática pura sin GUI)
          const model = GlobalAssembler.assembleGlobalModel(config);
          
          // 2. Ejecutar Solvers y Almacenar Internal Forces
          const memberForceResults: Record<string, MemberResult> = {};
          
          // Filtrar miembros para solver de cercha (TRUSS_2D)
          const trussMembers = Object.values(model.members).filter(m => m.analysisModel === 'TRUSS_2D');
          if (trussMembers.length > 0) {
              const trussSolver = new Truss2DSolver();
              // Identificar apoyos (heurística baseline): Usaremos los extremos de la cercha.
              // Asumimos que los miembros inferiores o el primer/último miembro nos dan los extremos.
              const startNodes = new Set(trussMembers.map(m => m.startNodeId));
              const endNodes = new Set(trussMembers.map(m => m.endNodeId));
              // Nodos que solo aparecen como start o end (extremos)
              const extNodes = Object.keys(model.nodes).filter(nid => 
                  (startNodes.has(nid) && !endNodes.has(nid)) || 
                  (!startNodes.has(nid) && endNodes.has(nid))
              );
              const trussSupports = extNodes.length >= 2 ? extNodes : [trussMembers[0].startNodeId, trussMembers[trussMembers.length-1].endNodeId];

              const tRes = trussSolver.solveTruss(trussMembers, Object.values(model.nodes), model.loads, trussSupports);
              
              reactions.push(...tRes.reactions);
              warnings.push(...tRes.warnings);
              if (tRes.error) warnings.push(`Truss Solver Error: ${tRes.error}`);
              
              Object.assign(memberForceResults, tRes.memberResults);

              // INYECTAR REACCIONES DE CERCHA COMO CARGAS HACIA ABAJO PARA EL RESTO DEL DOMINIO
              tRes.reactions.forEach((r, idx) => {
                   if (Math.abs(r.rY_N) > 0.1 || Math.abs(r.rX_N) > 0.1) {
                       model.loads.push({
                           id: `L_REAC_${idx}`,
                           type: 'POINT',
                           loadCase: 'L',
                           source: 'reaction',
                           nodeId: r.nodeId,
                           fX: -r.rX_N, // Acción es opuesta a reacción
                           fY: -r.rY_N,
                           fZ: -r.rZ_N
                       });
                   }
              });
          }

          // Vigas 2D (Dinteles)
          const beamMembers = Object.values(model.members).filter(m => m.analysisModel === 'BEAM_2D');
          beamMembers.forEach(beam => {
              const bSolver = new Beam2DSolver();
              // Recolectar cargas activas sobre este dintel
              // Por ahora asumimos Loads que caigan sobre el dintel:
              const bLoads = model.loads.filter(l => 
                  l.nodeId && model.nodes[l.nodeId] &&
                  // Chequear si el nodo l cae DENTRO del bounding box 3D del dintel
                  (model.nodes[l.nodeId].x >= Math.min(model.nodes[beam.startNodeId].x, model.nodes[beam.endNodeId].x) - 1.0) && 
                  (model.nodes[l.nodeId].x <= Math.max(model.nodes[beam.startNodeId].x, model.nodes[beam.endNodeId].x) + 1.0) &&
                  (model.nodes[l.nodeId].z >= Math.min(model.nodes[beam.startNodeId].z, model.nodes[beam.endNodeId].z) - 1.0) &&
                  (model.nodes[l.nodeId].z <= Math.max(model.nodes[beam.startNodeId].z, model.nodes[beam.endNodeId].z) + 1.0)
              );
              
              try {
                  const bRes = bSolver.solveSimplySupportedBeam(beam, model.nodes, bLoads);
                  memberForceResults[beam.id] = bRes.result;
                  reactions.push(...bRes.reactions);
              } catch(e: any) {
                  warnings.push(`Beam Solver Error: ${e.message}`);
              }
          });

          // INYECTAR REACCIONES DE VIGA
          reactions.forEach(r => {
               if (r.rY_N !== 0 && !model.loads.find(l => l.nodeId === r.nodeId && l.source === 'beam_reaction')) {
                   model.loads.push({
                        id: `L_BREAC_${r.nodeId}`, type: 'POINT', loadCase: 'L', source: 'beam_reaction',
                        nodeId: r.nodeId, fX: 0, fY: -r.rY_N, fZ: 0 // Invertir reacción
                   });
               }
          });

          // Columnas 2D (Studs, Kings, Jacks) - Simulación 1D de Descenso de Cargas y Viento Simple
          const colMembers = Object.values(model.members).filter(m => m.analysisModel === 'FRAME_2D' || ['stud', 'king', 'jack'].includes(m.memberType));
          colMembers.forEach(col => {
              const n1 = model.nodes[col.startNodeId];
              const n2 = model.nodes[col.endNodeId];
              const L_m = Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.y - n1.y, 2)) / 1000;
              
              let axialN = 0;
              model.loads.forEach(l => {
                  if (!l.nodeId || l.fY === undefined) return;
                  const ln = model.nodes[l.nodeId];
                  // Si la carga cae físicamente "encima" del stud (mismo X y Z cruzando)
                  if (ln && Math.abs(ln.x - n1.x) < 50 && Math.abs(ln.z - n1.z) < 50) {
                      axialN += l.fY; // Negativo es compresión
                  }
              });

              let momentZ_Nm = 0;
              if (config.loads.windKpa > 0) {
                  // Momento simplificado wL^2 / 8 (viga simplemente apoyada ante viento)
                  const spacingM = 0.4; // 400mm espaciamiento default
                  const w_N_m = (config.loads.windKpa * 1000) * spacingM;
                  momentZ_Nm = (w_N_m * Math.pow(L_m, 2)) / 8;
              }

              memberForceResults[col.id] = {
                  memberId: col.id,
                  forces: { axialN, shearY_N: 0, momentZ_Nm },
                  utilization: 0, status: 'SAFE'
              };
          });

          // 3. Auditoría por Miembro (MemberChecker PRO)
          const dtoMembers: Record<string, any> = {};
          
          Object.values(model.members).forEach(mem => {
              const fResult = memberForceResults[mem.id] || { 
                  memberId: mem.id, forces: { axialN: 0, shearY_N: 0, momentZ_Nm: 0 }, utilization: 0, status: 'SAFE' 
              };

              const checkSummary = MemberCheckerPRO.checkMember(mem, fResult, model.nodes);
              checks.push(checkSummary as never);

              dtoMembers[mem.id] = {
                  id: mem.id,
                  memberType: mem.memberType,
                  profileId: mem.profileId,
                  startNodeId: mem.startNodeId,
                  endNodeId: mem.endNodeId,
                  wallId: mem.wallId, // Crucial para el generador de planos
                  status: checkSummary.controllingResult.status,
                  utilization: checkSummary.controllingResult.utilization,
                  forces: checkSummary.controllingResult.demand,
                  governingEquation: checkSummary.controllingResult.governingEquation,
                  message: checkSummary.controllingResult.message
              };
          });

          // 4. GENERAR PLANOS DE PANELES (Novedad Fase 5)
          const panelDrawings = PanelGenerator.generateAllPanels(
              { nodes: model.nodes, members: dtoMembers as any },
              config
          );

          return {
              nodes: model.nodes,
              members: dtoMembers,
              reactions,
              checks,
              warnings,
              solverInfo: {
                  coreVersion: this.STEEL_CORE_VERSION,
                  stable: true
              },
              panelDrawings
          };

      } catch (e: any) {
          warnings.push(`Falló el ensamblado Global FEM: ${e.message}`);
          return { nodes: {}, members: {}, reactions: [], checks: [] as MemberCheckSummary[], warnings, solverInfo: { coreVersion: this.STEEL_CORE_VERSION, stable: false } };
      }
  }

  /**
   * 1. CÁLCULO DE DEFLEXIÓN (FLECHA)
   */
  static calculateDeflection(spanMm: number, loadKgM: number, profileId: string, config: 'simple' | 'tube' | 'truss') {
    const p = STEEL_PROFILES[profileId] || STEEL_PROFILES["PGC-100-0.9"];
    const L = spanMm / 10; // cm
    const q = loadKgM / 100; // kg/cm
    const E = 2100000; // kg/cm2
    
    let I = p.ix;
    if (config === 'tube') I = p.ix * 2;
    if (config === 'truss') {
        const h_truss = 30; // cm
        I = 2 * p.area * Math.pow(h_truss / 2, 2);
    }

    const f_max = (5 * q * Math.pow(L, 4)) / (384 * E * I);
    const limit = L / 300;
    return { f_max, limit, ratio: f_max / limit, isSafe: f_max <= limit };
  }

  /**
   * 2. CÁLCULO DE WEB CRIPPLING (APLASTAMIENTO)
   */
  static checkWebCrippling(profileId: string, reactionKg: number, isEnd: boolean, isAttached: boolean = true, nWebs: number = 1) {
    const p = STEEL_PROFILES[profileId] || STEEL_PROFILES["PGC-100-0.9"];
    const t = p.thickness;
    const h = p.height - (2 * t);
    const N = 40; // mm (Apoyo solera)
    const Fy = 2300; // kg/cm2
    
    /**
     * ⚖️ COEFICIENTES AISI S100 - SECCIÓN C3.4.1
     * Ajustados para apoyos fijados mecánicamente (Attached)
     */
    const C = isEnd 
      ? (isAttached ? 6.0 : 4.0) 
      : (isAttached ? 13.0 : 10.0);
    const Cr = isEnd ? 0.16 : 0.14;
    const Ch = 0.01;

    // Unidades: cm para Fy
    const t_cm = t / 10;
    const h_cm = h / 10;
    
    const Pn_single = C * Math.pow(t_cm, 2) * Fy * (1 + Cr * Math.sqrt(N/t)) * (1 - Ch * Math.sqrt(h/t));
    const Pn_total = Pn_single * nWebs;
    const capacity = Pn_total / 1.7; // ASD Factor Omega = 1.7
    
    const EPSILON = 0.005; // 0.5% margen de error numérico
    const ratio = reactionKg / capacity;
    const isSafe = ratio <= (1.0 + EPSILON);

    return { 
        isSafe, 
        capacity, 
        ratio, 
        requiresStiffener: !isSafe,
        justification: isAttached 
          ? "Cálculo ajustado por fijación mecánica (AISI C3.4.1: C=6)." 
          : "Cálculo basado en apoyo simple sin restricción.",
        recommendation: !isSafe ? "Usar Rigidizador de alma (Stiffener) o aumentar espesor a 1.25mm" : undefined
    };
  }

  static analyzeStructuralElement(profileId: string, spanMm: number, loadKgM: number, config: 'simple' | 'double' | 'triple' | 'tube' | 'truss'): StructuralAnalysisResult {
    const profile = STEEL_PROFILES[profileId] || STEEL_PROFILES["PGC-100-0.9"];
    let I = profile.ix;
    let nWebs = 1;
    if (config === 'double') { I = profile.ix * 2; nWebs = 2; }
    if (config === 'triple') { I = profile.ix * 3; nWebs = 3; }
    if (config === 'tube') { I = profile.ix * 2; nWebs = 2; }
    if (config === 'truss') { I = 2 * profile.area * Math.pow(30 / 2, 2); nWebs = 2; }


    // 🏗️ Análisis Profesional (API sugerida)
    const analysis = analyzeBeamProfessional(spanMm, loadKgM, I);
    const reactionKg = (loadKgM * (spanMm / 1000)) / 2;
    const webCheck = this.checkWebCrippling(profileId, reactionKg, true, true, nWebs);
    
    const EPSILON = 0.005;
    const f_max_cm = Math.max(...analysis.deflectionPoints.map(p => p.y)) / 10;
    const limit_cm = spanMm / 300 / 10;
    const isDeflectionSafe = f_max_cm <= (limit_cm + EPSILON);

    const isSafe = isDeflectionSafe && webCheck.isSafe;

    return {
      isSafe,
      stressRatio: Math.max(analysis.maxMoment / 1000, webCheck.ratio),
      f_max: f_max_cm,
      limit: limit_cm,
      description: isSafe ? "Estructura Verificada" : "Falla Estructural Detectada",
      justification: webCheck.justification,
      loadKg: loadKgM * (spanMm / 1000),
      webCrippling: webCheck,
      deflectionPoints: analysis.deflectionPoints,
      maxMoment: analysis.maxMoment,
      maxShear: analysis.maxShear,
      recommendation: webCheck.isSafe ? undefined : webCheck.recommendation
    };
  }

  static calculateVerticalLoadPath(config: SteelHouseConfig) {
    const loads = config.loads;
    
    // 1. Carga de Cubierta (Dead + Live + Snow)
    const hasRoof = !!config.roof;
    const roofTributaryArea = (config.width * config.length) / 1000000 / 12; // Asumiendo 12 cerchas
    const loadPerTruss = hasRoof 
        ? roofTributaryArea * (loads.roofDeadKpa + loads.roofLiveKpa + loads.snowKpa) * 100 
        : 0; // kg
    
    const reactionPerPoint = loadPerTruss / 2;

    // 2. Carga en Montante Planta Alta (Si existiera, por ahora 1 nivel)
    // 3. Carga en Entrepiso
    const floorAreaLoad = (loads.floorDeadKpa + loads.floorLiveKpa) * 100; // kg/m2
    const tributaryWidthM = (config.width / 1000) / 2;
    const loadOnBeam = reactionPerPoint + (floorAreaLoad * tributaryWidthM * 0.6); // 60cm trib

    // 4. Fundación
    const totalLoadAtBase = loadOnBeam + (this.PGC_100_09.weight * (config.globalWallHeight / 1000));

    return {
      roofReactionKg: reactionPerPoint,
      floorBeamLoadKg: loadOnBeam,
      foundationPointLoadKg: totalLoadAtBase,
      isFoundationSafe: totalLoadAtBase < 2500, // Capacidad estándar pilotón
      alerts: totalLoadAtBase > 2000 ? "⚠️ Carga elevada en pilotones" : "✅ Cargas balanceadas"
    };
  }

  static calculateLateralStability(config: SteelHouseConfig) {
    const heightM = config.globalWallHeight / 1000;
    const q = config.loads.windKpa; // kN/m2
    const Cp = 1.3; // Factor de forma combinado

    // Viento en dirección X (impacta sobre cara de longitud config.width)
    const forceX = q * (config.width / 1000) * heightM * Cp;
    // Viento en dirección Z (impacta sobre cara de longitud config.length)
    const forceZ = q * (config.length / 1000) * heightM * Cp;

    // Identificar muros paralelos a X (Resisten viento en X)
    const wallsX = config.walls.filter(w => Math.abs(w.rotation % 180) === 0);
    const totalLenX = wallsX.reduce((sum, w) => sum + w.length, 0) / 1000;
    
    // Identificar muros paralelos a Z (Resisten viento en Z)
    const wallsZ = config.walls.filter(w => Math.abs(w.rotation % 180) === 90);
    const totalLenZ = wallsZ.reduce((sum, w) => sum + w.length, 0) / 1000;

    const shearWallsX = wallsX.map(w => {
        const load = (w.length / 1000 / totalLenX) * forceX;
        const capacity = (w.length / 1000) * this.UNBRACED_SHEAR_CAPACITY_KN_M;
        return { id: w.id, length: w.length, shearLoad: load, capacity };
    });

    const shearWallsZ = wallsZ.map(w => {
        const load = (w.length / 1000 / totalLenZ) * forceZ;
        const capacity = (w.length / 1000) * this.UNBRACED_SHEAR_CAPACITY_KN_M;
        return { id: w.id, length: w.length, shearLoad: load, capacity };
    });

    return {
        windForceX: forceX,
        windForceZ: forceZ,
        shearWallsX,
        shearWallsZ
    };
  }

  static analyzeOpeningFusion(op: SteelOpening, wallLen: number): 'none' | 'left' | 'right' {
    if (op.position < this.CORNER_FUSION_THRESHOLD) return 'left';
    if ((wallLen - (op.position + op.width)) < this.CORNER_FUSION_THRESHOLD) return 'right';
    return 'none';
  }

  static calculateWallPanels(wall: SteelWall | InternalWall, config: SteelHouseConfig): WallPanelData[] {
    const panels: WallPanelData[] = [];
    const maxPanelWidth = 4000; 
    const minPanelWidth = 600;
    const sortedOpenings = [...(wall.openings || [])].sort((a, b) => a.position - b.position);
    
    let currentX = 0;
    let panelIndex = 0;

    const pushPanel = (startX: number, endX: number) => {
      const width = endX - startX;
      if (width <= 0) return;
      const isWallStart = startX === 0;
      const isWallEnd = endX === wall.length;

      const loads = this.calculatePanelLoads(width, wall.height, config);
      const stability = this.calculateLateralStability(config);
      const shearWallInfo = [...stability.shearWallsX, ...stability.shearWallsZ].find(sw => sw.id === wall.id);
      const isExternal = !('parentWallId' in wall);

      const needsBracing = isExternal && ((shearWallInfo ? (shearWallInfo.shearLoad > shearWallInfo.capacity) : false) || isWallStart || isWallEnd);
      const highLoad = loads.verticalLoadN > (width * 10);
      let reinforcementFactor = 1;
      
      if (isWallStart || isWallEnd) reinforcementFactor = 2;
      if (needsBracing) reinforcementFactor = Math.max(reinforcementFactor, 1.5);
      if (highLoad) reinforcementFactor = Math.max(reinforcementFactor, 2);
      if (loads.verticalLoadN > width * 20) reinforcementFactor = 2.5;

      panels.push({
        id: `${wall.id}-P${panelIndex + 1}`,
        index: panelIndex + 1,
        xStart: startX,
        xEnd: endX,
        width: width,
        isWallStart,
        isWallEnd,
        needsBracing,
        reinforcementFactor, 
        loads,
        fasteners: this.calculatePanelFasteners(width, wall.height, ('studSpacing' in wall) ? wall.studSpacing : 400)
      });
      panelIndex++;
    };

    while (currentX < wall.length) {
      let nextOp = null;
      for (const op of sortedOpenings) {
          if (op.position + op.width > currentX) {
              nextOp = op;
              break;
          }
      }

      let chunkEnd = wall.length;
      let consumeOpening = false;
      
      if (nextOp) {
          const distanceToOp = nextOp.position - 10 - currentX;
          if (distanceToOp < minPanelWidth) {
              consumeOpening = true;
          } else {
              chunkEnd = nextOp.position - 10;
          }
      }

      // 1) Si entramos a la zona de una abertura, la convertimos en UN SOLO PANEL
      if (consumeOpening && nextOp) {
          let finalX = nextOp.position + nextOp.width + 10;
          for (const op of sortedOpenings) {
              if (op.position < finalX && op.position + op.width > nextOp.position) {
                  finalX = Math.max(finalX, op.position + op.width + 10);
              }
          }
          if (wall.length - finalX < minPanelWidth) {
              finalX = wall.length;
          }
          const targetX = Math.min(wall.length, finalX);
          pushPanel(currentX, targetX);
          currentX = targetX;
          continue;
      }

      // 2) Si estamos en muro solido, lo dividimos equitativamente (Even distribution)
      const sectionLength = chunkEnd - currentX;
      if (sectionLength > 0) {
          let numPanels = Math.ceil(sectionLength / maxPanelWidth);
          if (numPanels > 1 && (sectionLength / numPanels) < minPanelWidth) {
              numPanels--; // Evitar paneles enanos, forzar consolidacion
          }
          if (numPanels <= 0) numPanels = 1;
          const nominalWidth = sectionLength / numPanels;

          for (let i = 0; i < numPanels; i++) {
              const startX = currentX + i * nominalWidth;
              let endX = currentX + (i + 1) * nominalWidth;
              // Ajuste de precision flotante en el ultimo panel del segmento
              if (i === numPanels - 1) endX = chunkEnd; 
              pushPanel(startX, endX);
          }
      }

      currentX = chunkEnd;
      if (panelIndex > 50) break; // salvaguarda contra loops infinitos
    }

    return panels;
  }

  static isCorner(wall: SteelWall, config: SteelHouseConfig): boolean {
    return config.walls.some(w =>
      w.id !== wall.id &&
      (
        Math.abs(w.x - wall.x) < 50 ||
        Math.abs(w.z - wall.z) < 50
      )
    );
  }

  private static getTributaryWidth(config: SteelHouseConfig): number {
    const baseWidthM = config.width / 1000;
  
    // 🏠 Si no hay techo definido, no hay ancho tributario para cargas de cubierta
    if (!config.roof) return 0;
  
    const slopeRad = (config.roof.slope * Math.PI) / 180;
  
    if (config.roof.type === 'two_slope') {
      // 🔥 cada lado proyectado + pendiente real
      const halfSpan = baseWidthM / 2;
      return halfSpan / Math.cos(slopeRad);
    }
  
    if (config.roof.type === 'one_slope') {
      return baseWidthM / Math.cos(slopeRad);
    }
  
    return baseWidthM;
  }
  

  private static calculatePanelLoads(widthMm: number, heightMm: number, config: SteelHouseConfig): PanelLoads {
    const widthM = widthMm / 1000;
    const heightM = heightMm / 1000;
    const tributaryWidthM = this.getTributaryWidth(config); 
    const roofLoad = (config.loads.roofDeadKpa)
               + config.loads.roofLiveKpa;
    const verticalLoadKN = roofLoad * widthM * tributaryWidthM;
    const shearForceKN = config.loads.windKpa * widthM * heightM;
    return { verticalLoadN: verticalLoadKN * 1000, shearForceN: shearForceKN * 1000, overturningMomentNm: shearForceKN * heightM };
  }

  private static calculatePanelFasteners(width: number, height: number, spacing: number): FastenerPoint[] {
    const fasteners: FastenerPoint[] = [];
    
    // Tornillos en soleras (cada montante arriba y abajo)
    for (let x = 0; x <= width; x += spacing) {
      const realX = Math.min(x, width);
      // Inferior (T3)
      fasteners.push({ x: realX, y: 10, type: 'T3', label: 'U' });
      fasteners.push({ x: realX + 15, y: 10, type: 'T3', label: 'U' });
      // Superior (T3)
      fasteners.push({ x: realX, y: height - 10, type: 'T3', label: 'U' });
      fasteners.push({ x: realX + 15, y: height - 10, type: 'T3', label: 'U' });
    }

    return fasteners;
  }

  private static calculateBeamDiagrams(Lmm: number, loadNmm: number): { moments: { x: number; y: number }[]; shears: { x: number; y: number }[]; deflection: { x: number; y: number }[]; } {
    const L = Lmm;
    const w = loadNmm;
    const numPoints = 20;
    const moments: { x: number; y: number }[] = [];
    const shears: { x: number; y: number }[] = [];
    const deflection: { x: number; y: number }[] = [];

    for (let i = 0; i <= numPoints; i++) {
      const x = (i / numPoints) * L;
      // M(x) = (w * x / 2) * (L - x)
      const m = (w * x / 2) * (L - x);
      // V(x) = w * (L/2 - x)
      const v = w * (L / 2 - x);
      
      moments.push({ x, y: m });
      shears.push({ x, y: v });
      deflection.push({ x, y: 0 }); // Placeholder
    }

    return { moments, shears, deflection };
  }

  private static solveStiffnessMatrix(nodes: {x:number, y:number}[], elements: {start:number, end:number, props: StructuralMemberProps}[], loads: {node:number, fx:number, fy:number}[]) {
    const n = nodes.length;
    const K = math.zeros(n * 2, n * 2) as math.Matrix;
    const F = math.zeros(n * 2, 1) as math.Matrix;

    elements.forEach(el => {
      const n1 = nodes[el.start];
      const n2 = nodes[el.end];
      const L = Math.sqrt((n2.x - n1.x)**2 + (n2.y - n1.y)**2);
      const c = (n2.x - n1.x) / L;
      const s = (n2.y - n1.y) / L;
      
      const AE_L = (this.STEEL_MODULUS * el.props.area) / L;
      const ke = math.multiply(AE_L, [
        [c*c, c*s, -c*c, -c*s],
        [c*s, s*s, -c*s, -s*s],
        [-c*c, -c*s, c*c, c*s],
        [-c*s, -s*s, c*s, s*s]
      ]) as any;

      const idx = [el.start*2, el.start*2+1, el.end*2, el.end*2+1];
      for(let i=0; i<4; i++) {
        for(let j=0; j<4; j++) {
          const currentVal = (K as any).get([idx[i], idx[j]]);
          (K as any).set([idx[i], idx[j]], currentVal + ke[i][j]);
        }
      }
    });

    loads.forEach(load => {
      F.set([load.node*2, 0], load.fx);
      F.set([load.node*2+1, 0], load.fy);
    });

    // Condiciones de contorno (apoyos fijos en los extremos)
    // Simplificado: nudo 0 fijo, nudo último fijo en Y
    const bc = [0, 1, (n-1)*2+1]; 
    bc.forEach(idx => {
      for(let j=0; j<n*2; j++) { K.set([idx, j], 0); K.set([j, idx], 0); }
      K.set([idx, idx], 1);
      F.set([idx, 0], 0);
    });

    try {
      const U = math.lusolve(K, F) as math.Matrix;
      const results = elements.map(el => {
        const u1 = [(U as any).get([el.start*2, 0]), (U as any).get([el.start*2+1, 0])];
        const u2 = [(U as any).get([el.end*2, 0]), (U as any).get([el.end*2+1, 0])];
        const n1 = nodes[el.start];
        const n2 = nodes[el.end];
        const L = Math.sqrt((n2.x - n1.x)**2 + (n2.y - n1.y)**2);
        const c = (n2.x - n1.x) / L;
        const s = (n2.y - n1.y) / L;
        
        const force = (this.STEEL_MODULUS * el.props.area / L) * ((u2[0]-u1[0])*c + (u2[1]-u1[1])*s);
        const stress = Math.abs(force) / el.props.area;
        const ratio = stress / this.STEEL_YIELD;

        return {
          id: `${el.start}-${el.end}`,
          forceN: force,
          stressType: force > 5 ? 'tension' : (force < -5 ? 'compression' : 'zero'),
          status: ratio > 1.0 ? 'fail' : 'ok',
          ratio
        };
      });
      return results;
    } catch(e) {
      return [];
    }
  }

  private static solveTruss(L: number, H: number, n: number, totalLoadN: number, type: 'one_slope' | 'two_slope' = 'two_slope') {
    const nodes: {x:number, y:number}[] = [];
    const elements: {start:number, end:number, props: StructuralMemberProps}[] = [];
    const loads: {node:number, fx:number, fy:number}[] = [];
    
    // Generar Nodos
    const dx = L / n;
    // Cordón inferior
    for(let i=0; i<=n; i++) nodes.push({ x: i*dx, y: 0 });
    // Cordón superior
    for(let i=0; i<=n; i++) {
        let y = 0;
        if (type === 'two_slope') {
            const mid = L/2;
            y = i*dx <= mid ? (i*dx * H / mid) : ((L - i*dx) * H / mid);
        } else {
            y = i*dx * H / L;
        }
        nodes.push({ x: i*dx, y: y + 20 }); // +20 para no solapar con inferior si H=0
    }

    // Generar Elementos
    const props = totalLoadN > 10000 ? this.PGC_100_125 : this.PGC_100_09;
    for(let i=0; i<n; i++) {
      elements.push({ start: i, end: i + 1, props }); // Inferior
      elements.push({ start: n+1+i, end: n+1+i+1, props }); // Superior
      elements.push({ start: i, end: n+1+i, props }); // Vertical
      elements.push({ start: i, end: n+1+i+1, props }); // Diagonal
    }
    elements.push({ start: n, end: n*2+1, props }); // Último vertical

    // Cargas (distribuir en nodos superiores)
    const loadPerNode = -totalLoadN / (n + 1);
    for(let i=0; i<=n; i++) loads.push({ node: n + 1 + i, fx: 0, fy: loadPerNode });

    const feaResults = this.solveStiffnessMatrix(nodes, elements, loads);
    return feaResults;
  }

  static calculateHeader(opening: SteelOpening, wallLength: number, config: SteelHouseConfig, availableHeight: number, studSpacing: number = 400): HeaderAnalysis {
    const L = opening.width;
    const maxAllowableDeflection = L / 360; 
    const tributaryWidthM = this.getTributaryWidth(config);
    
    // 🧪 PARÁMETROS DE INGENIERÍA
    const roofLoad = config.roof ? (config.loads.roofDeadKpa + config.loads.roofLiveKpa) : 0;
    const snowLoad = config.roof ? config.loads.snowKpa : 0;
    const windLoad = config.loads.windKpa * (L / 1000); 
    
    const loadKNm = roofLoad * tributaryWidthM + snowLoad * tributaryWidthM + windLoad;
    const loadNmm = (loadKNm * 1000) / 1000;
    const fusion = this.analyzeOpeningFusion(opening, wallLength);
    const sill = opening.type === 'door' ? 0 : (opening.sillHeight || 900);
    const headerBottom = sill + opening.height;
    const remainingHeight = Math.max(120, availableHeight - headerBottom - 40);

    // 🚀 BUCLE DE REFUERZO ITERATIVO (SOLVER ÓPTIMO)
    // Orden de prioridad: Espesor -> Altura -> Configuración
    const configsToTry = [
      { id: "PGC-100-0.9", level: 'single', multiplier: 1, name: "PGC 100x0.9" },
      { id: "PGC-100-1.25", level: 'single', multiplier: 1, name: "PGC 100x1.25" },
      { id: "PGC-100-1.25", level: 'double', multiplier: 2, name: "Doble PGC 100x1.25" },
      { id: "PGC-150-1.25", level: 'single', multiplier: 1, name: "PGC 150x1.25" },
      { id: "PGC-150-1.25", level: 'double', multiplier: 2, name: "Doble PGC 150x1.25" },
      { id: "PGC-200-1.6", level: 'single', multiplier: 1, name: "PGC 200x1.6" },
      { id: "PGC-200-1.6", level: 'double', multiplier: 2, name: "Doble PGC 200x1.6" },
      { id: "PGC-200-1.6", level: 'tube', multiplier: 3, name: "Viga Tubo 200x1.6" },
    ];

    let foundConfig: any = null;
    let actualHeight = 100;
    let type: HeaderAnalysis['type'] = 'single';
    let alertBanner = "";
    let finalIx = 185200; // default PGC 100x0.9 mm4
    const EPSILON_COURTESY = 0.001; // 0.1% de tolerancia técnica

    // 1. Intentar configuraciones estándar
    if (L <= 3000) {
      for (const c of configsToTry) {
        const profile = STEEL_PROFILES[c.id];
        const ixMm4 = profile.ix * 10000 * c.multiplier;
        const defMM = (5 * loadNmm * Math.pow(L, 4)) / (384 * this.STEEL_MODULUS * ixMm4);
        
        // Normalización para evitar falsos negativos decimales
        const ratio = defMM / maxAllowableDeflection;
        if (ratio <= 1.0 + EPSILON_COURTESY) {
          foundConfig = c;
          finalIx = ixMm4;
          actualHeight = profile.height;
          type = c.level as any;
          if (c.multiplier > 1 || profile.thickness > 0.9 || profile.height > 100) {
            alertBanner = `📐 Refuerzo: ${c.name} requerido por luz y carga.`;
          }
          break;
        }
      }
    }

    // 2. Si fallan o luz > 3m, usar Truss
    if (!foundConfig || L > 3000) {
      type = 'truss';
      alertBanner = L > 3000 ? `⚠️ Luz Crítica (${L}mm): Escalado automático a Viga Reticulada.` : `⚠️ Carga Extrema: Escalado a Viga Reticulada por deflexión.`;
      finalIx = 10000000; // Gran inercia ficticia para validación inicial (se resuelve en el solver FEA)
    }

    let trussData: HeaderAnalysis['trussData'] | undefined;

    // 🏗️ RESOLUCIÓN SI ES TRUSS
    if (type === 'truss') {
      const calculatedHeight = L / 15; 
      const clampedHeight = Math.min(Math.max(calculatedHeight, 200), 600);
      const trussHeight = Math.min(clampedHeight, remainingHeight);
      const numPanels = Math.max(2, Math.round(L / trussHeight));
      const panelWidth = L / numPanels;
      const diagonalAngle = Math.atan(trussHeight / panelWidth);
      let thickness = L > 4500 ? 2 : (L > 3000 ? 1.6 : 1.25);

      const trussDataMembers = this.solveTruss(L, trussHeight, numPanels, loadNmm * L);
      trussData = { 
        height: trussHeight, 
        numDiagonals: numPanels, 
        panelWidth,
        diagonalAngle,
        nodeSpacing: panelWidth,
        chordProps: thickness > 1.25 ? (thickness > 1.6 ? STEEL_PROFILES["PGC-200-1.6"] : STEEL_PROFILES["PGC-200-1.25"]) : STEEL_PROFILES["PGC-100-1.25"],
        members: trussDataMembers.map((m: any, i: number) => ({
          ...m,
          id: m.id.includes('top') ? `C-SUP-${i}` : (m.id.includes('bottom') ? `C-INF-${i}` : (m.id.includes('diag') ? `DIAG-${i}` : `VERT-${i}`)),
          type: m.id.includes('top') ? 'chord_top' : (m.id.includes('bottom') ? 'chord_bottom' : (m.id.includes('diag') ? 'diagonal' : 'vertical'))
        }))
      };
      
      actualHeight = trussHeight;
    }

    // 🔬 VALIDACIÓN FINAL CON BEAM ENGINE
    const beam = new Beam(L / 1000);
    beam.addSupport(0);
    beam.addSupport(L / 1000);
    beam.addLoad(new DistributedLoad(loadNmm, 0, L / 1000)); 
    beam.setProperties(this.STEEL_MODULUS, finalIx); 
    
    const deflectionMm = Math.abs(beam.getMaxDeflection() * 1000); 
    const deflectionRatio = deflectionMm / maxAllowableDeflection;
    const reactionKg = math.divide(math.divide(math.multiply(loadNmm, L), 2), 9.81) as unknown as number;
    
    // 🗜️ REFUERZO DE APOYOS (JACKS) - Inteligente por Espesor
    // Límite normativo de 4 Jacks. Si falla, escalar espesor.
    const nCut = Math.floor((L - 10) / studSpacing);
    let numJacks = Math.max(1, Math.ceil(nCut / 2));
    let jackProfileId = "PGC-100-0.9";
    let jackThickness = 0.9;
    
    let webCheck = this.checkWebCrippling(jackProfileId, reactionKg, true, true, numJacks);
    
    // Bucle de Escalado de Apoyo
    if (!webCheck.isSafe) {
        // Intentar sumar Jacks hasta 4 (perfil estándar)
        while (!webCheck.isSafe && numJacks < 4) {
            numJacks++;
            webCheck = this.checkWebCrippling(jackProfileId, reactionKg, true, true, numJacks);
        }
        
        // Si aun así falla, subir espesor y REINICIAR cuenta de Jacks (más eficiente)
        if (!webCheck.isSafe) {
            jackProfileId = "PGC-100-1.25";
            jackThickness = 1.25;
            numJacks = Math.max(2, Math.ceil(nCut / 2)); // Empezar con 2 robustos
            webCheck = this.checkWebCrippling(jackProfileId, reactionKg, true, true, numJacks);
            
            while (!webCheck.isSafe && numJacks < 4) {
                numJacks++;
                webCheck = this.checkWebCrippling(jackProfileId, reactionKg, true, true, numJacks);
            }
        }
        
        if (webCheck.isSafe) {
            alertBanner = `Refuerzo: Se requieren ${numJacks} Jacks (${jackProfileId}) para soportar reacción crítica`;
        }
    }

    // Normalización 4 decimales para el "isSafe"
    const normalizedRatio = Math.round(deflectionRatio * 10000) / 10000;
    
    // 🧪 VALIDACIÓN INTEGRAL (Flecha + Apoyos + Miembros Truss)
    const membersSafe = trussData ? !(trussData.members || []).some((m: any) => m.status === 'fail') : true;
    const isSafe = normalizedRatio <= 1.0 + EPSILON_COURTESY && webCheck.isSafe && membersSafe;
    let status: HeaderAnalysis['status'] = isSafe ? (normalizedRatio > 0.85 || numJacks > 2 ? 'warning' : 'ok') : 'error';

    return { 
      type, loadNmm, deflectionMm, maxAllowableDeflection, requiredIx: finalIx, 
      status, isSafe, f_max: deflectionMm / 10, limit: maxAllowableDeflection / 10,
      justification: webCheck.justification, isFusedWithCorner: fusion,
      actualHeight, alertBanner, trussData,
      supports: { 
        kings: L > 3000 ? 2 : 1, 
        jacks: numJacks, 
        reactionN: loadNmm * L / 2,
        jackProfileId,
        jackThickness
      }
    };
  }
  
  static calculateCrippleStuds(wall: SteelWall | InternalWall, opening: SteelOpening, config: SteelHouseConfig): CrippleData[] {
    const cripples: CrippleData[] = [];
    const spacing = ('studSpacing' in wall) ? wall.studSpacing : 400;
    const wallH = wall.height;
    const sill = opening.type === 'door' ? 0 : (opening.sillHeight || 900);
    const headerBottom = sill + opening.height;
    const analysis = this.calculateHeader(opening, wall.length, config, wallH, spacing);
    const headerTop = headerBottom + analysis.actualHeight;
    const spaceAbove = (wallH - 40) - headerTop;

    if (spaceAbove > 10) {
      for (let x = spacing; x < wall.length; x += spacing) {
        if (x > opening.position + 10 && x < (opening.position + opening.width - 10)) {
          cripples.push({ x, yStart: headerTop, yEnd: wallH - 40, type: 'upper' });
        }
      }
    }

    if (opening.type === 'window' && sill > 80) {
      for (let x = spacing; x < wall.length; x += spacing) {
        if (x > opening.position + 10 && x < (opening.position + opening.width - 10)) {
          cripples.push({ x, yStart: 40, yEnd: sill - 40, type: 'lower' });
        }
      }
    }
    return cripples;
  }

  static calculateBlocking(wall: SteelWall | InternalWall): BlockingData[] {
    const blockings: BlockingData[] = [];
    const numRows = wall.height > 2400 ? (wall.height > 3000 ? 2 : 1) : 0;
    if (numRows === 0) return [];
    const rowSpacing = wall.height / (numRows + 1);
    const studSpacing = ('studSpacing' in wall) ? wall.studSpacing : 400;

    for (let row = 1; row <= numRows; row++) {
      const y = row * rowSpacing;
      for (let x = 0; x <= wall.length - studSpacing; x += studSpacing) {
        const xStart = x + 40; 
        const xEnd = x + studSpacing; 
        const intersects = (wall.openings || []).some(op => {
          const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
          const top = sill + op.height + 100;
          return (xStart < op.position + op.width && xEnd > op.position) && (y > sill && y < top);
        });
        if (!intersects) blockings.push({ xStart, xEnd, y });
      }
    }
    return blockings;
  }

  static calculateLadderBacking(wallHeight: number): BlockingData[] {
    const ladders: BlockingData[] = [];
    const numBlocks = 4;
    const spacing = wallHeight / (numBlocks + 1);
    for (let i = 1; i <= numBlocks; i++) {
      ladders.push({ xStart: -35, xEnd: 35, y: i * spacing });
    }
    return ladders;
  }

  static findJunctions(wall: SteelWall | InternalWall, config: SteelHouseConfig): JunctionData[] {
    const junctions: JunctionData[] = [];
    
    // Buscar muros que nazcan de este muro
    const children = config.internalWalls.filter(iw => iw.parentWallId === wall.id);
    children.forEach(child => {
      junctions.push({
        wallId: wall.id,
        x: child.xPosition,
        type: 'T',
        targetWallId: child.id
      });
    });

    // Buscar si este muro (si es interno) termina contra otro muro
    if ('parentWallId' in wall) {
      // Un muro interno siempre nace de un parent (T-junction en xPosition)
      // Pero podría terminar contra otro muro (L-junction o T-junction al final)
      // Por simplicidad, el motor detecta uniones basadas en la estructura del árbol de muros
    }

    return junctions;
  }

  static validateStructure(config: SteelHouseConfig): { wallId: string, status: 'ok' | 'warning' | 'error', message: string }[] {
    const alerts: any[] = [];
    const loadPath = this.calculateVerticalLoadPath(config);

    if (loadPath.foundationPointLoadKg > 2000) {
      alerts.push({ wallId: 'global', status: 'warning', message: loadPath.alerts });
    }
    
    // Validar muros perimetrales
    config.walls.forEach(wall => {
      wall.openings.forEach(op => {
        const analysis = this.calculateHeader(op, wall.length, config, wall.height);
        
        // Re-validar con el nuevo motor de deflexión real
        const profileId = analysis.type === 'truss' ? 'PGC-100-1.25' : 'PGC-100-0.9';
        
        // Mapear tipo de viga correctamente
        let configType: any = 'simple';
        if (analysis.type === 'double') configType = 'double';
        if (analysis.type === 'triple') configType = 'triple';
        if (analysis.type === 'tube') configType = 'tube';
        if (analysis.type === 'truss') configType = 'truss';

        const mechAnalysis = this.analyzeStructuralElement(profileId, op.width, analysis.loadNmm * 100, configType);

        if (!mechAnalysis.isSafe || analysis.status !== 'ok') {
          const status = !mechAnalysis.isSafe ? 'error' : analysis.status;
          const msg = `Muro Ext. - Vano ${op.width}mm: ${mechAnalysis.description}`;
          alerts.push({ wallId: wall.id, status, message: msg });
        }
      });
    });

    return alerts;
  }

  public static calculateRoofTrusses(config: SteelHouseConfig): any[] {
    if (!config.roof?.enabled) return [];
    
    const trusses: any[] = [];
    const trussSpacing = config.roof.trussSpacing || 600;
    const eaveLength = config.roof.eaveLength || 0;
    const slopeRad = (config.roof.slope || 15) * (Math.PI / 180);
    
    // Asumimos que las cerchas cruzan el "ancho" (eje X) y se distribuyen en el "largo" (eje Z)
    const span = config.width + (eaveLength * 2); 
    const numTrusses = Math.ceil(config.length / trussSpacing) + 1;
    const actualSpacing = config.length / (numTrusses - 1);

    for (let i = 0; i < numTrusses; i++) {
        const zPos = i * actualSpacing;
        const elements: any[] = [];
        let height = 0;

        if (config.roof.type === 'two_slope') {
            height = (span / 2) * Math.tan(slopeRad);
            // Cordón Inferior (Bottom Chord)
            elements.push({ id: `tc_${i}_b1`, type: 'bottom_chord', xStart: 0, yStart: 0, xEnd: span, yEnd: 0, profile: 'PGU' });
            // Cordon Superior Izquierdo (Top Chord Left)
            elements.push({ id: `tc_${i}_t1`, type: 'top_chord', xStart: 0, yStart: 0, xEnd: span/2, yEnd: height, profile: 'PGU' });
            // Cordon Superior Derecho (Top Chord Right)
            elements.push({ id: `tc_${i}_t2`, type: 'top_chord', xStart: span/2, yStart: height, xEnd: span, yEnd: 0, profile: 'PGU' });
            
            // Montantes y Diagonales (Howe Truss Simplificado)
            const webNodes = 3; // Nodos por lado
            for(let j=1; j<webNodes; j++) {
                const stepX = (span/2) * (j/webNodes);
                const stepY = stepX * Math.tan(slopeRad);
                // Verticales
                elements.push({ id: `tc_${i}_vL_${j}`, type: 'web', xStart: stepX, yStart: 0, xEnd: stepX, yEnd: stepY, profile: 'PGC' });
                elements.push({ id: `tc_${i}_vR_${j}`, type: 'web', xStart: span - stepX, yStart: 0, xEnd: span - stepX, yEnd: stepY, profile: 'PGC' });
                // Diagonales (del centro hacia abajo)
                if (j === 1) {
                   elements.push({ id: `tc_${i}_dL_${j}`, type: 'web', xStart: span/2, yStart: height, xEnd: stepX, yEnd: 0, profile: 'PGC' });
                   elements.push({ id: `tc_${i}_dR_${j}`, type: 'web', xStart: span/2, yStart: height, xEnd: span - stepX, yEnd: 0, profile: 'PGC' });
                }
            }
            // Montante Rey (King Post)
            elements.push({ id: `tc_${i}_king`, type: 'web', xStart: span/2, yStart: 0, xEnd: span/2, yEnd: height, profile: 'PGC' });
        } 
        else if (config.roof.type === 'one_slope') {
            height = span * Math.tan(slopeRad);
            elements.push({ id: `tc_${i}_b1`, type: 'bottom_chord', xStart: 0, yStart: 0, xEnd: span, yEnd: 0, profile: 'PGU' });
            elements.push({ id: `tc_${i}_t1`, type: 'top_chord', xStart: 0, yStart: 0, xEnd: span, yEnd: height, profile: 'PGU' });
            
            const webNodes = 5;
            for(let j=1; j<webNodes; j++) {
                const stepX = span * (j/webNodes);
                const stepY = stepX * Math.tan(slopeRad);
                elements.push({ id: `tc_${i}_v_${j}`, type: 'web', xStart: stepX, yStart: 0, xEnd: stepX, yEnd: stepY, profile: 'PGC' });
                if (j < webNodes - 1) {
                    const nextX = span * ((j+1)/webNodes);
                    elements.push({ id: `tc_${i}_d_${j}`, type: 'web', xStart: stepX, yStart: 0, xEnd: nextX, yEnd: nextX * Math.tan(slopeRad), profile: 'PGC' });
                }
            }
            elements.push({ id: `tc_${i}_v_end`, type: 'web', xStart: span, yStart: 0, xEnd: span, yEnd: height, profile: 'PGC' });
        }
        else if (config.roof.type === 'flat') {
            height = 300; // 30cm espesor estandar
            elements.push({ id: `tc_${i}_b1`, type: 'bottom_chord', xStart: 0, yStart: 0, xEnd: span, yEnd: 0, profile: 'PGU' });
            elements.push({ id: `tc_${i}_t1`, type: 'top_chord', xStart: 0, yStart: height, xEnd: span, yEnd: height, profile: 'PGU' });
            
            const webNodes = Math.ceil(span / 600);
            for(let j=1; j<webNodes; j++) {
                const stepX = span * (j/webNodes);
                // Montanes verticales
                elements.push({ id: `tc_${i}_v_${j}`, type: 'web', xStart: stepX, yStart: 0, xEnd: stepX, yEnd: height, profile: 'PGC' });
                // Cruz de San Andrés / Warren
                if (j < webNodes - 1) {
                   const nextX = span * ((j+1)/webNodes);
                   elements.push({ id: `tc_${i}_d_${j}`, type: 'web', xStart: stepX, yStart: 0, xEnd: nextX, yEnd: height, profile: 'PGC' });
                   if (j % 2 !== 0) {
                      elements.push({ id: `tc_${i}_d2_${j}`, type: 'web', xStart: stepX, yStart: height, xEnd: nextX, yEnd: 0, profile: 'PGC' });
                   }
                }
            }
        }

        trusses.push({
            id: `truss_${i}`,
            z: zPos,
            span,
            height,
            elements
        });
    }

    return trusses;
  }

}
