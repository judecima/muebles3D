import { SteelHouseConfig, MaterialEstimate, MaterialItem, SteelWall, InternalWall } from '@/lib/steel/types';
import { StructuralEngine } from './structuralEngine';

/**
 * Motor de Cómputo Métrico Industrial ArquiMax v12.0
 * Basado en normas AISI S240 y estándares de obra reales.
 */
export function calculateSteelMaterials(config: SteelHouseConfig): MaterialEstimate {
  const items: MaterialItem[] = [];
  
  // Acumuladores de longitudes y áreas
  let pgc100Len = 0; // Perfilería estructural
  let pgu100Len = 0;
  let pgc70Len = 0;  // Perfilería drywall
  let pgu70Len = 0;
  
  let areaExteriorNet = 0; // Para aislación
  let areaExteriorGross = 0; // Para barreras
  let areaInteriorTotal = 0; // Para placas de yeso (Drywall)
  
  let totalConnections = 0; // Para tornillos T1
  let totalAnchors = 0;     // Para anclajes a fundación

  const BAR_LEN = 6000;
  const WASTE_STEEL = 1.10;
  const WASTE_BOARDS = 1.12;
  const BOARD_AREA = 2.88; // 2.4 x 1.2m

  // --- 1. PROCESAMIENTO DE MUROS EXTERIORES (100mm) ---
  config.walls.forEach(wall => {
    const panels = StructuralEngine.calculateWallPanels(wall, config);
    const studHeight = wall.height - 80; // Altura neta de montante
    
    // Soleras superior e inferior
    pgu100Len += wall.length * 2;
    totalConnections += (wall.length / wall.studSpacing) * 4;

    panels.forEach(p => {
      // Montantes de panel (Modulación + Extremos)
      const studsInPanel = Math.ceil(p.width / wall.studSpacing) + 1;
      const structuralStuds = p.isWallStart || p.isWallEnd ? studsInPanel + 2 : studsInPanel; // Triple stud en esquinas
      pgc100Len += structuralStuds * studHeight;
      totalConnections += structuralStuds * 4;
    });

    // Bloqueos horizontales
    const blockings = StructuralEngine.calculateBlocking(wall);
    pgu100Len += blockings.length * wall.studSpacing;
    totalConnections += blockings.length * 2;

    // Aberturas (Dinteles, King, Jack)
    wall.openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const headerH = sill + op.height;
      
      pgc100Len += 4 * studHeight; // 2 King + 2 Jack (simplificado)
      pgc100Len += op.width;       // Dintel PGC
      if (op.type === 'window') pgu100Len += op.width; // Umbral PGU
      
      totalConnections += 16; // Conexiones por vano
      
      const opArea = (op.width * op.height) / 1000000;
      areaExteriorNet -= opArea;
    });

    // Anclajes (1 cada 60cm + extremos de panel)
    totalAnchors += Math.ceil(wall.length / 600) + (panels.length * 2);

    const wallArea = (wall.length * wall.height) / 1000000;
    areaExteriorGross += wallArea;
    areaExteriorNet += wallArea;
    areaInteriorTotal += wallArea; // Una cara interior
  });

  // --- 2. PROCESAMIENTO DE MUROS INTERNOS (70mm) ---
  config.internalWalls.forEach(iw => {
    const studHeight = iw.height - 60;
    pgu70Len += iw.length * 2; // Soleras
    
    const studCount = Math.ceil(iw.length / 400) + 1;
    pgc70Len += studCount * studHeight;
    totalConnections += studCount * 4;

    // Aberturas internas
    (iw.openings || []).forEach(op => {
      pgc70Len += 4 * studHeight;
      pgc70Len += op.width;
      totalConnections += 12;
    });

    const wallArea = (iw.length * iw.height) / 1000000;
    areaInteriorTotal += (wallArea * 2); // Dos caras para tabiques
  });

  // --- 3. CONSOLIDACIÓN DE MATERIALES ---

  // ESTRUCTURA
  items.push({
    name: 'Perfiles PGC 100x0.90mm (6m)',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil((pgc100Len / BAR_LEN) * WASTE_STEEL),
    description: 'Montantes estructurales, King studs y dinteles.'
  });
  items.push({
    name: 'Perfiles PGU 100x0.90mm (6m)',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil((pgu100Len / BAR_LEN) * WASTE_STEEL),
    description: 'Soleras superior/inferior y bloqueos.'
  });
  if (pgc70Len > 0) {
    items.push({
      name: 'Perfiles PGC 70x0.50mm (6m)',
      category: 'perfileria',
      unit: 'un',
      quantity: Math.ceil((pgc70Len / BAR_LEN) * WASTE_STEEL),
      description: 'Montantes para tabiquería interna Drywall.'
    });
    items.push({
      name: 'Perfiles PGU 70x0.50mm (6m)',
      category: 'perfileria',
      unit: 'un',
      quantity: Math.ceil((pgu70Len / BAR_LEN) * WASTE_STEEL),
      description: 'Soleras para tabiquería interna Drywall.'
    });
  }

  // PANELES Y CERRAMIENTOS
  items.push({
    name: 'Placas OSB 12mm (2.44x1.22m)',
    category: 'paneles',
    unit: 'un',
    quantity: Math.ceil((areaExteriorGross / BOARD_AREA) * WASTE_BOARDS),
    description: 'Diafragma de rigidización exterior.'
  });
  items.push({
    name: 'Placas de Yeso 12.5mm (2.40x1.20m)',
    category: 'paneles',
    unit: 'un',
    quantity: Math.ceil((areaInteriorTotal / BOARD_AREA) * WASTE_BOARDS),
    description: 'Revestimiento interior (muros y tabiques).'
  });

  // AISLACIONES Y BARRERAS
  items.push({
    name: 'Lana de Vidrio 50mm con Foil',
    category: 'aislacion',
    unit: 'm²',
    quantity: Math.ceil(areaExteriorNet * 1.05),
    description: 'Aislación termoacústica (Área neta).'
  });
  items.push({
    name: 'Barrera de Agua y Viento (WRB)',
    category: 'aislacion',
    unit: 'm²',
    quantity: Math.ceil(areaExteriorGross * 1.15),
    description: 'Membrana hidrófuga tipo Tyvek (incluye solapes).'
  });

  // FIJACIONES Y ANCLAJES
  items.push({
    name: 'Tornillos T1 Punta Mecha',
    category: 'fijaciones',
    unit: 'un',
    quantity: Math.ceil(totalConnections * 1.1),
    description: 'Unión estructural metal-metal.'
  });
  items.push({
    name: 'Tornillos T2 Punta Aguja/Mecha',
    category: 'fijaciones',
    unit: 'un',
    quantity: Math.ceil(areaInteriorTotal * 25 + areaExteriorGross * 20),
    description: 'Fijación de placas a perfiles.'
  });
  items.push({
    name: 'Anclajes Expansivos 3/8" x 3 3/4"',
    category: 'fijaciones',
    unit: 'un',
    quantity: totalAnchors,
    description: 'Anclaje de solera inferior a platea.'
  });

  // TERMINACIONES
  items.push({
    name: 'Masilla para Juntas (Balde 32kg)',
    category: 'otros',
    unit: 'un',
    quantity: Math.ceil(areaInteriorTotal / 30),
    description: 'Tratamiento de juntas en seco.'
  });
  items.push({
    name: 'Cinta de Papel Microperforada (75m)',
    category: 'otros',
    unit: 'un',
    quantity: Math.ceil(areaInteriorTotal / 25),
    description: 'Refuerzo de juntas entre placas.'
  });

  return {
    items,
    totalSteelWeightKg: Math.round((pgc100Len + pgu100Len) * 1.25 / 1000 + (pgc70Len + pgu70Len) * 0.6 / 1000)
  };
}
