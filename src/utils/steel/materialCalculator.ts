import { SteelHouseConfig, MaterialEstimate, MaterialItem } from '@/lib/steel/types';
import { StructuralEngine } from './structuralEngine';

/**
 * Calculador de Materiales Industrial v8.5
 * Ajuste de cómputo PGU para pared de 6x6m (Regla de 10 barras).
 */
export function calculateSteelMaterials(config: SteelHouseConfig): MaterialEstimate {
  const items: MaterialItem[] = [];
  
  let totalPGULenMM = 0;
  let totalPGCLenMM = 0;
  let totalBracingLenMM = 0;
  let totalNetAreaMM2 = 0;
  let totalGrossAreaMM2 = 0;
  let totalStudCount = 0;
  let totalPanelCount = 0;
  let totalWallLengthMM = 0;

  const BAR_LENGTH_M = 6;
  const PROFILE_FLANGE = 40; 
  const STEEL_WASTE = 1.15; // 15% desperdicio (estándar argentino)
  const PANEL_AREA_M2 = 1.2 * 2.4; 
  const PANEL_WASTE = 1.12; 

  config.walls.forEach(wall => {
    const panels = StructuralEngine.calculateWallPanels(wall, config);
    totalPanelCount += panels.length;
    totalWallLengthMM += wall.length;
    const studHeight = wall.height - (PROFILE_FLANGE * 2);

    panels.forEach(p => {
      // 1. SOLERAS (PGU) - sup e inf
      totalPGULenMM += (p.width * 2);

      // 2. MONTANTES (PGC)
      const startStuds = p.isWallStart ? 3 : 2;
      totalPGCLenMM += startStuds * studHeight;
      totalStudCount += startStuds;

      if (p.isWallEnd) {
        totalPGCLenMM += 3 * studHeight;
        totalStudCount += 3;
      }

      const totalStudPositions = Math.floor(p.width / wall.studSpacing);
      let fieldStuds = totalStudPositions;
      wall.openings.forEach(op => {
        if (op.position >= p.xStart && op.position < p.xEnd) {
          fieldStuds -= Math.floor(op.width / wall.studSpacing);
        }
      });
      totalPGCLenMM += Math.max(0, fieldStuds) * studHeight;
      totalStudCount += Math.max(0, fieldStuds);

      // 3. RIGIDIZACIÓN (Ámbar)
      if (p.needsBracing && config.layers.bracing) {
        const diagLen = Math.sqrt(p.width * p.width + wall.height * wall.height);
        totalBracingLenMM += diagLen * 2;
      }
    });

    // 4. VANOS, DINTELES Y UMBRALES
    wall.openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const headerH = sill + op.height;
      const analysis = StructuralEngine.calculateHeader(op, config);

      // PGU para Dintel y Umbral
      totalPGULenMM += op.width; // Perfil sobre el vano
      if (op.type === 'window') totalPGULenMM += op.width; // Perfil bajo el vano

      // Refuerzos King/Jack
      totalPGCLenMM += (4 * studHeight); // King studs
      totalPGCLenMM += (2 * (headerH - PROFILE_FLANGE)); // Jack studs
      totalStudCount += 6;

      if (analysis.type === 'truss') {
        totalPGCLenMM += op.width * 6; // Estructura de viga
      } else {
        const mult = analysis.type === 'triple' ? 3 : (analysis.type === 'double' ? 2 : 1);
        totalPGCLenMM += (op.width * mult);
      }
    });

    // 5. BLOQUEOS (Verde)
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

  const totalPGULenM = (totalPGULenMM / 1000) * STEEL_WASTE;
  const totalPGCLenM = (totalPGCLenMM / 1000) * STEEL_WASTE;

  items.push({
    name: 'Perfil PGU 100x0.9mm',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil(totalPGULenM / BAR_LENGTH_M),
    description: `Soleras, bloqueos, dinteles y umbrales. Barras de 6m.`
  });

  items.push({
    name: 'Perfil PGC 100x0.9mm',
    category: 'perfileria',
    unit: 'un',
    quantity: Math.ceil(totalPGCLenM / BAR_LENGTH_M),
    description: `Montantes y refuerzos estructurales. Barras de 6m.`
  });

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
    description: `Membrana hidrófuga tipo Tyvek.`
  });

  items.push({
    name: 'Lana de Vidrio 100mm',
    category: 'aislacion',
    unit: 'm2',
    quantity: parseFloat(netAreaM2.toFixed(1)),
    description: `Aislamiento termoacústico.`
  });

  const screwsT1 = (totalStudCount * 4) + (totalPanelCount * 20);
  items.push({
    name: 'Tornillo Autoperforante T1',
    category: 'fijaciones',
    unit: 'un',
    quantity: Math.ceil(screwsT1 * 1.1),
    description: `Unión metal-metal.`
  });

  const osbSheets = (netAreaM2 / PANEL_AREA_M2) * PANEL_WASTE;
  items.push({
    name: 'Tornillo T2 punta aguja',
    category: 'fijaciones',
    unit: 'un',
    quantity: Math.ceil(osbSheets * 35 * 2),
    description: `Fijación de placas a perfiles.`
  });

  items.push({
    name: 'Anclaje Mecánico 3/8"',
    category: 'fijaciones',
    unit: 'un',
    quantity: Math.ceil(totalWallLengthMM / 600) + (totalPanelCount * 2),
    description: `Fijación a fundación.`
  });

  return {
    items,
    totalSteelWeightKg: Math.round((totalPGCLenM + totalPGULenM + (totalBracingLenMM / 1000)) * 1.25)
  };
}
