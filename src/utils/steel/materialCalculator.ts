import { SteelHouseConfig, MaterialEstimate, MaterialItem } from '@/lib/steel/types';
import { StructuralEngine } from './structuralEngine';

/**
 * Calculador de Materiales Industrial v6.0
 * Considera panelización, refuerzos de esquina y uniones estructurales.
 */
export function calculateSteelMaterials(config: SteelHouseConfig): MaterialEstimate {
  const items: MaterialItem[] = [];
  let totalPGULenMM = 0;
  let totalPGCLenMM = 0;
  let totalTubeLenMM = 0;
  let totalExteriorAreaMM2 = 0;
  let totalInteriorAreaMM2 = 0;

  const BAR_LENGTH_M = 6;
  const PROFILE_FLANGE = 40; 
  const STEEL_WASTE = 1.12; // 12% desperdicio por panelización
  const PANEL_AREA_M2 = 1.2 * 2.4; 
  const PANEL_WASTE = 1.15; 

  config.walls.forEach(wall => {
    const panels = StructuralEngine.calculateWallPanels(wall);
    const studHeight = wall.height - (PROFILE_FLANGE * 2);

    // 1. SOLERAS (PGU) por cada panel
    panels.forEach(p => {
      totalPGULenMM += (p.width * 2);
    });

    // 2. MONTANTES (PGC)
    // Refuerzos de Esquina (Triple montante en inicios/fines de muro)
    totalPGCLenMM += (3 * studHeight) * 2; // Por cada muro 6 montantes de esquina

    // Uniones entre paneles (Doble montante)
    if (panels.length > 1) {
      totalPGCLenMM += (panels.length - 1) * (2 * studHeight);
    }

    // Montantes de campo (Field Studs)
    const totalStudPositions = Math.floor(wall.length / wall.studSpacing) + 1;
    let fieldStuds = totalStudPositions;

    wall.openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const headerH = sill + op.height;
      const analysis = StructuralEngine.calculateHeader(op, config);

      const studsInOpening = Math.floor(op.width / wall.studSpacing);
      fieldStuds -= studsInOpening;

      // King Studs (Doble refuerzo por lado)
      totalPGCLenMM += (2 * studHeight) * 2;
      // Jack Studs
      const jackH = headerH - PROFILE_FLANGE;
      totalPGCLenMM += (2 * jackH);

      // Dinteles
      if (analysis.type === 'truss') {
        totalPGCLenMM += (op.width * 4); // Cordones + Diagonales
      } else if (analysis.type === 'tube') {
        totalTubeLenMM += op.width;
      } else {
        const multiplier = analysis.type === 'triple' ? 3 : (analysis.type === 'double' ? 2 : 1);
        totalPGCLenMM += (op.width * multiplier);
      }

      // Umbrales PGU
      if (op.type === 'window') totalPGULenMM += op.width;

      // Cripples
      const crippleCount = Math.max(1, Math.floor(op.width / wall.studSpacing));
      const upperCrippleH = Math.max(0, wall.height - headerH - PROFILE_FLANGE * 2);
      totalPGCLenMM += (crippleCount * upperCrippleH);
      if (op.type === 'window') {
        totalPGCLenMM += (crippleCount * (sill - PROFILE_FLANGE * 2));
      }
    });

    totalPGCLenMM += (Math.max(0, fieldStuds) * studHeight);

    // 3. REFUERZOS LATERALES (Cruces de San Andrés)
    if (config.layers.crossBracing) {
      const braces = StructuralEngine.calculateBracing(wall);
      braces.forEach(b => {
        const len = Math.sqrt(Math.pow(b.xEnd - b.xStart, 2) + Math.pow(b.yEnd - b.yStart, 2));
        totalPGULenMM += len; 
      });
    }

    // 4. BLOQUEOS HORIZONTALES
    if (config.layers.horizontalBlocking) {
      const blocks = StructuralEngine.calculateBlocking(wall);
      blocks.forEach(b => {
        totalPGULenMM += (b.xEnd - b.xStart);
      });
    }

    // Áreas netas para paneles
    const wallArea = wall.length * wall.height;
    let openingsArea = 0;
    wall.openings.forEach(op => openingsArea += (op.width * op.height));
    const netArea = Math.max(0, wallArea - openingsArea);
    totalExteriorAreaMM2 += netArea;
    totalInteriorAreaMM2 += netArea;
  });

  const totalPGULenM = (totalPGULenMM / 1000) * STEEL_WASTE;
  const totalPGCLenM = (totalPGCLenMM / 1000) * STEEL_WASTE;
  const totalTubeLenM = (totalTubeLenMM / 1000) * STEEL_WASTE;

  items.push({
    name: 'Perfil PGU 100x0.9mm (Soleras/Bridging)',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil(totalPGULenM / BAR_LENGTH_M),
    description: `Barras de 6m. Incluye panelización y refuerzos.`
  });

  items.push({
    name: 'Perfil PGC 100x0.9mm (Montantes/Uniones)',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil(totalPGCLenM / BAR_LENGTH_M),
    description: `Barras de 6m. Incluye Double Junctions y Corner Studs.`
  });

  if (totalTubeLenM > 0) {
    items.push({
      name: 'Tubo Estructural 100x100x3.2mm',
      category: 'perfileria',
      unit: 'm',
      quantity: parseFloat(totalTubeLenM.toFixed(2)),
      description: `Refuerzos pesados para dinteles de gran luz.`
    });
  }

  const totalExtAreaM2 = (totalExteriorAreaMM2 / 1000000) * PANEL_WASTE;
  const totalIntAreaM2 = (totalInteriorAreaMM2 / 1000000) * PANEL_WASTE;

  items.push({
    name: 'Placa OSB 12mm (Exterior)',
    category: 'paneles',
    unit: 'un',
    quantity: Math.ceil(totalExtAreaM2 / PANEL_AREA_M2),
    description: `Placas 1.2x2.4m con desperdicio.`
  });

  items.push({
    name: 'Placa de Yeso 12.5mm (Interior)',
    category: 'paneles',
    unit: 'un',
    quantity: Math.ceil(totalIntAreaM2 / PANEL_AREA_M2),
    description: `Placas 1.2x2.4m.`
  });

  return {
    items,
    totalSteelWeightKg: Math.round((totalPGCLenM + totalPGULenM) * 1.2 + (totalTubeLenM * 8.5))
  };
}
