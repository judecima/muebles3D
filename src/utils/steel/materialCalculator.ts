import { SteelHouseConfig, MaterialEstimate, MaterialItem, SteelWall } from '@/lib/steel/types';

/**
 * Calculador de Materiales para Steel Framing v1.7
 * Optimizado para cálculo por UNIDADES COMERCIALES (Barras de 6m y Placas de 1.2x2.4m).
 * Garantiza cálculo neto estricto para máxima precisión geométrica.
 */
export function calculateSteelMaterials(config: SteelHouseConfig): MaterialEstimate {
  const items: MaterialItem[] = [];
  let totalPGULenMM = 0;
  let totalPGCLenMM = 0;
  let totalExteriorAreaMM2 = 0;
  let totalInteriorAreaMM2 = 0;
  let totalBracingLenMM = 0;

  const BAR_LENGTH_M = 6;
  const PANEL_WIDTH_M = 1.2;
  const PANEL_HEIGHT_M = 2.4;
  const PANEL_AREA_M2 = PANEL_WIDTH_M * PANEL_HEIGHT_M; // 2.88 m2
  const PROFILE_FLANGE = 40; // 40mm para el ala del perfil

  config.walls.forEach(wall => {
    // --- 1. SOLERAS (PGU) ---
    const wallSolerasLinear = wall.length * 2;
    totalPGULenMM += wallSolerasLinear;

    // --- 2. MONTANTES (PGC) ---
    const studHeight = (wall.height - (PROFILE_FLANGE * 2));
    const baseStudCount = Math.ceil(wall.length / wall.studSpacing) + 1;
    let wallStuds = baseStudCount;

    // Refuerzos de encuentro
    wallStuds += 2; 

    // Estructura de Vanos (Aberturas)
    wall.openings.forEach(op => {
      wallStuds += 4; // 2 King + 2 Jack
      totalPGULenMM += op.width; // Dintel
      if (op.type === 'window') {
        totalPGULenMM += op.width; // Umbral
      }

      const crippleCount = Math.max(1, Math.floor(op.width / wall.studSpacing));
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const opTop = (sill + op.height);
      const upperCrippleH = Math.max(0, wall.height - opTop - PROFILE_FLANGE);
      const lowerCrippleH = sill > PROFILE_FLANGE ? (sill - PROFILE_FLANGE) : 0;
      
      totalPGCLenMM += (crippleCount * upperCrippleH);
      if (op.type === 'window' && lowerCrippleH > 0) {
        totalPGCLenMM += (crippleCount * lowerCrippleH);
      }
    });

    totalPGCLenMM += (wallStuds * studHeight);

    // --- 3. PANELES (ÁREAS NETAS) ---
    const wallArea = (wall.length * wall.height);
    let openingsArea = 0;
    wall.openings.forEach(op => {
      openingsArea += (op.width * op.height);
    });

    const netArea = Math.max(0, wallArea - openingsArea);
    totalExteriorAreaMM2 += netArea;
    totalInteriorAreaMM2 += netArea;

    // --- 4. CRUCES DE SAN ANDRÉS ---
    if (wall.length > 2000) {
      const diag = Math.sqrt(Math.pow(wall.length, 2) + Math.pow(wall.height, 2));
      totalBracingLenMM += (diag * 2);
    }
  });

  const totalPGULenM = totalPGULenMM / 1000;
  const totalPGCLenM = totalPGCLenMM / 1000;
  const totalExteriorAreaM2 = totalExteriorAreaMM2 / 1000000;
  const totalInteriorAreaM2 = totalInteriorAreaMM2 / 1000000;

  // --- GENERACIÓN DE ÍTEMS COMERCIALES ---

  // PGU (Soleras, Dinteles, Umbrales)
  items.push({
    name: 'Perfil PGU 100x0.9mm (Soleras)',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil(totalPGULenM / BAR_LENGTH_M),
    description: `Barras de 6m. Cálculo neto: ${totalPGULenM.toFixed(1)}m lineales.`
  });

  // PGC (Montantes, Refuerzos, Cripples)
  items.push({
    name: 'Perfil PGC 100x0.9mm (Montantes)',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil(totalPGCLenM / BAR_LENGTH_M),
    description: `Barras de 6m. Cálculo neto: ${totalPGCLenM.toFixed(1)}m lineales.`
  });

  // Placa OSB (Exterior)
  items.push({
    name: 'Placa OSB 12mm (Exterior)',
    category: 'paneles',
    unit: 'un',
    quantity: Math.ceil(totalExteriorAreaM2 / PANEL_AREA_M2),
    description: `Placas de 1.2x2.4m (2.88m²). Área neta total: ${totalExteriorAreaM2.toFixed(1)}m².`
  });

  // Placa de Yeso (Interior)
  items.push({
    name: 'Placa de Yeso 12.5mm (Interior)',
    category: 'paneles',
    unit: 'un',
    quantity: Math.ceil(totalInteriorAreaM2 / PANEL_AREA_M2),
    description: `Placas de 1.2x2.4m (2.88m²). Área neta total: ${totalInteriorAreaM2.toFixed(1)}m².`
  });

  items.push({
    name: 'Tornillo T1 - Mecha (Metal-Metal)',
    category: 'fijaciones',
    unit: 'un',
    quantity: Math.ceil((totalPGCLenM + totalPGULenM) * 15), 
    description: 'Estimación de 15 tornillos por metro lineal de perfil.'
  });

  items.push({
    name: 'Lana de Vidrio 100mm (Rollo)',
    category: 'aislacion',
    unit: 'm2',
    quantity: parseFloat(totalExteriorAreaM2.toFixed(2)),
    description: 'Aislamiento térmico entre montantes.'
  });

  items.push({
    name: 'Cinta de Acero (Strap)',
    category: 'perfileria',
    unit: 'm',
    quantity: parseFloat((totalBracingLenMM / 1000).toFixed(2)) as any,
    description: 'Cruces de San Andrés para rigidez lateral.'
  });

  // Peso estimado (aprox 1.2kg por metro de perfil galvanizado 100mm)
  const totalWeight = (totalPGCLenM + totalPGULenM) * 1.2;

  return {
    items,
    totalSteelWeightKg: Math.round(totalWeight)
  };
}
