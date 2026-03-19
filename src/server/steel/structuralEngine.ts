
import { SteelOpening, SteelHouseConfig, SteelWall, WallPanelData, PanelLoads, InternalWall } from '@/lib/steel/types';

export interface HeaderAnalysis {
  type: 'single' | 'double' | 'triple' | 'tube' | 'truss';
  loadNmm: number;
  deflectionMm: number;
  maxAllowableDeflection: number;
  requiredIx: number;
  status: 'ok' | 'warning' | 'error';
  isFusedWithCorner: 'none' | 'left' | 'right';
  actualHeight: number;
  trussData?: {
    height: number;
    numDiagonals: number;
    chordThickness: number;
  };
  supportsRequired?: number;
  kings?: number;
  jacks?: number;
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
  private static readonly STEEL_MODULUS = 203000; 
  private static readonly PGC_IX_SINGLE = 185000; 
  private static readonly TUBE_IX = 1200000; 
  
  public static readonly CORNER_FUSION_THRESHOLD = 200; 
  private static readonly DEAD_LOAD_KPA = 0.5; 
  private static readonly LIVE_LOAD_ROOF_KPA = 1.0; 
  private static readonly WIND_PRESSURE_KPA = 0.8; 
  private static readonly UNBRACED_SHEAR_CAPACITY_KN_M = 1.5; 

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

        const isExternal = !('parentWallId' in wall);

        const needsBracing =
          isExternal &&
          (
            (loads.shearForceN / 1000) >
            (this.UNBRACED_SHEAR_CAPACITY_KN_M * width / 1000) ||
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
          reinforcementFactor, // ✅ OK
          loads
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
  
    if (!config.roof) return Math.max(2, baseWidthM / 2);
  
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
    const roofLoad = (config.roof?.coveringWeightKpa || this.DEAD_LOAD_KPA)
               + this.LIVE_LOAD_ROOF_KPA;
    const verticalLoadKN = roofLoad * widthM * tributaryWidthM;
    const shearForceKN = this.WIND_PRESSURE_KPA * widthM * heightM;
    return { verticalLoadN: verticalLoadKN * 1000, shearForceN: shearForceKN * 1000, overturningMomentNm: shearForceKN * heightM };
  }

  static calculateHeader(opening: SteelOpening, wallLen: number, config: SteelHouseConfig, wallHeight: number): HeaderAnalysis {
    const L = opening.width;
    const tributaryWidthM = this.getTributaryWidth(config);
    const roofLoad = (config.roof?.coveringWeightKpa || this.DEAD_LOAD_KPA) 
               + this.LIVE_LOAD_ROOF_KPA;
    const windLoad = this.WIND_PRESSURE_KPA * (L / 1000);
    const loadKNm = roofLoad * tributaryWidthM + windLoad;
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
      trussData = { 
        height: trussHeight, 
        numDiagonals: numPanels, 
        chordThickness: thickness * chordMultiplier,
        panelWidth,
        diagonalAngle
      };
      actualHeight = trussHeight;

      // relación luz / altura (criterio estructural)
      const slenderness = L / trussHeight;

      if (L > 5500 || slenderness > 12) {
        status = 'error';
      } else if (L > 4000 || slenderness > 10) {
        status = 'warning';
      }
    }
    const reactionKN = (loadKNm * L) / 2 / 1000; // kN

    const studCapacityKN = 8; // valor aproximado PGC 100

    const supportsRequired = Math.max(1, Math.ceil(reactionKN / studCapacityKN));

    // 🔥 REGLA UNIFICADA
    const kings = supportsRequired;
    const jacks = supportsRequired;
    const deflectionMm = (5 * loadNmm * Math.pow(L, 4)) / (384 * this.STEEL_MODULUS * requiredIx);
    return { type, loadNmm, deflectionMm, maxAllowableDeflection, requiredIx, status, isFusedWithCorner: fusion, actualHeight, trussData, supportsRequired, kings,
      jacks };
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
    
    // Validar muros perimetrales
    config.walls.forEach(wall => {
      wall.openings.forEach(op => {
        const analysis = this.calculateHeader(op, wall.length, config, wall.height);
        if (analysis.status !== 'ok') {
          const msg = analysis.type === 'truss' 
            ? `Muro Ext. - Vano ${op.width}mm: Requiere Viga Reticulada (Truss)`
            : `Muro Ext. - Vano ${op.width}mm: ${analysis.status === 'error' ? 'Crítico' : 'Refuerzo Especial'}`;
          alerts.push({ wallId: wall.id, status: analysis.status, message: msg });
        }
      });
    });

    // Validar muros internos
    config.internalWalls.forEach(iw => {
      (iw.openings || []).forEach(op => {
        const analysis = this.calculateHeader(op, iw.length, config, iw.height);
        if (analysis.status !== 'ok' || op.width > 1200) {
          const status = op.width > 2400 ? 'error' : (op.width > 1200 ? 'warning' : analysis.status);
          const msg = `Tabique Int. - Vano ${op.width}mm: ${status === 'error' ? 'Luz excesiva para tabiquería' : 'Requiere dintel reforzado'}`;
          alerts.push({ wallId: iw.id, status, message: msg });
        }
      });
    });

    return alerts;
  }
}
