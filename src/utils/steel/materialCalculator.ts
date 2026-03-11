import { SteelHouseConfig, MaterialEstimate, MaterialItem } from '@/lib/steel/types';
import { StructuralEngine } from './structuralEngine';

export function calculateSteelMaterials(config: SteelHouseConfig): MaterialEstimate {
  const items: MaterialItem[] = [];
  
  let totalPGULenMM = 0;
  let totalPGCLenMM = 0;
  let totalPGU70LenMM = 0;
  let totalPGC70LenMM = 0;
  let totalNetAreaMM2 = 0;
  let totalInteriorAreaMM2 = 0;
  let totalStudCount = 0;

  const BAR_LENGTH_M = 6;
  const STEEL_WASTE = 1.15; 
  const PANEL_AREA_M2 = 1.2 * 2.4; 

  // Muros Perimetrales
  config.walls.forEach(wall => {
    const panels = StructuralEngine.calculateWallPanels(wall, config);
    const studHeight = wall.height - 80;

    panels.forEach(p => {
      totalPGULenMM += (p.width * 2);
      const startStuds = p.isWallStart ? 3 : 2;
      totalPGCLenMM += startStuds * studHeight;
      totalPGCLenMM += Math.floor(p.width / wall.studSpacing) * studHeight;
    });

    wall.openings.forEach(op => {
      totalPGULenMM += op.width * 2;
      totalPGCLenMM += (6 * studHeight);
    });

    const wallArea = wall.length * wall.height;
    totalNetAreaMM2 += wallArea;
  });

  // Muros Internos (Drywall 70mm)
  config.internalWalls.forEach(iw => {
    totalPGU70LenMM += iw.length * 2;
    const studCount = Math.ceil(iw.length / 400) + 1;
    totalPGC70LenMM += studCount * iw.height;
    totalInteriorAreaMM2 += (iw.length * iw.height * 2); // Dos caras
  });

  // Consolidación de Items
  items.push({
    name: 'Perfil PGU 100x0.9mm',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil((totalPGULenMM / 1000 / BAR_LENGTH_M) * STEEL_WASTE),
    description: `Estructura perimetral.`
  });

  items.push({
    name: 'Perfil PGC 100x0.9mm',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil((totalPGCLenMM / 1000 / BAR_LENGTH_M) * STEEL_WASTE),
    description: `Montantes perimetrales.`
  });

  items.push({
    name: 'Perfil PGU 70x0.5mm',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil((totalPGU70LenMM / 1000 / BAR_LENGTH_M) * STEEL_WASTE),
    description: `Soleras de tabiquería interna.`
  });

  items.push({
    name: 'Perfil PGC 70x0.5mm',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil((totalPGC70LenMM / 1000 / BAR_LENGTH_M) * STEEL_WASTE),
    description: `Montantes de tabiquería interna.`
  });

  items.push({
    name: 'Placa OSB 12mm',
    category: 'paneles',
    unit: 'un',
    quantity: Math.ceil((totalNetAreaMM2 / 1000000 / PANEL_AREA_M2) * 1.12),
    description: `Cerramiento exterior.`
  });

  items.push({
    name: 'Placa Yeso 12.5mm',
    category: 'paneles',
    unit: 'un',
    quantity: Math.ceil(((totalNetAreaMM2 + totalInteriorAreaMM2) / 1000000 / PANEL_AREA_M2) * 1.12),
    description: `Revestimiento interior total.`
  });

  return {
    items,
    totalSteelWeightKg: Math.round((totalPGCLenMM + totalPGULenMM + totalPGC70LenMM + totalPGU70LenMM) / 1000 * 1.2)
  };
}
