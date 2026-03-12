import { SteelHouseConfig, MaterialEstimate, MaterialItem } from '../../../lib/steel/types';
import { StructuralEngine } from './structuralEngine';

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
    blockings.forEach(b => {
      pgu100Len += (b.xEnd - b.xStart);
      totalConnections += 2;
    });

    wall.openings.forEach(op => {
      const analysis = StructuralEngine.calculateHeader(op, wall.length, config, wall.height);
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const fusion = StructuralEngine.analyzeOpeningFusion(op, wall.length);
      
      const numKings = analysis.type === 'truss' ? 3 : 1;
      if (fusion === 'none') {
        pgc100Len += numKings * 2 * studHeight; 
      } else {
        pgc100Len += numKings * 1 * studHeight; 
      }

      pgc100Len += 2 * (sill + op.height - 40); 

      if (analysis.type === 'truss') {
        pgc100Len += op.width * 2; 
        const numDiagonals = Math.ceil(op.width / 400);
        pgc100Len += numDiagonals * (analysis.trussData?.height || 400) * 1.5; 
      } else {
        pgc100Len += op.width; 
      }

      if (op.type === 'window') pgu100Len += op.width; 
      
      const cripples = StructuralEngine.calculateCrippleStuds(wall, op, config);
      cripples.forEach(c => {
        pgc100Len += (c.yEnd - c.yStart);
        totalConnections += 4;
      });

      totalConnections += 20;
      areaExteriorNet -= (op.width * op.height) / 1000000;
    });

    totalAnchors += Math.ceil(wall.length / 600) + (panels.length * 2);
    const wallArea = (wall.length * wall.height) / 1000000;
    areaExteriorGross += wallArea;
    areaExteriorNet += wallArea;
    areaInteriorTotal += wallArea; 
  });

  config.internalWalls.forEach(iw => {
    const studHeight = iw.height - 60;
    pgu70Len += iw.length * 2; 
    
    const studCount = Math.ceil(iw.length / 400) + 1;
    pgc70Len += studCount * studHeight;
    totalConnections += studCount * 4;

    (iw.openings || []).forEach(op => {
      pgc70Len += 2 * studHeight; 
      pgc70Len += op.width; 
      const cripples = StructuralEngine.calculateCrippleStuds(iw, op, config);
      cripples.forEach(c => {
        pgc70Len += (c.yEnd - c.yStart);
        totalConnections += 4;
      });
      totalConnections += 16;
    });

    const wallArea = (iw.length * iw.height) / 1000000;
    areaInteriorTotal += (wallArea * 2); 
  });

  items.push({
    name: 'Perfiles PGC 100x0.90mm (6m)',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil((pgc100Len / BAR_LEN) * WASTE_STEEL),
    description: 'Montantes estructurales y Kings reforzados.'
  });
  items.push({
    name: 'Perfiles PGU 100x0.90mm (6m)',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil((pgu100Len / BAR_LEN) * WASTE_STEEL),
    description: 'Soleras y bloqueos de refuerzo.'
  });
  if (pgc70Len > 0) {
    items.push({
      name: 'Perfiles PGC 70x0.50mm (6m)',
      category: 'perfileria',
      unit: 'un',
      quantity: Math.ceil((pgc70Len / BAR_LEN) * WASTE_STEEL),
      description: 'Montantes Drywall.'
    });
    items.push({
      name: 'Perfiles PGU 70x0.50mm (6m)',
      category: 'perfileria',
      unit: 'un',
      quantity: Math.ceil((pgu70Len / BAR_LEN) * WASTE_STEEL),
      description: 'Soleras Drywall.'
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
    description: 'Revestimiento interior.'
  });

  items.push({
    name: 'Lana de Vidrio 50mm con Foil',
    category: 'aislacion',
    unit: 'm²',
    quantity: Math.ceil(areaExteriorNet * 1.05),
    description: 'Aislación termoacústica.'
  });

  items.push({
    name: 'Tornillos T1 Punta Mecha',
    category: 'fijaciones',
    unit: 'un',
    quantity: Math.ceil(totalConnections * 1.1),
    description: 'Unión estructural metal-metal.'
  });

  return {
    items,
    totalSteelWeightKg: Math.round((pgc100Len + pgu100Len) * 1.25 / 1000 + (pgc70Len + pgu70Len) * 0.6 / 1000)
  };
}
