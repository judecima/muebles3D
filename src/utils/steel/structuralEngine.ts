import { SteelOpening, SteelHouseConfig, SteelWall, WallPanelData, PanelLoads, InternalWall } from '@/lib/steel/types';

export interface HeaderAnalysis {
  type: 'single' | 'double' | 'triple' | 'tube' | 'truss';
  loadNmm: number;
  deflectionMm: number;
  maxAllowableDeflection: number;
  requiredIx: number;
  status: 'ok' | 'warning' | 'error';
}

export interface BlockingData {
  xStart: number;
  xEnd: number;
  y: number;
}

export class StructuralEngine {
  private static readonly STEEL_MODULUS = 203000; 
  private static readonly PGC_IX_SINGLE = 185000; 
  private static readonly TUBE_IX = 1200000; 
  
  // Criterios de diseño (Norma AISI / IRAM Argentina)
  private static readonly DEAD_LOAD_KPA = 0.5; // kN/m2
  private static readonly LIVE_LOAD_ROOF_KPA = 1.0; 
  private static readonly WIND_PRESSURE_KPA = 0.8; 
  private static readonly UNBRACED_SHEAR_CAPACITY_KN_M = 1.5; 

  /**
   * Divide un muro en paneles estructurales de 3 a 4 metros según estándar industrial.
   */
  static calculateWallPanels(wall: SteelWall | InternalWall, config: SteelHouseConfig): WallPanelData[] {
    const panels: WallPanelData[] = [];
    const minPanelWidth = 3000;
    const maxPanelWidth = 4000; 
    
    // Determinamos número de paneles para que caigan en el rango 3-4m
    let numPanels = Math.ceil(wall.length / maxPanelWidth);
    if (wall.length > maxPanelWidth && (wall.length / numPanels) < minPanelWidth) {
      // Ajuste para no tener paneles mini
      numPanels = Math.max(1, Math.floor(wall.length / minPanelWidth));
    }
    
    const panelWidth = wall.length / numPanels;

    for (let i = 0; i < numPanels; i++) {
      const xStart = i * panelWidth;
      const xEnd = (i + 1) * panelWidth;
      
      const loads = this.calculatePanelLoads(panelWidth, wall.height, config);
      // Rigidización necesaria si supera capacidad o es extremo de muro
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

    return {
      verticalLoadN: verticalLoadKN * 1000,
      shearForceN: shearForceKN * 1000,
      overturningMomentNm: shearForceKN * heightM
    };
  }

  static calculateHeader(opening: SteelOpening, config: SteelHouseConfig): HeaderAnalysis {
    const L = opening.width;
    const tributaryWidth = config.length / 2; 
    const designLoadTotal = (this.DEAD_LOAD_KPA + this.LIVE_LOAD_ROOF_KPA) * 0.001; 
    const loadNmm = designLoadTotal * tributaryWidth; 
    
    const maxAllowableDeflection = L / 360;
    const requiredIx = (5 * loadNmm * Math.pow(L, 4)) / (384 * this.STEEL_MODULUS * maxAllowableDeflection);

    let type: HeaderAnalysis['type'] = 'single';
    let status: HeaderAnalysis['status'] = 'ok';

    if (L > 2500 || requiredIx > this.TUBE_IX) {
      type = 'truss';
      status = 'warning';
    } else if (requiredIx > (this.PGC_IX_SINGLE * 3)) {
      type = 'tube';
    } else if (requiredIx > (this.PGC_IX_SINGLE * 2)) {
      type = 'triple';
    } else if (requiredIx > this.PGC_IX_SINGLE) {
      type = 'double';
    }

    if (L > 3500) status = 'error'; 

    return { type, loadNmm, deflectionMm: 0, maxAllowableDeflection, requiredIx, status };
  }

  static calculateBlocking(wall: SteelWall | InternalWall): BlockingData[] {
    const blockings: BlockingData[] = [];
    const numRows = wall.height > 2400 ? (wall.height > 3000 ? 2 : 1) : 0;
    if (numRows === 0) return [];

    const rowSpacing = wall.height / (numRows + 1);
    const studSpacing = ('studSpacing' in wall) ? wall.studSpacing : 400;

    for (let row = 1; row <= numRows; row++) {
      const y = row * rowSpacing;
      for (let x = 0; x < wall.length - studSpacing; x += studSpacing) {
        const xStart = x;
        const xEnd = x + studSpacing;

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

  static validateStructure(config: SteelHouseConfig): { wallId: string, status: 'ok' | 'warning' | 'error', message: string }[] {
    const alerts: any[] = [];

    config.walls.forEach(wall => {
      wall.openings.forEach(op => {
        const analysis = this.calculateHeader(op, config);
        if (analysis.status !== 'ok') {
          alerts.push({ 
            wallId: wall.id, 
            status: analysis.status, 
            message: `Vano ${op.width}mm en ${wall.id}: ${analysis.status === 'error' ? 'Crítico - Viga Laminada' : 'Refuerzo Especial'}` 
          });
        }
      });

      const hasUnions = config.internalWalls.some(iw => iw.parentWallId === wall.id);
      if (hasUnions && !config.layers.reinforcements) {
        alerts.push({ wallId: wall.id, status: 'warning', message: `Refuerzos de unión desactivados en ${wall.id}.` });
      }
    });

    return alerts;
  }
}
