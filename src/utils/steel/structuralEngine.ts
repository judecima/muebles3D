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

export class StructuralEngine {
  private static readonly STEEL_MODULUS = 203000; 
  private static readonly PGC_IX_SINGLE = 185000; 
  private static readonly TUBE_IX = 1200000; 
  private static readonly DESIGN_LOAD_KPA = 0.002; 

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

  /**
   * Calcula la posición de las Cruces de San Andrés
   */
  static calculateBracing(wall: SteelWall): BracingData[] {
    const braces: BracingData[] = [];
    const minBraceWidth = 600; 
    
    // Identificar zonas ciegas (sin aberturas)
    const sortedOpenings = [...wall.openings].sort((a, b) => a.position - b.position);
    let currentX = 0;
    const wallZones: { start: number, end: number }[] = [];

    sortedOpenings.forEach(op => {
      if (op.position - currentX > minBraceWidth) {
        wallZones.push({ start: currentX, end: op.position });
      }
      currentX = op.position + op.width;
    });

    if (wall.length - currentX > minBraceWidth) {
      wallZones.push({ start: currentX, end: wall.length });
    }

    // Aplicar cruces según normativa de ancho
    wallZones.forEach(zone => {
      const zoneW = zone.end - zone.start;
      let numX = 0;
      if (zoneW > 4000) numX = 2;
      else if (zoneW > 1200 || wall.height > 2700) numX = 1;

      if (numX > 0) {
        const segmentW = zoneW / numX;
        for (let i = 0; i < numX; i++) {
          const xS = zone.start + (i * segmentW) + 50;
          const xE = zone.start + ((i + 1) * segmentW) - 50;
          
          // Cruz principal \
          braces.push({ xStart: xS, yStart: 50, xEnd: xE, yEnd: wall.height - 50 });
          // Cruz invertida /
          braces.push({ xStart: xE, yStart: 50, xEnd: xS, yEnd: wall.height - 50 });
        }
      }
    });

    return braces;
  }

  /**
   * Calcula el bloqueo horizontal (Bridging)
   */
  static calculateBlocking(wall: SteelWall): BlockingData[] {
    const blockings: BlockingData[] = [];
    const numRows = wall.height > 3000 ? 2 : (wall.height > 2400 ? 1 : 0);
    if (numRows === 0) return [];

    const rowSpacing = wall.height / (numRows + 1);

    for (let row = 1; row <= numRows; row++) {
      const y = row * rowSpacing;
      
      // Generar bloqueos entre montantes
      for (let x = 0; x < wall.length - wall.studSpacing; x += wall.studSpacing) {
        const xStart = x;
        const xEnd = x + wall.studSpacing;

        // Verificar que no intersecte aberturas en esa altura
        const intersects = wall.openings.some(op => {
          const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
          const top = sill + op.height;
          const inXRange = (xStart < op.position + op.width && xEnd > op.position);
          const inYRange = (y > sill && y < top);
          return inXRange && inYRange;
        });

        if (!intersects) {
          blockings.push({ xStart, xEnd, y });
        }
      }
    }

    return blockings;
  }
}
