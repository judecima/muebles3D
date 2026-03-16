
import { NextResponse } from 'next/server';
import { PlanGenerator } from '@/modules/plan-generator/engine/PlanGenerator';
import { SvgRenderer } from '@/modules/plan-generator/render/SvgRenderer';

export async function POST(req: Request) {
  try {
    const { config, projectName } = await req.json();
    
    if (!config) {
      return NextResponse.json({ error: 'Faltan datos estructurales' }, { status: 400 });
    }

    const sheets = PlanGenerator.generateAll(config, projectName || 'PROYECTO JADSI');
    
    const results = sheets.map(sheet => ({
      id: sheet.id,
      title: sheet.title,
      sheetNumber: sheet.sheetNumber,
      svg: SvgRenderer.render(sheet.drawing)
    }));

    return NextResponse.json({
      projectName,
      sheets: results,
      totalSheets: sheets.length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
