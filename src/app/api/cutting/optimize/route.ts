
import { NextResponse } from 'next/server';
import { runOptimization } from '@/server/engines/optimizer/cutOptimizer';

export async function POST(request: Request) {
  try {
    const { parts, panelWidth, panelHeight, thickness, kerf, trim } = await request.json();
    
    const result = runOptimization(
      parts,
      panelWidth,
      panelHeight,
      thickness,
      kerf || 4.5,
      trim || 10
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Cutting Optimizer Error:', error);
    return NextResponse.json({ error: 'Optimization failed' }, { status: 500 });
  }
}
