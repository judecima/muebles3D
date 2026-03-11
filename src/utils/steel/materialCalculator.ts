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

  const BAR_LENGTH_M = 6;
  const STEEL_WASTE = 1.15; 
  const PANEL_AREA_M2 = 1.2 * 2.4; 

  // Muros Perimetrales (PGC/PGU 100mm)
  config.walls.forEach(wall => {
    const panels = StructuralEngine.calculateWallPanels(wall, config);
    const studHeight = wall.height - 80;

    panels.forEach(p => {
      totalPGULenMM += (p.width * 2); // Soleras superior e inferior
      const startStuds = p.isWallStart ? 3 : 2;
      totalPGCLenMM += startStuds * studHeight;
      totalPGCLenMM += Math.floor(p.width / wall.studSpacing) * studHeight;
    });

    // Sumar montantes de respaldo (Backing Studs) para tabiques internos
    const anchorStudsCount = config.internalWalls.filter(iw => iw.parentWallId === wall.id).length;
    totalPGCLenMM += anchorStudsCount * studHeight;

    wall.openings.forEach(op => {
      totalPGULenMM += op.width * 2; // Dinteles y umbrales (estimado PGU)
      totalPGCLenMM += (6 * studHeight); // King studs y Jack studs (promedio 6 perfiles por vano)
    });

    const wallArea = wall.length * wall.height;
    totalNetAreaMM2 += wallArea;
  });

  // Muros Internos (Drywall 70mm)
  config.internalWalls.forEach(iw => {
    totalPGU70LenMM += iw.length * 2;
    const studCount = Math.ceil(iw.length / 400) + 1;
    totalPGC70LenMM += studCount * iw.height;
    
    // Sumar refuerzos de aberturas internas
    (iw.openings || []).forEach(op => {
      totalPGC70LenMM += (4 * iw.height); // Refuerzos laterales simplificados
    });

    totalInteriorAreaMM2 += (iw.length * iw.height * 2); // Dos caras por tabique
  });

  // Consolidación de Items
  items.push({
    name: 'Perfil PGU 100x0.9mm',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil((totalPGULenMM / 1000 / BAR_LENGTH_M) * STEEL_WASTE),
    description: `Estructura perimetral (Soleras y Dinteles).`
  });

  items.push({
    name: 'Perfil PGC 100x0.9mm',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil((totalPGCLenMM / 1000 / BAR_LENGTH_M) * STEEL_WASTE),
    description: `Montantes perimetrales, refuerzos de esquina y respaldo.`
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
    description: `Revestimiento interior (Perímetro + Tabiques ambas caras).`
  });

  // Cálculo de fijaciones y anclajes
  const totalPerimeterM = config.walls.reduce((sum, w) => sum + w.length, 0) / 1000;
  items.push({
    name: 'Anclaje Químico / Pernos 1/2"',
    category: 'fijaciones',
    unit: 'un',
    quantity: Math.ceil(totalPerimeterM / 0.6) + (config.walls.length * 2),
    description: `Anclaje de soleras inferiores a fundación.`
  });

  return {
    items,
    totalSteelWeightKg: Math.round((totalPGCLenMM + totalPGULenMM + totalPGC70LenMM + totalPGU70LenMM) / 1000 * 1.2)
  };
}
