import { SteelHouseConfig, MaterialEstimate, MaterialItem } from '@/lib/steel/types';
import { StructuralEngine } from './structuralEngine';

/**
 * Calculador de Materiales Industrial v8.0
 * Computo métrico completo: Estructura, Fijaciones, Aislaciones y Barreras.
 */
export function calculateSteelMaterials(config: SteelHouseConfig): MaterialEstimate {
  const items: MaterialItem[] = [];
  
  // Acumuladores de medidas
  let totalPGULenMM = 0;
  let totalPGCLenMM = 0;
  let totalTubeLenMM = 0;
  let totalBracingLenMM = 0;
  let totalNetAreaMM2 = 0;
  let totalGrossAreaMM2 = 0;
  let totalStudCount = 0;
  let totalPanelCount = 0;
  let totalOpeningPerimeterMM = 0;
  let totalWallLengthMM = 0;

  const BAR_LENGTH_M = 6;
  const PROFILE_FLANGE = 40; 
  const STEEL_WASTE = 1.15; // 15% desperdicio
  const PANEL_AREA_M2 = 1.2 * 2.4; 
  const PANEL_WASTE = 1.12; 

  config.walls.forEach(wall => {
    const panels = StructuralEngine.calculateWallPanels(wall, config);
    totalPanelCount += panels.length;
    totalWallLengthMM += wall.length;
    const studHeight = wall.height - (PROFILE_FLANGE * 2);

    panels.forEach(p => {
      // 1. SOLERAS (PGU)
      totalPGULenMM += (p.width * 2);

      // 2. MONTANTES (PGC)
      const startStuds = p.isWallStart ? 3 : 2;
      totalPGCLenMM += startStuds * studHeight;
      totalStudCount += startStuds;

      if (p.isWallEnd) {
        totalPGCLenMM += 3 * studHeight;
        totalStudCount += 3;
      }

      // Montantes de campo
      const totalStudPositions = Math.floor(p.width / wall.studSpacing);
      let fieldStuds = totalStudPositions;
      wall.openings.forEach(op => {
        if (op.position >= p.xStart && op.position < p.xEnd) {
          fieldStuds -= Math.floor(op.width / wall.studSpacing);
        }
      });
      const finalFieldStuds = Math.max(0, fieldStuds);
      totalPGCLenMM += finalFieldStuds * studHeight;
      totalStudCount += finalFieldStuds;

      // 3. RIGIDIZACIÓN
      if (p.needsBracing && config.layers.bracing) {
        const diagLen = Math.sqrt(p.width * p.width + wall.height * wall.height);
        totalBracingLenMM += diagLen * 2;
      }
    });

    // 4. VANOS
    wall.openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const headerH = sill + op.height;
      totalOpeningPerimeterMM += (op.width + op.height) * 2;
      const analysis = StructuralEngine.calculateHeader(op, config);

      // Refuerzos King/Jack
      totalPGCLenMM += (2 * studHeight * 2); 
      totalPGCLenMM += (2 * (headerH - PROFILE_FLANGE));
      totalStudCount += 6;

      if (analysis.type === 'truss') {
        totalPGCLenMM += op.width * 6;
      } else if (analysis.type === 'tube') {
        totalTubeLenMM += op.width;
      } else {
        const mult = analysis.type === 'triple' ? 3 : (analysis.type === 'double' ? 2 : 1);
        totalPGCLenMM += (op.width * mult);
      }

      if (op.type === 'window') totalPGULenMM += op.width;
    });

    // 5. BLOQUEOS
    if (config.layers.horizontalBlocking) {
      const blocks = StructuralEngine.calculateBlocking(wall);
      blocks.forEach(b => {
        totalPGULenMM += (b.xEnd - b.xStart);
      });
    }

    const wallArea = wall.length * wall.height;
    let openingsArea = 0;
    wall.openings.forEach(op => openingsArea += (op.width * op.height));
    totalGrossAreaMM2 += wallArea;
    totalNetAreaMM2 += Math.max(0, wallArea - openingsArea);
  });

  // --- CONVERSIÓN A ITEMS DE LISTADO ---

  // 1. ESTRUCTURA
  const totalPGULenM = (totalPGULenMM / 1000) * STEEL_WASTE;
  const totalPGCLenM = (totalPGCLenMM / 1000) * STEEL_WASTE;

  items.push({
    name: 'Perfil PGU 100x0.9mm',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil(totalPGULenM / BAR_LENGTH_M),
    description: `Soleras superior/inferior y bloqueos. Barras de 6m.`
  });

  items.push({
    name: 'Perfil PGC 100x0.9mm',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil(totalPGCLenM / BAR_LENGTH_M),
    description: `Montantes, dinteles y refuerzos. Barras de 6m.`
  });

  // 2. PANELES Y BARRERAS
  const netAreaM2 = totalNetAreaMM2 / 1000000;
  const grossAreaM2 = totalGrossAreaMM2 / 1000000;

  items.push({
    name: 'Placa OSB 12mm (Exterior)',
    category: 'paneles',
    unit: 'un',
    quantity: Math.ceil((netAreaM2 / PANEL_AREA_M2) * PANEL_WASTE),
    description: `Revestimiento estructural exterior.`
  });

  items.push({
    name: 'Placa Yeso 12.5mm (Interior)',
    category: 'paneles',
    unit: 'un',
    quantity: Math.ceil((netAreaM2 / PANEL_AREA_M2) * PANEL_WASTE),
    description: `Revestimiento interior estándar.`
  });

  items.push({
    name: 'Barrera de Agua y Viento (WRB)',
    category: 'aislacion',
    unit: 'm2',
    quantity: parseFloat((grossAreaM2 * 1.15).toFixed(1)),
    description: `Membrana hidrófuga tipo Tyvek con 15% solape.`
  });

  items.push({
    name: 'Lana de Vidrio 100mm',
    category: 'aislacion',
    unit: 'm2',
    quantity: parseFloat(netAreaM2.toFixed(1)),
    description: `Aislamiento termoacústico de cavidad.`
  });

  // 3. FIJACIONES
  // Metal-Metal: 4 tornillos por unión de montante + refuerzos
  const screwsT1 = (totalStudCount * 4) + (totalPanelCount * 20);
  items.push({
    name: 'Tornillo Autoperforante T1 (Metal-Metal)',
    category: 'fijaciones',
    unit: 'un',
    quantity: Math.ceil(screwsT1 * 1.1),
    description: `Cabeza lenteja punta aguja/broca.`
  });

  // Placa-Metal: 30 tornillos por placa aprox
  const osbSheets = (netAreaM2 / PANEL_AREA_M2) * PANEL_WASTE;
  const screwsT2 = Math.ceil(osbSheets * 35 * 2); // OSB + Yeso
  items.push({
    name: 'Tornillo T2 punta aguja (Placas)',
    category: 'fijaciones',
    unit: 'un',
    quantity: screwsT2,
    description: `Fijación de OSB y Yeso a perfiles.`
  });

  const anchors = Math.ceil(totalWallLengthMM / 600) + (totalPanelCount * 2);
  items.push({
    name: 'Anclaje Mecánico / Químico 3/8"',
    category: 'fijaciones',
    unit: 'un',
    quantity: anchors,
    description: `Fijación de solera inferior a platea.`
  });

  // 4. SELLOS Y EXTRAS
  items.push({
    name: 'Cinta Tramada / Papel',
    category: 'otros',
    unit: 'm',
    quantity: Math.ceil(osbSheets * 15),
    description: `Tratamiento de juntas entre placas.`
  });

  items.push({
    name: 'Masilla para Juntas',
    category: 'otros',
    unit: 'kg',
    quantity: Math.ceil(osbSheets * 1.8),
    description: `Tomado de juntas y tapado de tornillos.`
  });

  return {
    items,
    totalSteelWeightKg: Math.round((totalPGCLenM + totalPGULenM + (totalBracingLenMM / 1000)) * 1.25)
  };
}
