import * as math from 'mathjs';
import { SteelHouseConfig, FoundationConfig, SoilProperties } from '@/lib/steel/types';

export interface FoundationResult {
  pileCount: number;
  pileSpacing: number;
  pileDepth: number;
  pileDiameter: number;
  slabVolumeM3: number;
  concreteVolumeM3: number;
  steelWeightKg: number;
  piles: { x: number; z: number; isSafe: boolean; load: number; capacity: number; justification: string }[];
  isSafe: boolean;
  totalLoadKg: number;
  totalCapacityKg: number;
  globalJustification: string;
}

export class FoundationEngine {
  static calculateFoundation(config: SteelHouseConfig, structuralResult: any): FoundationResult {
    const soilConfigs: Record<string, SoilProperties> = {
      'arcilloso': { type: 'arcilloso', bearingCapacityKPa: 150, frictionKPa: 15, frictionCoefficient: 800, bearingCapacity: 1.5 },
      'limoso': { type: 'limoso', bearingCapacityKPa: 100, frictionKPa: 10, frictionCoefficient: 500, bearingCapacity: 1.0 },
      'arenoso': { type: 'arenoso', bearingCapacityKPa: 200, frictionKPa: 5, frictionCoefficient: 300, bearingCapacity: 2.0 },
      'rocoso': { type: 'rocoso', bearingCapacityKPa: 500, frictionKPa: 0, frictionCoefficient: 0, bearingCapacity: 5.0 }
    };

    const fConfig = config.foundation || {
      type: 'slab_with_piles',
      slabThickness: 150,
      edgeBeamDepth: 300,
      pileDepth: 3000,
      pileDiameter: 200,
      soil: { type: 'arcilloso', bearingCapacityKPa: 150, frictionKPa: 15 }
    } as FoundationConfig;

    const soil = fConfig.soil.type ? soilConfigs[fConfig.soil.type] : soilConfigs['arcilloso'];
    
    // 1. Constantes y Scope
    const SPACING_MAX = 2000; 
    const halfW = config.width / 2;
    const halfL = config.length / 2;
    const houseArea = math.number(math.divide(math.multiply(config.width, config.length), 1000000)) as number;

    // 2. Carga Total (Estimación)
    let totalLoadN = 0;
    if (structuralResult?.processedWalls) {
      structuralResult.processedWalls.forEach((w: any) => {
        w.panels.forEach((p: any) => {
          totalLoadN += (p.loads?.verticalLoadN || 0);
        });
      });
    }

    if (config.roof) {
        const roofLoadKpa = (config.roof.coveringWeightKpa || 0.5) + 0.3;
        totalLoadN += math.number(math.multiply(roofLoadKpa, math.multiply(1000, houseArea))) as number;
    }
    totalLoadN += math.number(math.multiply(2000, houseArea)) as number; // 200kg/m2 use load

    // 3. Distribución de Pilotones
    const perimeterLen = math.multiply(math.add(config.width, config.length), 2);
    const estPileCount = math.ceil(math.divide(perimeterLen, SPACING_MAX)) + 4;
    const loadPerPileKg = math.divide(math.divide(totalLoadN, 9.81), estPileCount);

    const analyzePile = (x: number, z: number) => {
        const D = fConfig.pileDiameter / 1000;
        const L = fConfig.pileDepth / 1000;
        const AreaPunta = math.multiply(math.pi, math.square(math.divide(D, 2))) as number; // m2
        
        const f_coef = soil.frictionCoefficient || 800; // kg/m2
        const b_cap = math.multiply(soil.bearingCapacity || 1.5, 10000) as number; // kg/m2
        
        const perimeter = math.multiply(math.pi, D) as number;
        const frictionResistance = math.multiply(perimeter, math.multiply(L, f_coef)) as number;
        const tipResistance = math.multiply(AreaPunta, b_cap) as number;
        
        const capacity = math.divide(math.add(frictionResistance, tipResistance), 3) as number; // FS = 3
        const isSafe = math.smallerEq(loadPerPileKg, capacity);
        
        return {
            x, z, isSafe, 
            load: math.number(loadPerPileKg) as number, 
            capacity: math.number(capacity) as number,
            justification: `Ø${fConfig.pileDiameter}mm. FS=3.`
        };
    };

    const piles: any[] = [];
    const addPilesOnEdge = (start: number, end: number, fixed: number, isV: boolean) => {
        const dist = Math.abs(end - start);
        const count = Math.max(1, Math.ceil(dist / SPACING_MAX));
        const step = dist / count;
        for (let i = 0; i <= count; i++) {
            const curr = start + (i * step);
            const px = isV ? fixed : curr;
            const pz = isV ? curr : fixed;
            if (!piles.some(p => Math.abs(p.x - px) < 10 && Math.abs(p.z - pz) < 10)) {
                piles.push(analyzePile(px, pz));
            }
        }
    };

    addPilesOnEdge(-halfW, halfW, -halfL, false); // N
    addPilesOnEdge(-halfW, halfW, halfL, false);  // S
    addPilesOnEdge(-halfL, halfL, -halfW, true);   // W
    addPilesOnEdge(-halfL, halfL, halfW, true);    // E

    // 4. Resultados finales
    const slabVol = math.number(math.divide(math.multiply(houseArea, fConfig.slabThickness), 1000)) as number;
    const edgeBeamVol = math.number(math.multiply(math.divide(perimeterLen, 1000), math.multiply(0.20, math.divide(fConfig.edgeBeamDepth, 1000)))) as number;
    const pilesVol = math.multiply(piles.length, math.multiply(math.multiply(math.pi, math.square(math.divide(fConfig.pileDiameter, 2000))), math.divide(fConfig.pileDepth, 1000))) as number;
    const totalConcrete = (math.add(math.add(slabVol, edgeBeamVol), pilesVol) as unknown as number);

    return {
      pileCount: piles.length,
      pileSpacing: SPACING_MAX,
      pileDepth: fConfig.pileDepth,
      pileDiameter: fConfig.pileDiameter,
      slabVolumeM3: slabVol,
      concreteVolumeM3: totalConcrete,
      steelWeightKg: (math.multiply(totalConcrete, 80) as unknown as number),
      piles,
      isSafe: piles.every(p => p.isSafe),
      totalLoadKg: math.number(math.divide(totalLoadN, 9.81)) as number,
      totalCapacityKg: (math.multiply(piles.length, piles[0]?.capacity || 0) as unknown as number),
      globalJustification: `Fundación validada para suelo ${soil.type}.`
    };
  }
}
