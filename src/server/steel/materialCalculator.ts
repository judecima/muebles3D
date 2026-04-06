
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
    const hStart = wall.heightStart || wall.height;
    const hEnd = wall.heightEnd || wall.height;
    const avgHeight = (hStart + hEnd) / 2;
    const studHeightAvg = avgHeight - 80;

    pgu100Len += wall.length; // Solera inferior
    pgu100Len += Math.hypot(wall.length, hEnd - hStart); // Solera superior inclinada
    
    totalConnections += (wall.length / wall.studSpacing) * 4;

    panels.forEach(p => {
      const studsInPanel = Math.ceil(p.width / wall.studSpacing) + 1;
      const reinforcementFactor = p.reinforcementFactor || 0;
      const totalStuds = Math.ceil(studsInPanel * (1 + reinforcementFactor));
      
      // Interpolación lineal de la suma de alturas: n * h_promedio
      const pHStart = hStart + (p.xStart / wall.length) * (hEnd - hStart);
      const pHEnd = hStart + (p.xEnd / wall.length) * (hEnd - hStart);
      const pAvgH = (pHStart + pHEnd) / 2;
      
      pgc100_090 += totalStuds * (pAvgH - 80);
      totalConnections += totalStuds * 4;
    });

    const blockings = StructuralEngine.calculateBlocking(wall);
    blockings.forEach(b => {
      pgu100Len += (b.xEnd - b.xStart);
      totalConnections += 2;
    });

    const junctions = StructuralEngine.findJunctions(wall, config);
    junctions.forEach((j) => {
      const currentH = hStart + (j.x / wall.length) * (hEnd - hStart);
      pgc100_090 += (currentH - 80);
      const ladders = StructuralEngine.calculateLadderBacking(currentH);
      ladders.forEach(l => {
        pgu100Len += (l.xEnd - l.xStart);
        totalConnections += 2;
      });
    });

    wall.openings.forEach(op => {
      const currentWallHeight = hStart + (op.position / wall.length) * (hEnd - hStart);
      const analysis = StructuralEngine.calculateHeader(op, wall.length, config, currentWallHeight, wall.studSpacing);
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const numKings = analysis.supports.kings || 1;
      const numJacks = analysis.supports.jacks || 1;
      
      // Interpolación de altura en el centro del vano para los King studs (simplificado)
      const hCenter = hStart + ((op.position + op.width/2) / wall.length) * (hEnd - hStart);
      
      // Sumar Refuerzos (Jacks y Kings perimetrales al vano)
      pgc100_090 += (numKings * 2) * (hCenter - 80); 
      
      const jackLen = (numJacks * 2) * (sill + op.height - 40); 
      const jackT = analysis.supports.jackThickness || 0.9;
      if (jackT > 1.2) pgc100_125 += jackLen;
      else pgc100_090 += jackLen;

      // Restar montantes reemplazados
      const studsToRemove = Math.floor(op.width / wall.studSpacing);
      pgc100_090 -= studsToRemove * (hCenter - 80);

      if (analysis.type === 'truss' && analysis.trussData) {
        const trussHeight = analysis.trussData.height;
        const numDiagonals = analysis.trussData.numDiagonals;
        const thickness = (analysis.trussData.chordProps as any).thickness || 0.9;
        const trussLen = (op.width * 2 + numDiagonals * trussHeight * 1.5) * 1.1; // Cordones + Diagonales + Desperdicio
        if (thickness <= 0.9) pgc100_090 += trussLen;
        else if (thickness <= 1.25) pgc100_125 += trussLen;
        else if (thickness <= 1.6) pgc100_160 += trussLen;
        else pgc100_200 += trussLen;
      } else {
        // Multiplicador según configuración (Single=1, Double=2, etc.)
        const levelMult = analysis.type === 'double' ? 2 : (analysis.type === 'triple' ? 3 : (analysis.type === 'tube' ? 4 : 1));
        const len = op.width * levelMult;
        
        // Asumir espesor 1.25 para refuerzos pesados si no se especifica
        if (analysis.type !== 'single') {
            pgc100_125 += len;
        } else {
            pgc100_090 += len;
        }
      }

      if (op.type === 'window') pgu100Len += op.width;
      
      // Sumar Cripples (Mochetas In-Line)
      const cripples = StructuralEngine.calculateCrippleStuds(wall, op, config);
      cripples.forEach(c => { pgc100_090 += (c.yEnd - c.yStart); totalConnections += 4; });
      
      totalConnections += 24; // Conexiones extra por refuerzos de vano
      areaExteriorNet -= (op.width * op.height) / 1000000;
    });

    totalAnchors += Math.ceil(wall.length / 600) + (panels.length * 2);
    const wallArea = (wall.length * avgHeight) / 1000000;
    areaExteriorGross += wallArea;
    areaExteriorNet += wallArea;
    areaInteriorTotal += wallArea;
  });

  // Procesar muros internos (Tabiquería)
  config.internalWalls.forEach(iw => {
    const hStart = iw.heightStart || iw.height;
    const hEnd = iw.heightEnd || iw.height;
    const avgHeight = (hStart + hEnd) / 2;

    pgu70Len += iw.length;
    pgu70Len += Math.hypot(iw.length, hEnd - hStart);

    const baseStudCount = Math.ceil(iw.length / 400) + 1;
    pgc70Len += baseStudCount * (avgHeight - 60);
    totalConnections += baseStudCount * 4;

    (iw.openings || []).forEach(op => {
      pgc70Len += 4 * (avgHeight - 60); 
      pgc70Len += op.width; 
      const cripples = StructuralEngine.calculateCrippleStuds(iw, op, config);
      cripples.forEach(c => { pgc70Len += (c.yEnd - c.yStart); totalConnections += 4; });
      totalConnections += 16;
      areaInternalWallsNet -= (op.width * op.height) / 1000000;
    });

    const wallArea = (iw.length * avgHeight) / 1000000;
    areaInternalWallsNet += wallArea;
    areaInteriorTotal += wallArea * 2;
  });

  if (config.roof?.enabled) {
    const trusses = StructuralEngine.calculateRoofTrusses(config);
    trusses.forEach(truss => {
      truss.elements.forEach((el: any) => {
        const len = Math.hypot(el.xEnd - el.xStart, el.yEnd - el.yStart);
        if (el.profile === 'PGU') pgu100Len += len;
        else pgc100_090 += len;
        totalConnections += 4;
      });
    });

    let roofArea = 0;
    const span = config.width + (config.roof.eaveLength || 0) * 2;
    const slopeRad = (config.roof.slope || 15) * Math.PI / 180;
    
    if (config.roof.type === 'one_slope') roofArea = Math.hypot(span, span * Math.tan(slopeRad)) * config.length;
    else if (config.roof.type === 'two_slope') roofArea = (Math.hypot(span / 2, (span / 2) * Math.tan(slopeRad)) * 2) * config.length;
    else roofArea = span * config.length;

    areaExteriorGross += roofArea / 1000000;
  }

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
