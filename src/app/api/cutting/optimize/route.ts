import { NextResponse } from 'next/server';
import { runOptimization } from '../../../../server/optimizer/cutOptimizer';

export async function POST(req: Request) {
  try {
    const { parts, width, height, thickness, kerf, trim, hasGrain } = await req.json();
    const result = runOptimization(parts, width, height, thickness, hasGrain, kerf, trim);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
