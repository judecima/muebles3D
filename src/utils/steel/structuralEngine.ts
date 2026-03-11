import { SteelOpening, SteelHouseConfig, SteelWall } from '@/lib/steel/types';

export interface HeaderAnalysis {
  type: 'single' | 'double' | 'triple' | 'tube' | 'truss';
  loadNmm: number;
  deflectionMm: number;
  maxAllowableDeflection: number;
  requiredIx: number;
}

export interface BracingData {
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
}

export interface BlockingData {
  xStart: number;
  xEnd: number;
  y: number;
}

export interface WallPanel {
  id: string;
  xStart: number;
  xEnd: number;
  width: number;
  isWallStart: boolean;
  isWallEnd: boolean;
}

export class StructuralEngine {
  private static readonly STEEL_MODULUS = 203000; 
  private static readonly PGC_IX_SINGLE = 185000; 
  private static readonly TUBE_IX = 1200000; 
  private static readonly DESIGN_LOAD_KPA = 0.002; 

  /**
   * Divide un muro en paneles estructurales manejables (3m a 4m)
   */
  static calculateWallPanels(wall: SteelWall): WallPanel[] {
    const panels: WallPanel[] = [];
    const maxPanelWidth = 4000; // 4 metros máximo por panel
    const numPanels = Math.ceil(wall.length / maxPanelWidth);
    const panelWidth = wall.length / numPanels;

    for (let i = 0; i < numPanels; i++) {
      panels.push({
        id: `${wall.id}-p${i}`,
        xStart: i * panelWidth,
        xEnd: (i + 1) * panelWidth,
        width: panelWidth,
        isWallStart: i === 0,
        isWallEnd: i === numPanels - 1
      });
    }
    return panels;
  }

  static calculateHeader(opening: SteelOpening, config: SteelHouseConfig): HeaderAnalysis {
    const L = opening.width;
    const tributaryWidth = config.length / 2; 
    const loadNmm = (this.DESIGN_LOAD_KPA * tributaryWidth); 
    const maxAllowableDeflection = L / 360;
    const requiredIx = (5 * loadNmm * Math.pow(L, 4)) / (384 * this.STEEL_MODULUS * maxAllowableDeflection);

    let type: HeaderAnalysis['type'] = 'single';
    if (L > 2500 || requiredIx > this.TUBE_IX) {
      type = 'truss';
    } else if (requiredIx > (this.PGC_IX_SINGLE * 3)) {
      type = 'tube';
    } else if (requiredIx > (this.PGC_IX_SINGLE * 2)) {
      type = 'triple';
    } else if (requiredIx > this.PGC_IX_SINGLE) {
      type = 'double';
    }

    let currentIx = this.PGC_IX_SINGLE;
    if (type === 'double') currentIx *= 2;
    if (type === 'triple') currentIx *= 3;
    if (type === 'tube') currentIx = this.TUBE_IX;
    if (type === 'truss') currentIx = 10000000; 

    const deflectionMm = (5 * loadNmm * Math.pow(L, 4)) / (384 * this.STEEL_MODULUS * currentIx);

    return { type, loadNmm, deflectionMm, maxAllowableDeflection, requiredIx };
  }

  static calculateBracing(wall: SteelWall): BracingData[] {
    // Cruces de San Andrés eliminadas del sistema
    return [];
  }

  static calculateBlocking(wall: SteelWall): BlockingData[] {
    const blockings: BlockingData[] = [];
    const numRows = wall.height > 2400 ? (wall.height > 3000 ? 2 : 1) : 0;
    if (numRows === 0) return [];

    const rowSpacing = wall.height / (numRows + 1);

    for (let row = 1; row <= numRows; row++) {
      const y = row * rowSpacing;
      for (let x = 0; x < wall.length - wall.studSpacing; x += wall.studSpacing) {
        const xStart = x;
        const xEnd = x + wall.studSpacing;

        const intersects = wall.openings.some(op => {
          const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
          const top = sill + op.height;
          return (xStart < op.position + op.width && xEnd > op.position) && (y > sill && y < top);
        });

        if (!intersects) {
          blockings.push({ xStart, xEnd, y });
        }
      }
    }
    return blockings;
  }
}
