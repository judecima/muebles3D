import { SteelHouseConfig, MaterialEstimate, MaterialItem, SteelWall, InternalWall } from '@/lib/steel/types';
import { StructuralEngine } from './structuralEngine';

/**
 * Motor de Cómputo Métrico Industrial ArquiMax v12.0
 * Basado en normas AISI S240 y estándares de obra reales.
 */
export function calculateSteelMaterials(config: SteelHouseConfig): MaterialEstimate {
  const items: MaterialItem[] = [];
  
  let pgc100Len = 0; 
  let pgu100Len = 0;
  let pgc70Len = 0;  
  let pgu70Len = 0;
  
  let areaExteriorNet = 0; 
  let areaExteriorGross = 0; 
  let areaInteriorTotal = 0; 
  
  let totalConnections = 0; 
  let totalAnchors = 0;     

  const BAR_LEN = 6000;
  const WASTE_STEEL = 1.10;
  const WASTE_BOARDS = 1.12;
  const BOARD_AREA = 2.88; 

  // --- 1. PROCESAMIENTO DE MUROS EXTERIORES (100mm) ---
  config.walls.forEach(wall => {
    const panels = StructuralEngine.calculateWallPanels(wall, config);
    const studHeight = wall.height - 80; 
    
    pgu100Len += wall.length * 2;
    totalConnections += (wall.length / wall.studSpacing) * 4;

    panels.forEach(p => {
      const studsInPanel = Math.ceil(p.width / wall.studSpacing) + 1;
      const structuralStuds = p.isWallStart || p.isWallEnd ? studsInPanel + 2 : studsInPanel; 
      pgc100Len += structuralStuds * studHeight;
      totalConnections += structuralStuds * 4;
    });

    const blockings = StructuralEngine.calculateBlocking(wall);
    pgu100Len += blockings.length * wall.studSpacing;
    totalConnections += blockings.length * 2;

    wall.openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const fusion = StructuralEngine.analyzeOpeningFusion(op, wall.length);
      
      // King studs (Solo si no hay fusión)
      if (fusion === 'none') {
        pgc100Len += 2 * studHeight;
      } else {
        pgc100Len += 1 * studHeight; // Comparte uno con la esquina
      }

      // Jack studs siempre existen
      pgc100Len += 2 * (sill + op.height - 40); 
      
      pgc100Len += op.width;       
      if (op.type === 'window') pgu100Len += op.width; 
      
      totalConnections += 16;
      
      const opArea = (op.width * op.height) / 1000000;
      areaExteriorNet -= opArea;
    });

    config.internalWalls.forEach(iw => {
      if (iw.parentWallId === wall.id) {
        pgc100Len += studHeight; // Backing stud
        totalConnections += 4;
      }
    });

    totalAnchors += Math.ceil(wall.length / 600) + (panels.length * 2);

    const wallArea = (wall.length * wall.height) / 1000000;
    areaExteriorGross += wallArea;
    areaExteriorNet += wallArea;
    areaInteriorTotal += wallArea; 
  });

  // --- 2. PROCESAMIENTO DE MUROS INTERNOS (70mm) ---
  config.internalWalls.forEach(iw => {
    const studHeight = iw.height - 60;
    pgu70Len += iw.length * 2; 
    
    const studCount = Math.ceil(iw.length / 400) + 1;
    pgc70Len += studCount * studHeight;
    totalConnections += studCount * 4;

    (iw.openings || []).forEach(op => {
      pgc70Len += 2 * studHeight; // Kings
      pgc70Len += op.width; // Header
      totalConnections += 12;
    });

    const wallArea = (iw.length * iw.height) / 1000000;
    areaInteriorTotal += (wallArea * 2); 
  });

  // --- 3. CONSOLIDACIÓN DE MATERIALES ---
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
    description: 'Membrana hidrófuga tipo Tyvek.'
  });

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

  return {
    items,
    totalSteelWeightKg: Math.round((pgc100Len + pgu100Len) * 1.25 / 1000 + (pgc70Len + pgu70Len) * 0.6 / 1000)
  };
}
