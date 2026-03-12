import { SteelOpening, SteelHouseConfig, SteelWall, InternalWall } from '@/lib/steel/types';

export interface HeaderAnalysis {
  type: 'single' | 'double' | 'triple' | 'tube' | 'truss';
  loadNmm: number;
  deflectionMm: number;
  maxAllowableDeflection: number;
  requiredIx: number;
  status: 'ok' | 'warning' | 'error';
  isFusedWithCorner: 'none' | 'left' | 'right';
  actualHeight: number;
}

export class StructuralEngine {
  private static readonly STEEL_MODULUS = 203000; 
  private static readonly PGC_IX_SINGLE = 185000; 
  private static readonly TUBE_IX = 1200000; 
  private static readonly DEAD_LOAD_KPA = 0.5; 
  private static readonly LIVE_LOAD_ROOF_KPA = 1.0; 

  static calculateWallPanels(wall: SteelWall | InternalWall, config: SteelHouseConfig): any[] {
    const panels: any[] = [];
    const maxPanelWidth = 4000; 
    let currentX = 0;
    let index = 0;

    while (currentX < wall.length) {
      let targetX = Math.min(currentX + maxPanelWidth, wall.length);
      const width = targetX - currentX;
      panels.push({ id: `${wall.id}-p${index}`, xStart: currentX, xEnd: targetX, width, isWallStart: currentX === 0, isWallEnd: targetX === wall.length });
      currentX = targetX;
      index++;
    }
    return panels;
  }

  static calculateHeader(opening: SteelOpening, wallLen: number, config: SteelHouseConfig, wallHeight: number): HeaderAnalysis {
    const L = opening.width;
    const loadNmm = 0.001 * (config.length / 2); 
    const maxAllowableDeflection = L / 360;
    const requiredIx = (5 * loadNmm * Math.pow(L, 4)) / (384 * this.STEEL_MODULUS * maxAllowableDeflection);
    
    const sill = opening.type === 'door' ? 0 : (opening.sillHeight || 900);
    const availH = Math.max(0, wallHeight - (sill + opening.height) - 40);

    let type: HeaderAnalysis['type'] = 'single';
    if (L > 2500) type = 'truss';
    else if (requiredIx > this.PGC_IX_SINGLE * 2) type = 'triple';
    else if (requiredIx > this.PGC_IX_SINGLE) type = 'double';

    return { 
      type, loadNmm, deflectionMm: 0, maxAllowableDeflection, requiredIx, 
      status: L > 3500 ? 'error' : (L > 2500 ? 'warning' : 'ok'), 
      isFusedWithCorner: 'none', actualHeight: type === 'truss' ? availH : 100 
    };
  }

  static calculateCrippleStuds(wall: any, opening: SteelOpening, config: SteelHouseConfig): any[] {
    const cripples = [];
    const sill = opening.type === 'door' ? 0 : (opening.sillHeight || 900);
    const headerBottom = sill + opening.height;
    const headerTop = headerBottom + 100;

    for (let x = 400; x < wall.length; x += 400) {
      if (x > opening.position + 10 && x < (opening.position + opening.width - 10)) {
        if (wall.height - headerTop > 50) cripples.push({ x, yStart: headerTop, yEnd: wall.height - 40 });
        if (opening.type === 'window' && sill > 80) cripples.push({ x, yStart: 40, yEnd: sill - 40 });
      }
    }
    return cripples;
  }

  static calculateBlocking(wall: any): any[] {
    const blocks = [];
    if (wall.height > 2400) {
      const y = wall.height / 2;
      for (let x = 0; x < wall.length - 400; x += 400) {
        const inOp = (wall.openings || []).some((op: any) => {
          const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
          return (x < op.position + op.width && x + 400 > op.position) && (y > sill && y < sill + op.height);
        });
        if (!inOp) blocks.push({ xStart: x + 40, xEnd: x + 400, y });
      }
    }
    return blocks;
  }

  static validateStructure(config: SteelHouseConfig): any[] {
    const alerts: any[] = [];
    config.walls.forEach(w => {
      w.openings.forEach(op => {
        if (op.width > 3500) alerts.push({ status: 'error', message: `Vano crítico en ${w.id}: ${op.width}mm excede límite AISI.` });
        else if (op.width > 2500) alerts.push({ status: 'warning', message: `Luz amplia en ${w.id}: Requiere viga reticulada.` });
      });
    });
    return alerts;
  }
}