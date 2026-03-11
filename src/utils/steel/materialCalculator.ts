import { SteelHouseConfig, MaterialEstimate, MaterialItem } from '@/lib/steel/types';

/**
 * Calculador de Materiales Avanzado para Steel Framing v2.1
 * Aplica lógica de refuerzos estructurales y factores de desperdicio normativos.
 */
export function calculateSteelMaterials(config: SteelHouseConfig): MaterialEstimate {
  const items: MaterialItem[] = [];
  let totalPGULenMM = 0;
  let totalPGCLenMM = 0;
  let totalExteriorAreaMM2 = 0;
  let totalInteriorAreaMM2 = 0;

  const BAR_LENGTH_M = 6;
  const PANEL_AREA_M2 = 1.2 * 2.4; 
  const PROFILE_FLANGE = 40; 
  
  // Factores de desperdicio según requisito puntual
  const STEEL_WASTE = 1.10; // 10% Desperdicio
  const PANEL_WASTE = 1.15; // 15% Desperdicio

  config.walls.forEach(wall => {
    // 1. SOLERAS (PGU)
    totalPGULenMM += (wall.length * 2);

    // 2. MONTANTES Y REFUERZOS (PGC)
    const studHeight = wall.height - (PROFILE_FLANGE * 2);
    const totalStudPositions = Math.floor(wall.length / wall.studSpacing) + 1;
    let fieldStuds = totalStudPositions;

    wall.openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const headerH = sill + op.height;
      const isTripleHeader = op.width > 1200;

      // Restar montantes de campo obstruidos por el vano
      const studsInOpening = Math.floor(op.width / wall.studSpacing);
      fieldStuds -= studsInOpening;

      // King Studs (2 por vano - altura completa)
      totalPGCLenMM += (2 * studHeight);

      // Jack Studs (2 por vano - apoyo de dintel)
      const jackH = headerH - PROFILE_FLANGE;
      totalPGCLenMM += (2 * jackH);

      // Dintel (Ensamblaje PGC simple o triple)
      const headerCount = isTripleHeader ? 3 : 1;
      totalPGCLenMM += (op.width * headerCount);

      // Umbral (PGU para ventanas)
      if (op.type === 'window') {
        totalPGULenMM += op.width;
      }

      // Cripple Studs (Superiores e inferiores)
      const crippleSpacing = wall.studSpacing;
      const crippleCount = Math.max(1, Math.floor(op.width / crippleSpacing));
      
      const upperCrippleH = Math.max(0, wall.height - headerH - PROFILE_FLANGE * 2);
      totalPGCLenMM += (crippleCount * upperCrippleH);

      if (op.type === 'window') {
        const lowerCrippleH = Math.max(0, sill - PROFILE_FLANGE * 2);
        totalPGCLenMM += (crippleCount * lowerCrippleH);
      }
    });

    totalPGCLenMM += (fieldStuds * studHeight);

    // 3. ÁREAS NETAS DE PANELES
    const wallArea = wall.length * wall.height;
    let openingsArea = 0;
    wall.openings.forEach(op => openingsArea += (op.width * op.height));
    const netArea = Math.max(0, wallArea - openingsArea);
    totalExteriorAreaMM2 += netArea;
    totalInteriorAreaMM2 += netArea;
  });

  const totalPGULenM = (totalPGULenMM / 1000) * STEEL_WASTE;
  const totalPGCLenM = (totalPGCLenMM / 1000) * STEEL_WASTE;
  const totalExtAreaM2 = (totalExteriorAreaMM2 / 1000000) * PANEL_WASTE;
  const totalIntAreaM2 = (totalInteriorAreaMM2 / 1000000) * PANEL_WASTE;

  items.push({
    name: 'Perfil PGU 100x0.9mm (Soleras/Umbrales)',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil(totalPGULenM / BAR_LENGTH_M),
    description: `Barras de 6m comerciales. Incluye factor de desperdicio del 10%.`
  });

  items.push({
    name: 'Perfil PGC 100x0.9mm (Montantes/Dinteles/Refuerzos)',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil(totalPGCLenM / BAR_LENGTH_M),
    description: `Barras de 6m. Considera Kings, Jacks y Dinteles Triples (para vanos >1.2m).`
  });

  items.push({
    name: 'Placa OSB 12mm (Exterior)',
    category: 'paneles',
    unit: 'un',
    quantity: Math.ceil(totalExtAreaM2 / PANEL_AREA_M2),
    description: `Placas 1.2x2.4m. Incluye 15% desperdicio por recortes.`
  });

  items.push({
    name: 'Placa de Yeso 12.5mm (Interior)',
    category: 'paneles',
    unit: 'un',
    quantity: Math.ceil(totalIntAreaM2 / PANEL_AREA_M2),
    description: `Placas 1.2x2.4m. Cómputo basado en área neta + 15% desperdicio.`
  });

  return {
    items,
    totalSteelWeightKg: Math.round((totalPGCLenM + totalPGULenM) * 1.2)
  };
}
