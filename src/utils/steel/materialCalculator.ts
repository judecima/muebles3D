import { SteelHouseConfig, MaterialEstimate, MaterialItem, SteelWall } from '@/lib/steel/types';

/**
 * Calculador de Materiales para Steel Framing v1.0
 * Basado en estándares de construcción en seco y la configuración del modelo 3D.
 */
export function calculateSteelMaterials(config: SteelHouseConfig): MaterialEstimate {
  const items: MaterialItem[] = [];
  let totalPGCLen = 0;
  let totalPGULen = 0;
  let totalExteriorArea = 0;
  let totalInteriorArea = 0;
  let totalBlockingLen = 0;
  let totalBracingLen = 0;

  config.walls.forEach(wall => {
    // 1. Soleras (PGU) - Superior e Inferior
    totalPGULen += (wall.length * 2) / 1000;

    // 2. Montantes (PGC)
    const profileFlange = 40;
    const studHeight = (wall.height - (profileFlange * 2)) / 1000;
    
    // Montantes estándar por modulación
    const baseStudCount = Math.floor(wall.length / wall.studSpacing) + 1;
    let wallStuds = baseStudCount;

    // Montantes de encuentro (Extremos - Dobles)
    wallStuds += 2; 

    // Estructura de Vanos
    wall.openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const opTop = (sill + op.height);
      
      // King Studs y Jack Studs (2 de cada uno por abertura)
      wallStuds += 4;

      // Dintel (PGU)
      totalPGULen += (op.width / 1000);
      
      // Umbral si es ventana (PGU)
      if (op.type === 'window') {
        totalPGULen += (op.width / 1000);
      }

      // Cripples (Ajuste sobre dintel y bajo umbral)
      const crippleCount = Math.floor(op.width / wall.studSpacing);
      const upperCrippleH = (wall.height - opTop) / 1000;
      const lowerCrippleH = sill / 1000;
      
      totalPGCLen += (crippleCount * upperCrippleH);
      if (op.type === 'window') {
        totalPGCLen += (crippleCount * lowerCrippleH);
      }
    });

    totalPGCLen += (wallStuds * studHeight);

    // 3. Paneles (Áreas)
    const wallArea = (wall.length * wall.height) / 1000000;
    let openingsArea = 0;
    wall.openings.forEach(op => {
      openingsArea += (op.width * op.height) / 1000000;
    });

    const netArea = wallArea - openingsArea;
    totalExteriorArea += netArea;
    totalInteriorArea += netArea;

    // 4. Blocking
    const blockingCount = wallStuds - 1;
    const avgGap = wall.studSpacing / 1000;
    totalBlockingLen += (blockingCount * avgGap);

    // 5. Bracing (Cruces de San Andrés)
    if (wall.length > 3000 || wall.height > 2500) {
      const diag = Math.sqrt(Math.pow(wall.length, 2) + Math.pow(wall.height, 2)) / 1000;
      totalBracingLen += (diag * 2); // X
    }
  });

  // Agregar Items al listado final
  items.push({
    name: 'Perfil PGC 100x0.9mm',
    category: 'perfileria',
    unit: 'm',
    quantity: Math.ceil(totalPGCLen * 1.05), // 5% desperdicio
    description: 'Montantes verticales, king studs y jack studs.'
  });

  items.push({
    name: 'Perfil PGU 100x0.9mm',
    category: 'perfileria',
    unit: 'm',
    quantity: Math.ceil(totalPGULen * 1.05),
    description: 'Soleras superiores e inferiores, dinteles y umbrales.'
  });

  items.push({
    name: 'Placa OSB 12mm (Exterior)',
    category: 'paneles',
    unit: 'm2',
    quantity: Math.ceil(totalExteriorArea * 1.1), // 10% desperdicio
    description: 'Revestimiento exterior estructural.'
  });

  items.push({
    name: 'Placa de Yeso 12.5mm (Interior)',
    category: 'paneles',
    unit: 'm2',
    quantity: Math.ceil(totalInteriorArea * 1.1),
    description: 'Revestimiento interior.'
  });

  items.push({
    name: 'Tornillo T1 - Mecha (Metal-Metal)',
    category: 'fijaciones',
    unit: 'un',
    quantity: Math.ceil((totalPGCLen + totalPGULen) * 12), // Estimación por metro lineal
    description: 'Fijación entre perfiles galvanizados.'
  });

  items.push({
    name: 'Tornillo T2 - Mecha (Placa-Metal)',
    category: 'fijaciones',
    unit: 'un',
    quantity: Math.ceil((totalExteriorArea + totalInteriorArea) * 35),
    description: 'Fijación de placas a montantes.'
  });

  items.push({
    name: 'Lana de Vidrio 100mm',
    category: 'aislacion',
    unit: 'm2',
    quantity: Math.ceil(totalExteriorArea),
    description: 'Aislamiento termoacústico para muros.'
  });

  items.push({
    name: 'Barrera de Agua y Viento (Tyvek)',
    category: 'aislacion',
    unit: 'm2',
    quantity: Math.ceil(totalExteriorArea * 1.15),
    description: 'Protección hidrófuga exterior.'
  });

  items.push({
    name: 'Cinta de Acero Galvanizado (Bracing)',
    category: 'perfileria',
    unit: 'm',
    quantity: Math.ceil(totalBracingLen),
    description: 'Cruces de San Andrés para rigidización.'
  });

  // Peso estimado (PGC/PGU aprox 1.2kg/m)
  const totalWeight = (totalPGCLen + totalPGULen) * 1.2;

  return {
    items,
    totalSteelWeightKg: Math.round(totalWeight)
  };
}
