import * as math from 'mathjs';
import { SteelOpening, SteelHouseConfig, SteelWall, WallPanelData, PanelLoads, InternalWall, FastenerPoint, StructuralAnalysisResult } from '@/lib/steel/types';
import { STEEL_PROFILES } from './profilesDB';
import { analyzeBeamProfessional } from './feaEngine';

export interface StructuralMemberProps {
  name: string;
  area: number; // mm2
  ix: number;   // mm4
  wx: number;   // mm3
  weight: number; // kg/m
}

export interface HeaderAnalysis {
  type: 'single' | 'double' | 'triple' | 'tube' | 'truss';
  loadNmm: number;
  deflectionMm: number;
  maxAllowableDeflection: number;
  requiredIx: number;
  status: 'ok' | 'warning' | 'error';
  isFusedWithCorner: 'none' | 'left' | 'right';
  actualHeight: number;
  isSafe: boolean;
  f_max: number;
  limit: number;
  justification?: string;
  trussData?: {
    height: number;
    numDiagonals: number;
    panelWidth: number;
    diagonalAngle: number;
    nodeSpacing: number;
    chordProps: StructuralMemberProps;
    members?: {
      id: string;
      forceN: number;
      type: 'chord_top' | 'chord_bottom' | 'diagonal' | 'vertical';
      stressType: 'tension' | 'compression' | 'zero';
      status: 'ok' | 'fail';
      ratio: number;
    }[];
  };
  diagramData?: {
    moments: { x: number; y: number }[];
    shears: { x: number; y: number }[];
    deflection: { x: number; y: number }[];
  };
  supports: {
    kings: number;
    jacks: number;
    reactionN: number;
  };
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
    const openings = wall.openings || [];
    
    let currentX = 0;
    let panelIndex = 0;

