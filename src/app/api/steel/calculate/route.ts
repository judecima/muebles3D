import { NextResponse } from 'next/server';
import { StructuralEngine } from '../../../../server/steel/structuralEngine';
import { calculateSteelMaterials } from '../../../../server/steel/materialCalculator';
import { FoundationEngine } from '../../../../server/steel/foundationEngine';

export async function POST(req: Request) {
  try {
    const config = await req.json();
    
    // 1. Análisis Estructural y Generación de Geometría Técnica
    const alerts = StructuralEngine.validateStructure(config);
    const estimate = calculateSteelMaterials(config);
    
    // 2. Pre-calcular elementos para el visor (Protección de IP)
    const processedWalls = config.walls.map((wall: any) => {
      return {
        id: wall.id,
        panels: StructuralEngine.calculateWallPanels(wall, config),
        blockings: StructuralEngine.calculateBlocking(wall),
        headers: wall.openings.map((op: any) => ({
          openingId: op.id,
          analysis: StructuralEngine.calculateHeader(op, wall.length, config, wall.height),
          cripples: StructuralEngine.calculateCrippleStuds(wall, op, config)
        }))
      };
    });

    const processedInternalWalls = config.internalWalls.map((iw: any) => {
      return {
        id: iw.id,
        panels: StructuralEngine.calculateWallPanels(iw, config),
        headers: (iw.openings || []).map((op: any) => ({
          openingId: op.id,
          analysis: StructuralEngine.calculateHeader(op, iw.length, config, iw.height),
          cripples: StructuralEngine.calculateCrippleStuds(iw, op, config)
        }))
      };
    });

    const lateralStability = StructuralEngine.calculateLateralStability(config);
    
    // 3. Cimentación (Nueva Integración)
    const foundation = FoundationEngine.calculateFoundation(config, { processedWalls });

    return NextResponse.json({
      alerts,
      estimate,
      processedWalls,
      processedInternalWalls,
      lateralStability,
      foundation
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
