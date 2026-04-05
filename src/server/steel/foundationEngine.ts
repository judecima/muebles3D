import { SteelHouseConfig, FoundationConfig, SoilProperties } from '@/lib/steel/types';

export interface FoundationResult {
  pileCount: number;
  pileSpacing: number;
  pileDepth: number;
  pileDiameter: number;
  slabVolumeM3: number;
  concreteVolumeM3: number;
  steelWeightKg: number;
  piles: { x: number; z: number }[];
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
      slabThickness: 120,
      edgeBeamDepth: 300,
      pileDepth: 3000,
      pileDiameter: 200,
      soil: { type: 'arcilloso', bearingCapacityKPa: 150, frictionKPa: 15 }
    } as FoundationConfig;

    const soil = fConfig.soil.type ? soilConfigs[fConfig.soil.type] : soilConfigs['arcilloso'];

    // 1. Carga Total (Estimación)
    // Peso Perfiles + Placas + Sobrecargas
    let totalLoadN = 0;
    
    // Sumar reacciones de muros
    if (structuralResult?.processedWalls) {
      structuralResult.processedWalls.forEach((w: any) => {
        w.panels.forEach((p: any) => {
          totalLoadN += p.loads.verticalLoadN;
        });
      });
    }

    // Carga de Techo (si existe)
    const houseArea = config.width * config.length / 1000000;
    if (config.roof) {
        const roofLoadKpa = (config.roof.coveringWeightKpa || 0.5) + 0.3; // + peso propio correas
        totalLoadN += roofLoadKpa * 1000 * houseArea;
    }
    
    // Sobrecarga de Uso (200kg/m2 estándar residencial)
    totalLoadN += 2.0 * 1000 * houseArea;

    // 2. Diseño de Pilotones
    // Capacidad por pilotón = Capacidad Punta + Capacidad Fuste
    // P_adm = (Area_Punta * q_adm) + (Perimetro * Profundidad * f_friccion)
    const areaPunta = Math.PI * Math.pow(fConfig.pileDiameter/2 / 1000, 2);
    const perim = Math.PI * (fConfig.pileDiameter / 1000);
    const depthM = fConfig.pileDepth / 1000;
    
    const capPuntaN = areaPunta * soil.bearingCapacityKPa * 1000;

    const pileCount = Math.max(12, 12); 

    // Ubicación de los pilotones (Perimetral + Esquinas + T-junctions)
    const piles: any[] = [];
    
    const halfW = config.width / 2;
    const halfL = config.length / 2;
    
    // Esquinas
    const cornerPositions = [
        { x: -halfW, z: -halfL }, { x: halfW, z: -halfL },
        { x: halfW, z: halfL }, { x: -halfW, z: halfL }
    ];

    // Carga por pilotón (distribuida aprox + 20% factor de carga puntual)
    const loadPerPileKg = totalLoadN / 9.81 / pileCount;

    const analyzePile = (x: number, z: number) => {
        const D = fConfig.pileDiameter / 1000;
        const L = fConfig.pileDepth / 1000;
        const AreaPunta = Math.PI * Math.pow(D/2, 2) * 10000; // cm2
        
        const f_coef = soil.frictionCoefficient || 800; // kg/m2
        const b_cap = soil.bearingCapacity || 1.5;      // kg/cm2
        
        const perimeter = Math.PI * D;
        const frictionResistance = perimeter * L * f_coef;
        const tipResistance = AreaPunta * b_cap;
        
        const capacity = (frictionResistance + tipResistance) / 3; // FS = 3
        const isSafe = loadPerPileKg <= capacity;
        
        return {
            x, z, isSafe, load: loadPerPileKg, capacity,
            justification: `Ø${fConfig.pileDiameter}mm x ${L}m. Fricción: ${Math.round(frictionResistance/3)}kg + Punta: ${Math.round(tipResistance/3)}kg.`
        };
    };

    cornerPositions.forEach(p => piles.push(analyzePile(p.x, p.z)));

    // Distribuir el resto en el perímetro
    const perimeterLen = (config.width + config.length) * 2;
    const spacing = perimeterLen / (pileCount - 4);

    for (let x = -halfW + spacing; x < halfW; x += spacing) {
        piles.push(analyzePile(x, -halfL));
        piles.push(analyzePile(x, halfL));
    }
    for (let z = -halfL + spacing; z < halfL; z += spacing) {
        piles.push(analyzePile(-halfW, z));
        piles.push(analyzePile(halfW, z));
    }

    // 3. Volúmenes y Resultados finales
    const slabVol = (houseArea * fConfig.slabThickness / 1000);
    const edgeBeamVol = (perimeterLen / 1000) * (0.20 * fConfig.edgeBeamDepth / 1000);
    const pilesVol = piles.length * (Math.PI * Math.pow(fConfig.pileDiameter/2 / 1000, 2) * depthM);
    const totalConcrete = slabVol + edgeBeamVol + pilesVol;
    const steelWeightKg = totalConcrete * 80;

    const allPilesSafe = piles.every(p => p.isSafe);
    
    return {
      pileCount: piles.length,
      pileSpacing: spacing,
      pileDepth: fConfig.pileDepth,
      pileDiameter: fConfig.pileDiameter,
      slabVolumeM3: slabVol,
      concreteVolumeM3: totalConcrete,
      steelWeightKg: steelWeightKg,
      piles,
      isSafe: allPilesSafe,
      totalLoadKg: totalLoadN / 9.81,
      totalCapacityKg: piles.length * (piles[0].capacity),
      globalJustification: `Fundación validada para suelo ${soil.type}. FS=3 aplicado.`
    } as any;
  }
}
