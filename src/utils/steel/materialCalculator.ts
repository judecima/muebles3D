import { SteelHouseConfig, MaterialEstimate, MaterialItem, SteelWall } from '@/lib/steel/types';

/**
 * Calculador de Materiales Avanzado para Steel Framing v2.0
 * Incluye lógica de encuadre de vanos: King studs, Jack studs y Dinteles Triples.
 * Factores de desperdicio: 10% Acero, 15% Paneles.
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
  const STEEL_WASTE = 1.10; // 10% Desperdicio
  const PANEL_WASTE = 1.15; // 15% Desperdicio

  config.walls.forEach(wall => {
    // 1. SOLERAS (PGU)
    totalPGULenMM += (wall.length * 2);

    // 2. MONTANTES (PGC)
    const studHeight = wall.height - (PROFILE_FLANGE * 2);
    
    // Montantes de campo (excluyendo zonas de vanos)
    const totalStudPositions = Math.floor(wall.length / wall.studSpacing) + 1;
    let fieldStuds = totalStudPositions;

    wall.openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const headerH = sill + op.height;
      const isTripleHeader = op.width > 1200;

      // Restar montantes de campo que caen en el vano
      const studsInOpening = Math.floor(op.width / wall.studSpacing);
      fieldStuds -= studsInOpening;

      // King Studs (2 por vano)
      totalPGCLenMM += (2 * studHeight);

      // Jack Studs (2 por vano, altura hasta el dintel)
      const jackH = headerH - PROFILE_FLANGE;
      totalPGCLenMM += (2 * jackH);

      // Dintel (PGU)
      const headerCount = isTripleHeader ? 3 : 1;
      totalPGULenMM += (op.width * headerCount);

      // Umbral (PGU para ventanas)
      if (op.type === 'window') {
        totalPGULenMM += op.width;
      }

      // Cripples (Superiores e inferiores)
      const crippleCount = Math.max(1, Math.floor(op.width / wall.studSpacing));
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
    name: 'Perfil PGU 100x0.9mm (Soleras/Dinteles)',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil(totalPGULenM / BAR_LENGTH_M),
    description: `Barras de 6m. Incluye 10% desperdicio y refuerzos de vanos.`
  });

  items.push({
    name: 'Perfil PGC 100x0.9mm (Montantes/Kings/Jacks)',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil(totalPGCLenM / BAR_LENGTH_M),
    description: `Barras de 6m. Estructura modular + refuerzos estructurales.`
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
    description: `Placas 1.2x2.4m. Área neta optimizada.`
  });

  return {
    items,
    totalSteelWeightKg: Math.round((totalPGCLenM + totalPGULenM) * 1.2)
  };
}