import { SteelHouseConfig, MaterialEstimate, MaterialItem, SteelWall } from '@/lib/steel/types';

/**
 * Calculador de Materiales para Steel Framing v1.5
 * Optimizado para cálculo por UNIDAD COMERCIAL (Barra de 6 metros).
 * Garantiza cálculo lineal estricto de Soleras (PGU).
 */
export function calculateSteelMaterials(config: SteelHouseConfig): MaterialEstimate {
  const items: MaterialItem[] = [];
  let totalPGULenMM = 0;
  let totalPGCLenMM = 0;
  let totalExteriorAreaMM2 = 0;
  let totalInteriorAreaMM2 = 0;
  let totalBracingLenMM = 0;

  const BAR_LENGTH_M = 6;
  const PROFILE_FLANGE = 40; // 40mm para el ala del perfil

  config.walls.forEach(wall => {
    // --- 1. SOLERAS (PGU) ---
    // Cada pared tiene obligatoriamente una solera superior y una inferior.
    const wallSolerasLinear = wall.length * 2;
    totalPGULenMM += wallSolerasLinear;

    // --- 2. MONTANTES (PGC) ---
    const studHeight = (wall.height - (PROFILE_FLANGE * 2));
    
    // Montantes por modulación (PGC)
    // Usamos Math.ceil para asegurar que cubrimos todo el largo.
    const baseStudCount = Math.ceil(wall.length / wall.studSpacing) + 1;
    let wallStuds = baseStudCount;

    // Refuerzos de encuentro (PGC) - Se añaden 2 montantes extra para esquinas/uniones
    wallStuds += 2; 

    // Estructura de Vanos (Aberturas)
    wall.openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const opTop = (sill + op.height);
      
      // Refuerzos de vano: 2 King Studs y 2 Jack Studs (PGC)
      wallStuds += 4;

      // Dintel (PGU)
      totalPGULenMM += op.width;
      
      // Umbral (PGU) - Solo en ventanas
      if (op.type === 'window') {
        totalPGULenMM += op.width;
      }

      // Cripples (Montantes cortos PGC sobre dintel y bajo umbral)
      const crippleCount = Math.max(1, Math.floor(op.width / wall.studSpacing));
      const upperCrippleH = Math.max(0, wall.height - opTop - PROFILE_FLANGE);
      const lowerCrippleH = sill > PROFILE_FLANGE ? (sill - PROFILE_FLANGE) : 0;
      
      totalPGCLenMM += (crippleCount * upperCrippleH);
      if (op.type === 'window' && lowerCrippleH > 0) {
        totalPGCLenMM += (crippleCount * lowerCrippleH);
      }
    });

    // Sumar montantes principales a la longitud total de PGC
    totalPGCLenMM += (wallStuds * studHeight);

    // --- 3. PANELES (ÁREAS) ---
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
      totalBracingLenMM += (diag * 2); // Forma de X
    }
  });

  // Conversión a Metros Lineales
  const totalPGULenM = totalPGULenMM / 1000;
  const totalPGCLenM = totalPGCLenMM / 1000;
  const totalBracingLenM = totalBracingLenMM / 1000;
  const totalExteriorAreaM2 = totalExteriorAreaMM2 / 1000000;
  const totalInteriorAreaM2 = totalInteriorAreaMM2 / 1000000;

  // --- GENERACIÓN DE ÍTEMS COMERCIALES ---

  // PGU (Soleras, Dinteles, Umbrales)
  const pguWaste = 1.05; // 5% de desperdicio técnico
  const pguTotalM = totalPGULenM * pguWaste;
  const pguUnits = Math.ceil(pguTotalM / BAR_LENGTH_M);
  items.push({
    name: 'Perfil PGU 100x0.9mm (Soleras)',
    category: 'perfileria',
    unit: 'un',
    quantity: pguUnits,
    description: `Barras de 6m. Cálculo: ${totalPGULenM.toFixed(1)}m lin. + 5% desp.`
  });

  // PGC (Montantes, Refuerzos, Cripples)
  const pgcWaste = 1.08; // 8% de desperdicio técnico por cortes
  const pgcTotalM = totalPGCLenM * pgcWaste;
  const pgcUnits = Math.ceil(pgcTotalM / BAR_LENGTH_M);
  items.push({
    name: 'Perfil PGC 100x0.9mm (Montantes)',
    category: 'perfileria',
    unit: 'un',
    quantity: pgcUnits,
    description: `Barras de 6m. Cálculo: ${totalPGCLenM.toFixed(1)}m lin. + 8% desp.`
  });

  // Paneles y Otros
  items.push({
    name: 'Placa OSB 12mm (Exterior)',
    category: 'paneles',
    unit: 'm2',
    quantity: parseFloat((totalExteriorAreaM2 * 1.10).toFixed(2)),
    description: 'Área neta + 10% desperdicio por recortes.'
  });

  items.push({
    name: 'Placa de Yeso 12.5mm (Interior)',
    category: 'paneles',
    unit: 'm2',
    quantity: parseFloat((totalInteriorAreaM2 * 1.10).toFixed(2)),
    description: 'Revestimiento interior estándar.'
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
    quantity: parseFloat(totalBracingLenM.toFixed(2)),
    description: 'Cruces de San Andrés para rigidez lateral.'
  });

  // Peso estimado (aprox 1.2kg por metro de perfil galvanizado 100mm)
  const totalWeight = (totalPGCLenM + totalPGULenM) * 1.2;

  return {
    items,
    totalSteelWeightKg: Math.round(totalWeight)
  };
}
