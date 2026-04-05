
import { SteelHouseConfig, MaterialEstimate, MaterialItem } from '@/lib/steel/types';
import { StructuralEngine } from './structuralEngine';
import { FoundationEngine } from './foundationEngine';

export function calculateSteelMaterials(config: SteelHouseConfig): MaterialEstimate {
  const items: MaterialItem[] = [];
  let pgc100_090 = 0;
  let pgc100_125 = 0;
  let pgc100_160 = 0;
  let pgc100_200 = 0;
  let pgu100Len = 0;
  let pgc70Len = 0;
  let pgu70Len = 0;
  let areaExteriorNet = 0;
  let areaExteriorGross = 0;
  let areaInteriorTotal = 0;
  let areaInternalWallsNet = 0;
  let totalConnections = 0;
  let totalAnchors = 0;

  const BAR_LEN = 6000;
  const WASTE_STEEL = 1.10;
  const WASTE_BOARDS = 1.12;
  const BOARD_AREA = 2.88;

  function pushIfPositive(item: MaterialItem) {
    if (item.quantity > 0) items.push(item);
  }

  // Procesar muros perimetrales (Estructurales)
  config.walls.forEach(wall => {
    const panels = StructuralEngine.calculateWallPanels(wall, config);
    const studHeight = wall.height - 80;
    pgu100Len += wall.length * 2;
    totalConnections += (wall.length / wall.studSpacing) * 4;

    panels.forEach(p => {
      const studsInPanel = Math.ceil(p.width / wall.studSpacing) + 1;
      const reinforcementFactor = p.reinforcementFactor || 0;
      const totalStuds = Math.ceil(studsInPanel * (1 + reinforcementFactor));
      pgc100_090 += totalStuds * studHeight;
      totalConnections += totalStuds * 4;
    });

    const blockings = StructuralEngine.calculateBlocking(wall);
    blockings.forEach(b => {
      pgu100Len += (b.xEnd - b.xStart);
      totalConnections += 2;
    });

    const junctions = StructuralEngine.findJunctions(wall, config);
    junctions.forEach(() => {
      pgc100_090 += studHeight;
      const ladders = StructuralEngine.calculateLadderBacking(wall.height);
      ladders.forEach(l => {
        pgu100Len += (l.xEnd - l.xStart);
        totalConnections += 2;
      });
    });

    wall.openings.forEach(op => {
      const analysis = StructuralEngine.calculateHeader(op, wall.length, config, wall.height);
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const numKings = analysis.supports.kings || 1;
      const numJacks = analysis.supports.jacks || 1;
      
      pgc100_090 += (numKings + numJacks) * 2 * studHeight;
      pgc100_090 += 2 * (sill + op.height - 40);

      if (analysis.type === 'truss' && analysis.trussData) {
        const trussHeight = analysis.trussData.height;
        const numDiagonals = analysis.trussData.numDiagonals;
        const thickness = (analysis.trussData.chordProps as any).thickness || 0.9;
        const trussLen = op.width * 2 + numDiagonals * trussHeight * 1.5;
        if (thickness <= 1.25) pgc100_125 += trussLen;
        else if (thickness <= 1.6) pgc100_160 += trussLen;
        else pgc100_200 += trussLen;
      } else {
        pgc100_090 += op.width;
      }

      if (op.type === 'window') pgu100Len += op.width;
      const cripples = StructuralEngine.calculateCrippleStuds(wall, op, config);
      cripples.forEach(c => { pgc100_090 += (c.yEnd - c.yStart); totalConnections += 4; });
      totalConnections += 20;
      areaExteriorNet -= (op.width * op.height) / 1000000;
    });

    totalAnchors += Math.ceil(wall.length / 600) + (panels.length * 2);
    const wallArea = (wall.length * wall.height) / 1000000;
    areaExteriorGross += wallArea;
    areaExteriorNet += wallArea;
    areaInteriorTotal += wallArea;
  });

  // Procesar muros internos (Tabiquería)
  config.internalWalls.forEach(iw => {
    const studHeight = iw.height - 60;
    pgu70Len += iw.length * 2;
    const baseStudCount = Math.ceil(iw.length / 400) + 1;
    pgc70Len += baseStudCount * studHeight;
    totalConnections += baseStudCount * 4;

    (iw.openings || []).forEach(op => {
      pgc70Len += 4 * studHeight; 
      pgc70Len += op.width; 
      const cripples = StructuralEngine.calculateCrippleStuds(iw, op, config);
      cripples.forEach(c => { pgc70Len += (c.yEnd - c.yStart); totalConnections += 4; });
      totalConnections += 16;
      areaInternalWallsNet -= (op.width * op.height) / 1000000;
    });

    const wallArea = (iw.length * iw.height) / 1000000;
    areaInternalWallsNet += wallArea;
    areaInteriorTotal += wallArea * 2;
  });

  pushIfPositive({ name: 'Perfiles PGC 100x0.90mm (6m)', category: 'perfileria', unit: 'un', quantity: Math.ceil((pgc100_090 / BAR_LEN) * WASTE_STEEL), description: 'Montantes estructurales' });
  pushIfPositive({ name: 'Perfiles PGC 100x1.25mm (6m)', category: 'perfileria', unit: 'un', quantity: Math.ceil((pgc100_125 / BAR_LEN) * WASTE_STEEL), description: 'Cordones de vigas reticuladas' });
  pushIfPositive({ name: 'Perfiles PGC 100x1.60mm (6m)', category: 'perfileria', unit: 'un', quantity: Math.ceil((pgc100_160 / BAR_LEN) * WASTE_STEEL), description: 'Cordones reforzados de truss' });
  pushIfPositive({ name: 'Perfiles PGC 100x2.00mm (6m)', category: 'perfileria', unit: 'un', quantity: Math.ceil((pgc100_200 / BAR_LEN) * WASTE_STEEL), description: 'Cordones de truss de grandes luces' });
  pushIfPositive({ name: 'Perfiles PGU 100x0.90mm (6m)', category: 'perfileria', unit: 'un', quantity: Math.ceil((pgu100Len / BAR_LEN) * WASTE_STEEL), description: 'Soleras y bloqueos' });
  pushIfPositive({ name: 'Perfiles PGC 70x0.50mm (6m)', category: 'perfileria', unit: 'un', quantity: Math.ceil((pgc70Len / BAR_LEN) * WASTE_STEEL), description: 'Montantes interiores' });
  pushIfPositive({ name: 'Perfiles PGU 70x0.50mm (6m)', category: 'perfileria', unit: 'un', quantity: Math.ceil((pgu70Len / BAR_LEN) * WASTE_STEEL), description: 'Soleras interiores' });
  pushIfPositive({ name: 'Placas OSB 12mm (2.44x1.22m)', category: 'paneles', unit: 'un', quantity: Math.ceil((areaExteriorGross / BOARD_AREA) * WASTE_BOARDS), description: 'Diafragma estructural' });
  pushIfPositive({ name: 'Placas de Yeso 12.5mm', category: 'paneles', unit: 'un', quantity: Math.ceil((areaInteriorTotal / BOARD_AREA) * WASTE_BOARDS), description: 'Revestimiento interior' });
  pushIfPositive({ name: 'Tornillos T1 Punta Mecha', category: 'fijaciones', unit: 'un', quantity: Math.ceil(totalConnections * 1.1), description: 'Unión metal-metal' });
  pushIfPositive({ name: 'Tornillos T2 Punta Aguja', category: 'fijaciones', unit: 'un', quantity: Math.ceil(areaInteriorTotal * 25 + areaExteriorGross * 20), description: 'Fijación placas' });

  if (config.foundation) {
    const foundRes = FoundationEngine.calculateFoundation(config, { processedWalls: config.walls.map(w => ({ id: w.id, panels: StructuralEngine.calculateWallPanels(w, config) })) });
    pushIfPositive({ name: 'Hormigón Elaborado H-21', category: 'paneles', unit: 'm³', quantity: Math.ceil(foundRes.concreteVolumeM3 * 1.05), description: 'Platea y pilotones' });
    pushIfPositive({ name: 'Acero ADN-420 (Barras 10/12mm)', category: 'perfileria', unit: 'kg', quantity: Math.ceil(foundRes.steelWeightKg), description: 'Armadura de cimentación' });
  }

  const totalSteelWeight = Math.round((pgc100_090 + pgc100_125 + pgc100_160 + pgc100_200 + pgu100Len) * 1.25 / 1000 + (pgc70Len + pgu70Len) * 0.6 / 1000);
  return { items, totalSteelWeightKg: totalSteelWeight };
}
