
import { SteelHouseConfig } from '@/lib/steel/types';
import { Sheet } from '../models/PlanModels';
import { FloorPlanBuilder } from './FloorPlanBuilder';
import { PanelDetailBuilder } from './PanelDetailBuilder';
import { SheetComposer } from '../layout/SheetComposer';

export class PlanGenerator {
  public static generateAll(config: SteelHouseConfig, projectName: string): Sheet[] {
    const sheets: Sheet[] = [];
    const date = new Date().toLocaleDateString();

    // 1. Planta de Replanteo
    const floorDrawing = FloorPlanBuilder.build(config);
    sheets.push({
      id: 'S01',
      sheetNumber: '01',
      title: 'REPLANTEO DE SOLERAS',
      projectName,
      date,
      scale: '1:100',
      drawing: floorDrawing
    });

    // 2. Detalles de Paneles PEX
    config.walls.forEach((wall, idx) => {
      const panelDrawing = PanelDetailBuilder.build(wall, `PEX-${idx + 1}`);
      sheets.push({
        id: `PEX-${idx + 1}`,
        sheetNumber: `P${idx + 2}`,
        title: `DETALLE DE PANEL PEX-${idx + 1}`,
        projectName,
        date,
        scale: '1:50',
        drawing: panelDrawing
      });
    });

    // 3. Detalles de Paneles PIN
    config.internalWalls.forEach((iw, idx) => {
      const panelDrawing = PanelDetailBuilder.build(iw, `PIN-${idx + 1}`);
      sheets.push({
        id: `PIN-${idx + 1}`,
        sheetNumber: `I${idx + 1}`,
        title: `DETALLE DE PANEL PIN-${idx + 1}`,
        projectName,
        date,
        scale: '1:50',
        drawing: panelDrawing
      });
    });

    return sheets.map(s => ({
      ...s,
      drawing: SheetComposer.compose(s)
    }));
  }
}
