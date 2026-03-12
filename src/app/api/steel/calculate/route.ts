import { NextResponse } from 'next/server';
import { StructuralEngine } from '../../../../server/engines/steel/structuralEngine';
import { calculateSteelMaterials } from '../../../../server/engines/steel/materialCalculator';

export async function POST(request: Request) {
  try {
    const config = await request.json();

    const wallData = config.walls.map((wall: any) => {
      return {
        id: wall.id,
        panels: StructuralEngine.calculateWallPanels(wall, config),
        blocking: StructuralEngine.calculateBlocking(wall),
        openings: wall.openings.map((op: any) => ({
          ...op,
          id: op.id,
          analysis: StructuralEngine.calculateHeader(op, wall.length, config, wall.height),
          cripples: StructuralEngine.calculateCrippleStuds(wall, op, config)
        }))
      };
    });

    const internalWallData = config.internalWalls.map((iw: any) => {
      return {
        id: iw.id,
        panels: StructuralEngine.calculateWallPanels(iw, config),
        blocking: StructuralEngine.calculateBlocking(iw),
        openings: (iw.openings || []).map((op: any) => ({
          ...op,
          id: op.id,
          analysis: StructuralEngine.calculateHeader(op, iw.length, config, iw.height),
          cripples: StructuralEngine.calculateCrippleStuds(iw, op, config)
        }))
      };
    });

    const alerts = StructuralEngine.validateStructure(config);
    const materials = calculateSteelMaterials(config);

    return NextResponse.json({
      wallData,
      internalWallData,
      alerts,
      materials
    });
  } catch (error) {
    console.error('Steel Engine Error:', error);
    return NextResponse.json({ error: 'Structural calculation failed' }, { status: 500 });
  }
}
