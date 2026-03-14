import { NextResponse } from 'next/server';
import { bookshelfEngine } from '../../../../server/engines/bookshelfEngine';
import { closetEngine } from '../../../../server/engines/closetEngine';
import { deskEngine } from '../../../../server/engines/deskEngine';
import { kitchenBaseEngine } from '../../../../server/engines/kitchenBaseEngine';
import { kitchenCatalogEngine } from '../../../../server/engines/kitchenCatalogEngine';
import { kitchenCooktopEngine } from '../../../../server/engines/kitchenCooktopEngine';
import { kitchenDrawerEngine } from '../../../../server/engines/kitchenDrawerEngine';
import { kitchenWallEngine } from '../../../../server/engines/kitchenWallEngine';
import { superiorWallFlipEngine } from '../../../../server/engines/superiorWallFlipEngine';
import { tvRackEngine } from '../../../../server/engines/tvRackEngine';

export async function POST(req: Request) {
  try {
    const { type, dimensions } = await req.json();
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
        default: throw new Error('Invalid furniture type');
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
