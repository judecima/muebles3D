import { SteelHouseConfig, MaterialEstimate, MaterialItem } from '@/lib/steel/types';
import { StructuralEngine } from './structuralEngine';

/**
 * Calculador de Materiales Industrial v7.0
 * Incluye panelización, uniones de panel, refuerzos de esquina y arriostramiento por carga lateral.
 */
export function calculateSteelMaterials(config: SteelHouseConfig): MaterialEstimate {
  const items: MaterialItem[] = [];
  let totalPGULenMM = 0;
  let totalPGCLenMM = 0;
  let totalTubeLenMM = 0;
  let totalBracingLenMM = 0;
  let totalExteriorAreaMM2 = 0;
  let totalInteriorAreaMM2 = 0;

  const BAR_LENGTH_M = 6;
  const PROFILE_FLANGE = 40; 
  const STEEL_WASTE = 1.15; // 15% desperdicio (incluye recortes de panelización)
  const PANEL_AREA_M2 = 1.2 * 2.4; 
  const PANEL_WASTE = 1.12; 

  config.walls.forEach(wall => {
    const panels = StructuralEngine.calculateWallPanels(wall, config);
    const studHeight = wall.height - (PROFILE_FLANGE * 2);

    panels.forEach(p => {
      // 1. SOLERAS (PGU) por panel
      totalPGULenMM += (p.width * 2);

      // 2. UNIONES Y ESQUINAS (Montantes adicionales)
      const startStuds = p.isWallStart ? 3 : 2;
      totalPGCLenMM += startStuds * studHeight;
      if (p.isWallEnd) totalPGCLenMM += 3 * studHeight;

      // 3. MONTANTES DE CAMPO
      const totalStudPositions = Math.floor(p.width / wall.studSpacing);
      let fieldStuds = totalStudPositions;

      // Descontar montantes interrumpidos por vanos en este panel
      wall.openings.forEach(op => {
        if (op.position >= p.xStart && op.position < p.xEnd) {
          fieldStuds -= Math.floor(op.width / wall.studSpacing);
        }
      });
      totalPGCLenMM += Math.max(0, fieldStuds) * studHeight;

      // 4. RIGIDIZACIÓN (San Andrés)
      if (p.needsBracing && config.layers.bracing) {
        const diagLen = Math.sqrt(p.width*p.width + wall.height*wall.height);
        totalBracingLenMM += diagLen * 2; // Dos diagonales por panel rigidizado
      }
    });

    // 5. VANOS (Dinteles, Kings, Jacks)
    wall.openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const headerH = sill + op.height;
      const analysis = StructuralEngine.calculateHeader(op, config);

      // Refuerzos de vano (King/Jack x2)
      totalPGCLenMM += (2 * studHeight * 2); 
      totalPGCLenMM += (2 * (headerH - PROFILE_FLANGE));

      // Material del dintel
      if (analysis.type === 'truss') {
        totalPGCLenMM += op.width * 6; // Complejidad de cercha
      } else if (analysis.type === 'tube') {
        totalTubeLenMM += op.width;
      } else {
        const mult = analysis.type === 'triple' ? 3 : (analysis.type === 'double' ? 2 : 1);
        totalPGCLenMM += (op.width * mult);
      }

      // Umbrales PGU
      if (op.type === 'window') totalPGULenMM += op.width;
    });

    // 6. BLOQUEOS HORIZONTALES
    if (config.layers.horizontalBlocking) {
      const blocks = StructuralEngine.calculateBlocking(wall);
      blocks.forEach(b => {
        totalPGULenMM += (b.xEnd - b.xStart);
      });
    }

    // Áreas de paneles
    const wallArea = wall.length * wall.height;
    let openingsArea = 0;
    wall.openings.forEach(op => openingsArea += (op.width * op.height));
    totalExteriorAreaMM2 += Math.max(0, wallArea - openingsArea);
    totalInteriorAreaMM2 += Math.max(0, wallArea - openingsArea);
  });

  const totalPGULenM = (totalPGULenMM / 1000) * STEEL_WASTE;
  const totalPGCLenM = (totalPGCLenMM / 1000) * STEEL_WASTE;
  const totalTubeLenM = (totalTubeLenMM / 1000) * STEEL_WASTE;
  const totalBracingLenM = (totalBracingLenMM / 1000) * STEEL_WASTE;

  items.push({
    name: 'Perfil PGU 100x0.9mm (Soleras/Blocking)',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil(totalPGULenM / BAR_LENGTH_M),
    description: `Barras de 6m. Incluye desperdicio industrial.`
  });

  items.push({
    name: 'Perfil PGC 100x0.9mm (Montantes/Uniones)',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil(totalPGCLenM / BAR_LENGTH_M),
    description: `Barras de 6m. Incluye Double Junctions y Corner Studs.`
  });

  if (totalBracingLenM > 0) {
    items.push({
      name: 'Fleje Estructural 50x0.9mm (San Andrés)',
      category: 'perfileria',
      unit: 'm',
      quantity: parseFloat(totalBracingLenM.toFixed(1)),
      description: `Arriostramiento lateral por carga de viento.`
    });
  }

  if (totalTubeLenM > 0) {
    items.push({
      name: 'Tubo Estructural 100x100x3.2mm',
      category: 'perfileria',
      unit: 'm',
      quantity: parseFloat(totalTubeLenM.toFixed(1)),
      description: `Refuerzos de dintel para grandes luces.`
    });
  }

  items.push({
    name: 'Placa OSB 12mm (Exterior)',
    category: 'paneles',
    unit: 'un',
    quantity: Math.ceil((totalExteriorAreaMM2 / 1000000 / PANEL_AREA_M2) * PANEL_WASTE),
    description: `Placas 1.2x2.4m.`
  });

  items.push({
    name: 'Placa Yeso 12.5mm (Interior)',
    category: 'paneles',
    unit: 'un',
    quantity: Math.ceil((totalInteriorAreaMM2 / 1000000 / PANEL_AREA_M2) * PANEL_WASTE),
    description: `Revestimiento interior.`
  });

  return {
    items,
    totalSteelWeightKg: Math.round((totalPGCLenM + totalPGULenM + totalBracingLenM) * 1.25 + (totalTubeLenM * 8.5))
  };
}
