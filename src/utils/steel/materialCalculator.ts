import { SteelHouseConfig, MaterialEstimate, MaterialItem } from '@/lib/steel/types';
import { StructuralEngine } from './structuralEngine';

/**
 * Calculador de Materiales Avanzado para Steel Framing v4.0
 * Integra análisis estructural dinámico para el cómputo de refuerzos pesados.
 */
export function calculateSteelMaterials(config: SteelHouseConfig): MaterialEstimate {
  const items: MaterialItem[] = [];
  let totalPGULenMM = 0;
  let totalPGCLenMM = 0;
  let totalTubeLenMM = 0;
  let totalExteriorAreaMM2 = 0;
  let totalInteriorAreaMM2 = 0;

  const BAR_LENGTH_M = 6;
  const PANEL_AREA_M2 = 1.2 * 2.4; 
  const PROFILE_FLANGE = 40; 
  const STEEL_WASTE = 1.10; 
  const PANEL_WASTE = 1.15; 

  config.walls.forEach(wall => {
    // 1. SOLERAS (PGU)
    totalPGULenMM += (wall.length * 2);

    const studHeight = wall.height - (PROFILE_FLANGE * 2);
    const totalStudPositions = Math.floor(wall.length / wall.studSpacing) + 1;
    let fieldStuds = totalStudPositions;

    wall.openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const headerH = sill + op.height;
      
      // Inteligencia Estructural para el BOM
      const analysis = StructuralEngine.calculateHeader(op, config);

      // Descuento de montantes de campo
      const studsInOpening = Math.floor(op.width / wall.studSpacing);
      fieldStuds -= studsInOpening;

      // King Studs (2 por vano)
      totalPGCLenMM += (2 * studHeight);

      // Jack Studs (2 por vano)
      const jackH = headerH - PROFILE_FLANGE;
      totalPGCLenMM += (2 * jackH);

      // Cómputo del Dintel según solución
      if (analysis.type === 'truss') {
        // Viga reticulada: Cordones (2 * ancho) + Diagonales (estimado 1.5 * ancho)
        totalPGCLenMM += (op.width * 3.5);
      } else if (analysis.type === 'tube') {
        // Tubo estructural (Hierro pesado)
        totalTubeLenMM += op.width;
      } else {
        // Ensambles PGC simples/dobles/triples
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

    totalPGCLenMM += (fieldStuds * studHeight);

    // Áreas Netas
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
    name: 'Perfil PGU 100x0.9mm (Soleras)',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil(totalPGULenM / BAR_LENGTH_M),
    description: `Barras de 6m. Incluye factor de desperdicio del 10%.`
  });

  items.push({
    name: 'Perfil PGC 100x0.9mm (Montantes/Dinteles/Cerchas)',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil(totalPGCLenM / BAR_LENGTH_M),
    description: `Barras de 6m. Considera refuerzos analizados por StructuralEngine.`
  });

  if (totalTubeLenM > 0) {
    items.push({
      name: 'Tubo Estructural 100x100x3.2mm',
      category: 'perfileria',
      unit: 'm',
      quantity: parseFloat(totalTubeLenM.toFixed(2)),
      description: `Refuerzos de herrería para vanos de carga media-alta.`
    });
  }

  const totalExtAreaM2 = (totalExteriorAreaMM2 / 1000000) * PANEL_WASTE;
  const totalIntAreaM2 = (totalInteriorAreaMM2 / 1000000) * PANEL_WASTE;

  items.push({
    name: 'Placa OSB 12mm (Exterior)',
    category: 'paneles',
    unit: 'un',
    quantity: Math.ceil(totalExtAreaM2 / PANEL_AREA_M2),
    description: `Placas 1.2x2.4m. Incluye 15% desperdicio.`
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
