import { SteelHouseConfig, MaterialEstimate, MaterialItem, SteelWall } from '@/lib/steel/types';

/**
 * Calculador de Materiales para Steel Framing v1.1
 * Basado en estándares de construcción en seco y la configuración del modelo 3D.
 * Optimizado para cálculo lineal estricto de soleras y montantes.
 */
export function calculateSteelMaterials(config: SteelHouseConfig): MaterialEstimate {
  const items: MaterialItem[] = [];
  let totalPGCLenMM = 0;
  let totalPGULenMM = 0;
  let totalExteriorAreaMM2 = 0;
  let totalInteriorAreaMM2 = 0;
  let totalBracingLenMM = 0;

  config.walls.forEach(wall => {
    // 1. Soleras (PGU) - Superior e Inferior (Cálculo Lineal Estricto)
    // 2 soleras por muro: una base y una de cierre superior.
    totalPGULenMM += (wall.length * 2);

    // 2. Montantes (PGC)
    const profileFlange = 40;
    const studHeight = (wall.height - (profileFlange * 2));
    
    // Montantes estándar por modulación
    const baseStudCount = Math.floor(wall.length / wall.studSpacing) + 1;
    let wallStuds = baseStudCount;

    // Montantes de encuentro (Extremos - Dobles para rigidez)
    wallStuds += 2; 

    // Estructura de Vanos (Aberturas)
    wall.openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const opTop = (sill + op.height);
      
      // Refuerzos de vano: 2 King Studs y 2 Jack Studs por abertura
      wallStuds += 4;

      // Dintel (PGU) - Suma lineal
      totalPGULenMM += op.width;
      
      // Umbral si es ventana (PGU) - Suma lineal
      if (op.type === 'window') {
        totalPGULenMM += op.width;
      }

      // Cripples (Montantes de ajuste sobre dintel y bajo umbral)
      const crippleCount = Math.max(1, Math.floor(op.width / wall.studSpacing));
      const upperCrippleH = Math.max(0, wall.height - opTop - profileFlange);
      const lowerCrippleH = sill > 0 ? (sill - profileFlange) : 0;
      
      totalPGCLenMM += (crippleCount * upperCrippleH);
      if (op.type === 'window') {
        totalPGCLenMM += (crippleCount * lowerCrippleH);
      }
    });

    // Sumar montantes principales del muro
    totalPGCLenMM += (wallStuds * studHeight);

    // 3. Paneles (Áreas Netas)
    const wallArea = (wall.length * wall.height);
    let openingsArea = 0;
    wall.openings.forEach(op => {
      openingsArea += (op.width * op.height);
    });

    const netArea = wallArea - openingsArea;
    totalExteriorAreaMM2 += netArea;
    totalInteriorAreaMM2 += netArea;

    // 4. Bracing (Cruces de San Andrés para estabilidad lateral)
    if (wall.length > 2000) {
      const diag = Math.sqrt(Math.pow(wall.length, 2) + Math.pow(wall.height, 2));
      totalBracingLenMM += (diag * 2); // Forma de X
    }
  });

  // Convertir de mm a metros
  const totalPGULenM = totalPGULenMM / 1000;
  const totalPGCLenM = totalPGCLenMM / 1000;
  const totalBracingLenM = totalBracingLenMM / 1000;
  const totalExteriorAreaM2 = totalExteriorAreaMM2 / 1000000;
  const totalInteriorAreaM2 = totalInteriorAreaMM2 / 1000000;

  // Agregar Items al listado final con factor de desperdicio comercial (5-10%)
  
  const pguWaste = 1.05;
  const pguFinalM = totalPGULenM * pguWaste;
  items.push({
    name: 'Perfil PGU 100x0.9mm (Soleras)',
    category: 'perfileria',
    unit: 'm',
    quantity: parseFloat(pguFinalM.toFixed(2)),
    description: `Incluye soleras sup/inf y vanos. Estimado: ${Math.ceil(pguFinalM / 6)} barras de 6m.`
  });

  const pgcWaste = 1.08;
  const pgcFinalM = totalPGCLenM * pgcWaste;
  items.push({
    name: 'Perfil PGC 100x0.9mm (Montantes)',
    category: 'perfileria',
    unit: 'm',
    quantity: parseFloat(pgcFinalM.toFixed(2)),
    description: `Montantes estructurales y refuerzos. Estimado: ${Math.ceil(pgcFinalM / 6)} barras de 6m.`
  });

  items.push({
    name: 'Placa OSB 12mm (Exterior)',
    category: 'paneles',
    unit: 'm2',
    quantity: parseFloat((totalExteriorAreaM2 * 1.10).toFixed(2)), // 10% desperdicio placas
    description: 'Revestimiento exterior estructural.'
  });

  items.push({
    name: 'Placa de Yeso 12.5mm (Interior)',
    category: 'paneles',
    unit: 'm2',
    quantity: parseFloat((totalInteriorAreaM2 * 1.10).toFixed(2)),
    description: 'Revestimiento interior para locales secos.'
  });

  items.push({
    name: 'Tornillo T1 - Mecha (Metal-Metal)',
    category: 'fijaciones',
    unit: 'un',
    quantity: Math.ceil((totalPGCLenM + totalPGULenM) * 15), 
    description: 'Fijación de estructura galvanizada.'
  });

  items.push({
    name: 'Lana de Vidrio 100mm (Rollo)',
    category: 'aislacion',
    unit: 'm2',
    quantity: parseFloat(totalExteriorAreaM2.toFixed(2)),
    description: 'Aislamiento termoacústico para el alma de los muros.'
  });

  items.push({
    name: 'Cinta de Acero (Strap)',
    category: 'perfileria',
    unit: 'm',
    quantity: parseFloat(totalBracingLenM.toFixed(2)),
    description: 'Rigidización lateral mediante cruces de San Andrés.'
  });

  // Peso estimado (PGC/PGU aprox 1.2kg/m)
  const totalWeight = (totalPGCLenM + totalPGULenM) * 1.2;

  return {
    items,
    totalSteelWeightKg: Math.round(totalWeight)
  };
}
