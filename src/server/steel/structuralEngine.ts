
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
  x: number;
  type: 'T' | 'cross';
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
        const loads = this.calculatePanelLoads(width, wall.height, config);
        const isExternal = !('parentWallId' in wall);
        const needsBracing = isExternal && ((loads.shearForceN / 1000) > (this.UNBRACED_SHEAR_CAPACITY_KN_M * width / 1000) || (currentX === 0 || targetX === wall.length));

        panels.push({
          id: `${wall.id}-p${panelIndex}`,
          xStart: currentX,
          xEnd: targetX,
          width: width,
          isWallStart: currentX === 0,
          isWallEnd: targetX === wall.length,
          needsBracing,
          loads
        });
      }

      currentX = targetX;
      panelIndex++;
      if (panelIndex > 50) break;
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

  static calculateHeader(opening: SteelOpening, wallLen: number, config: SteelHouseConfig, wallHeight: number): HeaderAnalysis {
    const L = opening.width;
    const tributaryWidthM = Math.max(2, config.length / 2000);
    const loadKNm = (this.DEAD_LOAD_KPA + this.LIVE_LOAD_ROOF_KPA) * tributaryWidthM;
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
      const trussHeight = Math.min(Math.max(L / 8, 200), availableHeight);
      const panelSize = 400;
      const numPanels = Math.max(2, Math.round(L / panelSize));
      let thickness = 1.25;
      if (L > 3000) thickness = 1.6;
      if (L > 4500) thickness = 2;
      trussData = { height: trussHeight, numDiagonals: numPanels, chordThickness: thickness };
      actualHeight = trussHeight;
      if (L > 4000) status = 'warning';
      if (L > 5500) status = 'error';
    }

    return { type, loadNmm, deflectionMm: 0, maxAllowableDeflection, requiredIx, status, isFusedWithCorner: fusion, actualHeight, trussData };
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
