
import { SteelOpening, SteelHouseConfig, SteelWall, WallPanelData, PanelLoads, InternalWall } from '@/lib/steel/types';

export interface HeaderAnalysis {
  type: 'single' | 'double' | 'triple' | 'tube' | 'truss';
  loadNmm: number;
  deflectionMm: number;
  maxAllowableDeflection: number;
  requiredIx: number;
  status: 'ok' | 'warning' | 'error';
  isFusedWithCorner: 'none' | 'left' | 'right';
  trussData?: {
    height: number;
    numDiagonals: number;
    chordThickness: number;
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
    let numPanels = Math.ceil(wall.length / maxPanelWidth);
    const panelWidth = wall.length / numPanels;

    for (let i = 0; i < numPanels; i++) {
      const xStart = i * panelWidth;
      const xEnd = (i + 1) * panelWidth;
      const loads = this.calculatePanelLoads(panelWidth, wall.height, config);
      const needsBracing = (loads.shearForceN / 1000) > (this.UNBRACED_SHEAR_CAPACITY_KN_M * panelWidth / 1000) || (i === 0 || i === numPanels - 1);

      panels.push({
        id: `${wall.id}-p${i}`,
        xStart,
        xEnd,
        width: panelWidth,
        isWallStart: i === 0,
        isWallEnd: i === numPanels - 1,
        needsBracing,
        loads
      });
    }
    return panels;
  }

  private static calculatePanelLoads(widthMm: number, heightMm: number, config: SteelHouseConfig): PanelLoads {
    const widthM = widthMm / 1000;
    const heightM = heightMm / 1000;
    const tributaryWidthM = Math.max(2, config.length / 2000); 
    const verticalLoadKN = (this.DEAD_LOAD_KPA + this.LIVE_LOAD_ROOF_KPA) * widthM * tributaryWidthM;
    const shearForceKN = this.WIND_PRESSURE_KPA * widthM * heightM;
    return { verticalLoadN: verticalLoadKN * 1000, shearForceN: shearForceKN * 1000, overturningMomentNm: shearForceKN * heightM };
  }

  static calculateHeader(opening: SteelOpening, wallLen: number, config: SteelHouseConfig): HeaderAnalysis {
    const L = opening.width;
    const tributaryWidth = config.length / 2; 
    const designLoadTotal = (this.DEAD_LOAD_KPA + this.LIVE_LOAD_ROOF_KPA) * 0.001; 
    const loadNmm = designLoadTotal * tributaryWidth; 
    const maxAllowableDeflection = L / 360;
    const requiredIx = (5 * loadNmm * Math.pow(L, 4)) / (384 * this.STEEL_MODULUS * maxAllowableDeflection);
    const fusion = this.analyzeOpeningFusion(opening, wallLen);
    
    let type: HeaderAnalysis['type'] = 'single';
    let status: HeaderAnalysis['status'] = 'ok';
    let trussData: HeaderAnalysis['trussData'] = undefined;

    if (L > 2500 || requiredIx > this.TUBE_IX) {
      type = 'truss';
      status = L > 3500 ? 'error' : 'warning';
      trussData = {
        height: 400, // Altura estándar de viga reticulada
        numDiagonals: Math.ceil(L / 400),
        chordThickness: 1.25
      };
    } else if (requiredIx > (this.PGC_IX_SINGLE * 3)) {
      type = 'tube';
    } else if (requiredIx > (this.PGC_IX_SINGLE * 2)) {
      type = 'triple';
    } else if (requiredIx > this.PGC_IX_SINGLE) {
      type = 'double';
    }

    if (L > 3500) status = 'error'; 

    return { type, loadNmm, deflectionMm: 0, maxAllowableDeflection, requiredIx, status, isFusedWithCorner: fusion, trussData };
  }

  static calculateCrippleStuds(wall: SteelWall | InternalWall, opening: SteelOpening, config: SteelHouseConfig): CrippleData[] {
    const analysis = this.calculateHeader(opening, wall.length, config);
    // Si es reticulada o viga tubo masiva, los cripples superiores son reemplazados por el cuerpo de la viga
    if (analysis.type === 'truss' || analysis.type === 'tube') return [];

    const cripples: CrippleData[] = [];
    const spacing = ('studSpacing' in wall) ? wall.studSpacing : 400;
    const wallH = wall.height;
    const sill = opening.type === 'door' ? 0 : (opening.sillHeight || 900);
    const headerTop = sill + opening.height;

    for (let x = spacing; x < wall.length; x += spacing) {
      if (x > opening.position + 10 && x < (opening.position + opening.width - 10)) {
        cripples.push({ x, yStart: headerTop, yEnd: wallH - 40, type: 'upper' });
      }
    }

    if (opening.type === 'window') {
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
          const top = sill + op.height;
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

  static validateStructure(config: SteelHouseConfig): { wallId: string, status: 'ok' | 'warning' | 'error', message: string }[] {
    const alerts: any[] = [];
    config.walls.forEach(wall => {
      wall.openings.forEach(op => {
        const analysis = this.calculateHeader(op, wall.length, config);
        if (analysis.status !== 'ok') {
          const msg = analysis.type === 'truss' 
            ? `Vano ${op.width}mm en ${wall.id}: Requiere Viga Reticulada (Truss)`
            : `Vano ${op.width}mm en ${wall.id}: ${analysis.status === 'error' ? 'Crítico' : 'Refuerzo Especial'}`;
          alerts.push({ wallId: wall.id, status: analysis.status, message: msg });
        }
      });
      const hasUnions = config.internalWalls.some(iw => iw.parentWallId === wall.id);
      if (hasUnions && !config.layers.reinforcements) alerts.push({ wallId: wall.id, status: 'warning', message: `Refuerzos de unión desactivados en ${wall.id}.` });
    });
    return alerts;
  }
}
