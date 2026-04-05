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
      'arcilloso': { type: 'arcilloso', bearingCapacityKPa: 150, frictionKPa: 15 },
      'limoso': { type: 'limoso', bearingCapacityKPa: 100, frictionKPa: 10 },
      'arenoso': { type: 'arenoso', bearingCapacityKPa: 200, frictionKPa: 5 },
      'rocoso': { type: 'rocoso', bearingCapacityKPa: 500, frictionKPa: 0 }
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
    const capFusteN = perim * depthM * soil.frictionKPa * 1000;
    const maxLoadPerPile = capPuntaN + capFusteN;

    const pileCount = Math.max(12, Math.ceil(totalLoadN / (maxLoadPerPile * 0.8))); // Factor de seguridad 0.8

    // Ubicación de los pilotones (Perimetral + Esquinas + T-junctions)
    const piles: { x: number; z: number }[] = [];
    
    const halfW = config.width / 2;
    const halfL = config.length / 2;
    
    // Esquinas (Centradas en 0,0)
    piles.push({ x: -halfW, z: -halfL });
    piles.push({ x: halfW, z: -halfL });
    piles.push({ x: halfW, z: halfL });
    piles.push({ x: -halfW, z: halfL });

    // Distribuir el resto en el perímetro
    const perimeter = (config.width + config.length) * 2;
    const spacing = perimeter / (pileCount - 4);

    // Muro frontal/trasero
    for (let x = -halfW + spacing; x < halfW; x += spacing) {
        piles.push({ x, z: -halfL });
        piles.push({ x, z: halfL });
    }
    // Muros laterales
    for (let z = -halfL + spacing; z < halfL; z += spacing) {
        piles.push({ x: -halfW, z });
        piles.push({ x: halfW, z });
    }

    // 3. Volúmenes
    const slabVol = (houseArea * fConfig.slabThickness / 1000);
    const edgeBeamVol = (perimeter / 1000) * (0.20 * fConfig.edgeBeamDepth / 1000); // 20cm ancho
    const pilesVol = piles.length * (areaPunta * depthM);
    const totalConcrete = slabVol + edgeBeamVol + pilesVol;

    // Cuantía de acero (estimada 80kg/m3 de hormigón)
    const steelWeightKg = totalConcrete * 80;

    return {
      pileCount: piles.length,
      pileSpacing: spacing,
      pileDepth: fConfig.pileDepth,
      pileDiameter: fConfig.pileDiameter,
      slabVolumeM3: slabVol,
      concreteVolumeM3: totalConcrete,
      steelWeightKg: steelWeightKg,
      piles
    };
  }
}
