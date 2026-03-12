import { NextResponse } from 'next/server';
import { kitchenBaseEngine } from '@/server/engines/furniture/kitchenBaseEngine';
import { deskEngine } from '@/server/engines/furniture/deskEngine';
import { tvRackEngine } from '@/server/engines/furniture/tvRackEngine';
import { kitchenWallEngine } from '@/server/engines/furniture/kitchenWallEngine';
import { closetEngine } from '@/server/engines/furniture/closetEngine';
import { bookshelfEngine } from '@/server/engines/furniture/bookshelfEngine';
import { superiorWallFlipEngine } from '@/server/engines/furniture/superiorWallFlipEngine';
import { kitchenDrawerEngine } from '@/server/engines/furniture/kitchenDrawerEngine';
import { kitchenCooktopEngine } from '@/server/engines/furniture/kitchenCooktopEngine';
import { kitchenCatalogEngine } from '@/server/engines/furniture/kitchenCatalogEngine';

export async function POST(request: Request) {
  try {
    const { type, dimensions } = await request.json();

    let result;
    if (type.startsWith('cabinet_')) {
      result = kitchenCatalogEngine(type, dimensions);
    } else {
      switch (type) {
        case 'bajoMesada': result = kitchenBaseEngine(dimensions); break;
        case 'escritorio': result = deskEngine(dimensions); break;
        case 'rackTV': result = tvRackEngine(dimensions); break;
        case 'alacena': result = kitchenWallEngine(dimensions); break;
        case 'placard': result = closetEngine(dimensions); break;
        case 'biblioteca': result = bookshelfEngine(dimensions); break;
        case 'alacenaFlip': result = superiorWallFlipEngine(dimensions); break;
        case 'bajomesada-cajonera': result = kitchenDrawerEngine(dimensions); break;
        case 'porta-anafe': result = kitchenCooktopEngine(dimensions); break;
        default: result = { parts: [], summary: '', hasDoors: false, hasDrawers: false };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Furniture Engine Error:', error);
    return NextResponse.json({ error: 'Engine failed' }, { status: 500 });
  }
}