    while (currentX < wall.length) {
      let targetX = Math.min(currentX + maxPanelWidth, wall.length);
      
      if (targetX < wall.length) {
        for (const op of openings) {
          const opStart = op.position;
          const opEnd = op.position + op.width;
          if (targetX > opStart && targetX < opEnd) {
            targetX = opStart - 10; 
            if (targetX - currentX < minPanelWidth) {
              targetX = opEnd + 10;
            }
            break;
          }
        }
      }

      targetX = Math.min(targetX, wall.length);
      const width = targetX - currentX;

      if (width > 0) {
        const isWallStart = currentX === 0;
        const isWallEnd = targetX === wall.length;

        const loads = this.calculatePanelLoads(width, wall.height, config);
        const stability = this.calculateLateralStability(config);
        const shearWallInfo = [...stability.shearWallsX, ...stability.shearWallsZ].find(sw => sw.id === wall.id);

        const isExternal = !('parentWallId' in wall);

        const needsBracing =
          isExternal &&
          (
            (shearWallInfo ? (shearWallInfo.shearLoad > shearWallInfo.capacity) : false) ||
            isWallStart ||
            isWallEnd
          );

        // 🔥 ahora sí correcto
        const highLoad = loads.verticalLoadN > (width * 10);

        let reinforcementFactor = 1;

        // extremos → muy rígidos
        if (isWallStart || isWallEnd) {
          reinforcementFactor = 2;
        }

        // cargas medias
        if (needsBracing) {
          reinforcementFactor = Math.max(reinforcementFactor, 1.5);
        }

        // cargas altas reales
        if (highLoad) {
          reinforcementFactor = Math.max(reinforcementFactor, 2);
        }

        // 🔥 opcional PRO: súper carga
        if (loads.verticalLoadN > width * 20) {
          reinforcementFactor = 2.5;
        }

        panels.push({
          id: `${wall.id}-P${panelIndex + 1}`,
          index: panelIndex + 1,
          xStart: currentX,
          xEnd: targetX,
          width: width,
          isWallStart,
          isWallEnd,
          needsBracing,
          reinforcementFactor, 
          loads,
          fasteners: this.calculatePanelFasteners(width, wall.height, ('studSpacing' in wall) ? wall.studSpacing : 400)
        });
      }

      currentX = targetX;
      panelIndex++;
      if (panelIndex > 50) break;
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

  static calculateHeader(opening: SteelOpening, wallLen: number, config: SteelHouseConfig, wallHeight: number): HeaderAnalysis {
    const L = opening.width;
    const tributaryWidthM = this.getTributaryWidth(config);
    
    // Solo aplicar cargas de techo si la estructura existe
    const hasRoof = !!config.roof;
    const roofLoad = hasRoof ? (config.loads.roofDeadKpa + config.loads.roofLiveKpa) : 0;
    const snowLoad = hasRoof ? config.loads.snowKpa : 0;
    
    const windLoad = config.loads.windKpa * (L / 1000); // El viento siempre impacta si hay cerramiento
    const loadKNm = roofLoad * tributaryWidthM + snowLoad * tributaryWidthM + windLoad;
    const loadNmm = (loadKNm * 1000) / 1000;
    const maxAllowableDeflection = L / 360;
    const requiredIx = (5 * loadNmm * Math.pow(L, 4)) / (384 * this.STEEL_MODULUS * maxAllowableDeflection);
    const fusion = this.analyzeOpeningFusion(opening, wallLen);
    const sill = opening.type === 'door' ? 0 : (opening.sillHeight || 900);
    const headerBottom = sill + opening.height;
    const availableHeight = Math.max(120, wallHeight - headerBottom - 40);

    let type: HeaderAnalysis['type'] = 'single';
    let status: HeaderAnalysis['status'] = 'ok';
    let actualHeight = 100;
    let trussData: HeaderAnalysis['trussData'] | undefined;

    if (requiredIx <= this.PGC_IX_SINGLE) {
      type = 'single';
      actualHeight = 100;
    } else if (requiredIx <= this.PGC_IX_SINGLE * 2) {
      type = 'double';
      actualHeight = 100;
    } else if (requiredIx <= this.PGC_IX_SINGLE * 3) {
      type = 'triple';
      actualHeight = 100;
    } else if (requiredIx <= this.TUBE_IX) {
      type = 'tube';
      actualHeight = 120;
    } else {
      type = 'truss';
      // NUEVA REGLA: altura basada en luz (L/10), no L/8
      const calculatedHeight = L / 10;

      // límites constructivos
      const clampedHeight = Math.min(Math.max(calculatedHeight, 200), 600);

      // respetar altura disponible en muro
      const trussHeight = Math.min(clampedHeight, availableHeight);
      // NUEVO: panel basado en proporción estructural (cuasi cuadrado)
      const targetPanelWidth = trussHeight;

      // cantidad de paneles según geometría real
      const numPanels = Math.max(2, Math.round(L / targetPanelWidth));
      // 🔥 GEOMETRÍA REAL
      const panelWidth = L / numPanels;

      // ángulo real (radianes)
      const diagonalAngle = Math.atan(trussHeight / panelWidth);
      // espesor base
      let thickness = 1.25;

      // refuerzo progresivo
      if (L > 3000) thickness = 1.6;
      if (L > 4500) thickness = 2;

      // NUEVO: refuerzo de cordones (doble perfil)
      // 🔥 PERFIL DOBLE SEGÚN ESFUERZO REAL (no solo L)
      let chordMultiplier = 1;

      // criterio combinado: luz + esbeltez + carga
      if (L > 4000 || requiredIx > this.PGC_IX_SINGLE * 3) {
        chordMultiplier = 2; // doble perfil
      }
    const trussDataMembers = this.solveTruss(L, trussHeight, numPanels, loadNmm * L);
      
      trussData = { 
        height: trussHeight, 
        numDiagonals: numPanels, 
        panelWidth,
        diagonalAngle,
        nodeSpacing: panelWidth,
        chordProps: thickness > 1.25 ? this.PGC_100_125 : this.PGC_100_09,
        members: trussDataMembers.map((m: any, i: number) => ({
          ...m,
          id: m.id.includes('top') ? `C-SUP-${i}` : (m.id.includes('bottom') ? `C-INF-${i}` : (m.id.includes('diag') ? `DIAG-${i}` : `VERT-${i}`)),
          type: m.id.includes('top') ? 'chord_top' : (m.id.includes('bottom') ? 'chord_bottom' : (m.id.includes('diag') ? 'diagonal' : 'vertical'))
        }))
      };
      
      actualHeight = trussHeight;

      // relación luz / altura (criterio estructural)
      const slenderness = L / trussHeight;

      if (L > 5500 || slenderness > 12 || trussDataMembers.some((m: any) => m.status === 'fail')) {
        status = 'error';
      } else if (L > 4000 || slenderness > 10) {
        status = 'warning';
      }
    }

    const totalReactionN = (loadNmm * L) / 2;
    const studCapacityN = 8000; // PGC 100 0.9 ~ 800kg

    // Lógica profesional de Jacks: 1 por cada 1.2m
    const jacks = Math.max(Math.ceil(L / 1200), Math.ceil(totalReactionN / studCapacityN));
    const kings = 1; // Siempre al menos 1 rigidizador continuo

    const deflectionMm = (5 * loadNmm * Math.pow(L, 4)) / (384 * this.STEEL_MODULUS * requiredIx);
    
    // Generar diagramas si es tipo viga o tubo
    let diagramData: HeaderAnalysis['diagramData'];
    if (type !== 'truss') {
      const base = this.calculateBeamDiagrams(L, loadNmm);
      const deflectionArr = base.moments.map((p: any) => {
        const x = p.x;
        const d = (loadNmm * x * (Math.pow(L, 3) - 2*L*Math.pow(x, 2) + Math.pow(x, 3))) / (24 * this.STEEL_MODULUS * requiredIx);
        return { x, y: d * 10 }; // 10x para visibilidad
      });
      diagramData = { 
        moments: base.moments,
        shears: base.shears,
        deflection: deflectionArr 
      };
    }

    // 🧪 VALIDACIÓN FÍSICA DETALLADA (Web Crippling + Deflection)
    const EPSILON = 0.005; // 0.5% tolerancia de redondeo
    const reactionKg = (loadNmm * L) / 2 / 9.81; // Reacción en kg
    const webCheck = this.checkWebCrippling(this.PGC_100_09.name, reactionKg, true, true, type === 'single' ? 1 : (type === 'double' ? 2 : 3));
    const defSafe = deflectionMm <= (maxAllowableDeflection + (L * EPSILON / 300));
    
    const isSafe = defSafe && webCheck.isSafe;
    if (!isSafe) status = 'error';
    else if (deflectionMm > maxAllowableDeflection * 0.85) status = 'warning';

    return { 
      type, 
      loadNmm, 
      deflectionMm, 
      maxAllowableDeflection, 
      requiredIx, 
      status,
      isSafe,
      f_max: deflectionMm / 10,
      limit: maxAllowableDeflection / 10,
      justification: webCheck.justification,
      isFusedWithCorner: fusion,
      actualHeight,
      trussData,
      diagramData,
      supports: {
        kings: 1, // Siempre al menos 1 King Stud por lado
        jacks: L > 1200 ? 2 : 1, // 2 Jacks si el vano es mayor a 1.20 metros
        reactionN: loadNmm * L / 2
      }
    };
  }
  
  static calculateCrippleStuds(wall: SteelWall | InternalWall, opening: SteelOpening, config: SteelHouseConfig): CrippleData[] {
    const cripples: CrippleData[] = [];
    const spacing = ('studSpacing' in wall) ? wall.studSpacing : 400;
    const wallH = wall.height;
    const sill = opening.type === 'door' ? 0 : (opening.sillHeight || 900);
    const headerBottom = sill + opening.height;
    const analysis = this.calculateHeader(opening, wall.length, config, wallH);
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
}
