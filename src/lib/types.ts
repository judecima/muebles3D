export type FurnitureType = 
  | 'bajoMesada' 
  | 'rackTV' 
  | 'escritorio' 
  | 'alacena' 
  | 'placard' 
  | 'biblioteca' 
  | 'alacenaFlip' 
  | 'bajomesada-cajonera' 
  | 'porta-anafe'
  | 'cabinet_base_120_2p3c'
  | 'cabinet_base_140_3p3c'
  | 'cabinet_wall_60_1p'
  | 'cabinet_wall_120_3p'
  | 'cabinet_wall_140_3p'
  | 'cabinet_pantry_60_2p'
  | 'cabinet_microwave_60'
  | 'cabinet_hood_60'
  | 'cabinet_base_single_60_1p'
  | 'cabinet_base_double_80_2p'
  | 'cabinet_base_3p'
  | 'cabinet_wall_3p';

export type FurnitureColor = 'blanco' | 'gris_claro' | 'grafito' | 'roble_claro' | 'nogal' | 'negro';
export type GrainDirection = 'vertical' | 'horizontal' | 'libre';

export const COLOR_PALETTE: Record<FurnitureColor, string> = {
  blanco: '#FFFFFF',
  gris_claro: '#D9D9D9',
  grafito: '#3A3A3A',
  roble_claro: '#D2B48C',
  nogal: '#7A5230',
  negro: '#1F1F1F'
};

export interface Part {
  id: string;
  groupId?: string; 
  name: string;
  width: number;  
  height: number; 
  depth: number;  
  x: number;
  y: number;
  z: number;
  type: 'static' | 'door-left' | 'door-right' | 'door-flip' | 'drawer' | 'hardware' | 'piston-body' | 'piston-rod';
  pivot?: { x: number; y: number; z: number };
  isHardware?: boolean;
  
  cutLargo: number;
  cutAncho: number;
  cutEspesor: number;
  grainDirection: GrainDirection;
  hingeCount?: number;
  pistonConfig?: {
    side: 'left' | 'right';
    anchorMueble: { x: number; y: number; z: number };
    anchorPuertaLocal: { x: number; y: number; z: number };
    doorId: string;
    lengthClosed: number;
    lengthOpen: number;
  };
}

export interface FurnitureDimensions {
  width: number;
  height: number;
  depth: number;
  thickness: number;
  hasBack?: boolean; 
  hasShelf?: boolean;
  hasShelf2?: boolean; 
}

export interface FurnitureModel {
  parts: Part[];
  summary: string;
  hasDoors: boolean;
  hasDrawers: boolean;
}

export interface PanelSize {
  id: string;
  width: number;
  height: number;
  thickness: number;
  name: string;
  idEmpresa: number;
  idTextura: number;
  hasGrain: boolean;
}

export const AVAILABLE_PANELS: PanelSize[] = [
  { id: '140113', idEmpresa: 110, idTextura: 12450, name: 'AGLO FAPLAC BLEND AMARANTO 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140114', idEmpresa: 110, idTextura: 21248, name: 'MDF FAPLAC FONDO CLASICO CEDRO 3MM', width: 2600, height: 1830, thickness: 3, hasGrain: true },
  { id: '140115', idEmpresa: 110, idTextura: 21291, name: 'MDF FAPLAC LISO GRAFITO 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: false },
  { id: '140116', idEmpresa: 110, idTextura: 21289, name: 'MDF FAPLAC LISO GRIS HUMO 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: false },
  { id: '140117', idEmpresa: 110, idTextura: 21287, name: 'MDF FAPLAC LISO LITIO 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: false },
  { id: '140118', idEmpresa: 110, idTextura: 21290, name: 'MDF FAPLAC LISO NEGRO PROFUNDO 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: false },
  { id: '140119', idEmpresa: 110, idTextura: 21311, name: 'MDF FAPLAC LISO ROJO 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: false },
  { id: '140120', idEmpresa: 110, idTextura: -1, name: 'MDF FAPLAC LISO TITANIO 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: false },
  { id: '140121', idEmpresa: 110, idTextura: -1, name: 'MDF FAPLAC LISO VERDE 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: false },
  { id: '140122', idEmpresa: 110, idTextura: 21262, name: 'MDF FAPLAC NATURE CAJÚ 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140123', idEmpresa: 110, idTextura: -1, name: 'MDF FAPLAC NATURE CARVALHO ASERRADO 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140124', idEmpresa: 110, idTextura: 21259, name: 'MDF FAPLAC NATURE CARVALHO MEZZO 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140125', idEmpresa: 110, idTextura: 21251, name: 'MDF FAPLAC FONDO CLASICO EBANO NEGRO 3MM', width: 2600, height: 1830, thickness: 3, hasGrain: true },
  { id: '140126', idEmpresa: 110, idTextura: 21261, name: 'MDF FAPLAC NATURE GAUDI 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140127', idEmpresa: 110, idTextura: 21312, name: 'MDF FAPLAC NATURE LINOSA CINZA 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140128', idEmpresa: 110, idTextura: 21260, name: 'MDF FAPLAC NATURE MONT BLANC 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140129', idEmpresa: 110, idTextura: 21258, name: 'MDF FAPLAC NATURE NOCCE MILANO 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140130', idEmpresa: 110, idTextura: 21254, name: 'MDF FAPLAC NATURE NOGAL TERRACOTA 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140131', idEmpresa: 110, idTextura: 21269, name: 'MDF FAPLAC NATURE PRAGA 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140132', idEmpresa: 110, idTextura: 21255, name: 'MDF FAPLAC NATURE TEKA ARTICO 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140133', idEmpresa: 110, idTextura: 21313, name: 'MDF FAPLAC NATURE TERRARUM 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140134', idEmpresa: 110, idTextura: 21256, name: 'MDF FAPLAC NATURE VENEZIA 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140135', idEmpresa: 110, idTextura: 21286, name: 'MDF FAPLAC NORDICO BALTICO 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140136', idEmpresa: 110, idTextura: 21252, name: 'MDF FAPLAC FONDO CLASICO ROBLE AMERICANO 3MM', width: 2600, height: 1830, thickness: 3, hasGrain: true },
  { id: '140137', idEmpresa: 110, idTextura: 21285, name: 'MDF FAPLAC NORDICO HELSINKI 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140138', idEmpresa: 110, idTextura: 21283, name: 'MDF FAPLAC NORDICO OLMO FINLANDES 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140139', idEmpresa: 110, idTextura: 21284, name: 'MDF FAPLAC NORDICO ROBLE ESCANDINAVO 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140140', idEmpresa: 110, idTextura: 21282, name: 'MDF FAPLAC NORDICO TEKA OSLO 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140141', idEmpresa: 110, idTextura: 21267, name: 'MDF FAPLAC URBAN STREET 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: false },
  { id: '140142', idEmpresa: 110, idTextura: 21264, name: 'MDF FAPLAC URBAN AMBERES 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: false },
  { id: '140143', idEmpresa: 110, idTextura: 21263, name: 'MDF FAPLAC URBAN COLISEO 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: false },
  { id: '140144', idEmpresa: 110, idTextura: 21265, name: 'MDF FAPLAC URBAN HOME 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: false },
  { id: '140145', idEmpresa: 110, idTextura: 21266, name: 'MDF FAPLAC URBAN MOSCÚ 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '140146', idEmpresa: 110, idTextura: 21268, name: 'MDF FAPLAC URBAN VIENA 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: false },
  { id: '140147', idEmpresa: 110, idTextura: 21253, name: 'MDF FAPLAC FONDO CLASICO ROBLE DAKAR 3MM', width: 2600, height: 1830, thickness: 3, hasGrain: true },
  { id: '140148', idEmpresa: 110, idTextura: -1, name: 'MDF FAPLAC FONDO CLASICO ROBLE ESPAÑOL 3MM', width: 2600, height: 1830, thickness: 3, hasGrain: true },
  { id: '140149', idEmpresa: 110, idTextura: 21290, name: 'MDF FAPLAC FONDO LISO 3MM NEGRO', width: 2600, height: 1830, thickness: 3, hasGrain: false },
  { id: '140150', idEmpresa: 110, idTextura: 21292, name: 'MDF FAPLAC FONDO LISO ALMENDRA 3MM', width: 2600, height: 1830, thickness: 3, hasGrain: false },
  { id: '140151', idEmpresa: 110, idTextura: 21293, name: 'MDF FAPLAC FONDO LISO CENIZA 3MM', width: 2600, height: 1830, thickness: 3, hasGrain: false },
  { id: '140152', idEmpresa: 110, idTextura: 21291, name: 'MDF FAPLAC FONDO LISO GRAFITO 3MM', width: 2600, height: 1830, thickness: 3, hasGrain: false },
  { id: '140153', idEmpresa: 110, idTextura: 21288, name: 'MDF FAPLAC BLANCO 12MM TUNDRA', width: 2750, height: 1830, thickness: 12, hasGrain: false },
  { id: '140154', idEmpresa: 110, idTextura: 12451, name: 'AGLO FAPLAC CLASICO HAYA 15MM', width: 2750, height: 1830, thickness: 15, hasGrain: true },
  { id: '140155', idEmpresa: 110, idTextura: -1, name: 'MDF FAPLAC BLANCO 12MM', width: 2750, height: 1830, thickness: 12, hasGrain: false },
  { id: '140156', idEmpresa: 110, idTextura: 21288, name: 'MDF FAPLAC BLANCO 15MM TUNDRA', width: 2750, height: 1830, thickness: 15, hasGrain: false },
  { id: '140157', idEmpresa: 110, idTextura: -1, name: 'MDF FAPLAC BLANCO 15MM', width: 2750, height: 1830, thickness: 15, hasGrain: false },
  { id: '140158', idEmpresa: 110, idTextura: -1, name: 'LAMINADO COMPACTO EGGER BLANCO ALPINO SOLIDO 13MM', width: 2790, height: 2060, thickness: 13, hasGrain: false },
  { id: '140159', idEmpresa: 110, idTextura: 12456, name: 'LAMINADO COMPACTO EGGER GRIS SOMBRA SOLIDO 13MM', width: 2790, height: 2060, thickness: 13, hasGrain: false },
  { id: '140160', idEmpresa: 110, idTextura: -1, name: 'MDF EGGER FONDO PINO CASCINA 5.5MM', width: 2130, height: 1830, thickness: 5.5, hasGrain: true },
  { id: '140161', idEmpresa: 110, idTextura: -1, name: 'MDF EGGER CLASICO 18MM CEREJEIRA', width: 2600, height: 1830, thickness: 18, hasGrain: true },
  { id: '140162', idEmpresa: 110, idTextura: -1, name: 'MDF EGGER CLASICO 18MM HAYA', width: 2600, height: 1830, thickness: 18, hasGrain: true },
  { id: '140163', idEmpresa: 110, idTextura: -1, name: 'MDF EGGER CLASICO 18MM ROBLE MORO', width: 2600, height: 1830, thickness: 18, hasGrain: true },
  { id: '140164', idEmpresa: 110, idTextura: 21288, name: 'MDF FAPLAC BLANCO 18MM TUNDRA', width: 2750, height: 1830, thickness: 18, hasGrain: false },
  { id: '140165', idEmpresa: 110, idTextura: -1, name: 'MDF EGGER CLASICO 18MM WENGUE', width: 2600, height: 1830, thickness: 18, hasGrain: true },
  { id: '140365', idEmpresa: 110, idTextura: 12467, name: 'TABLERO ESTRUCTURAL LP OSB BR 11,1MM', width: 2440, height: 1220, thickness: 11.1, hasGrain: false },
  { id: '140376', idEmpresa: 110, idTextura: 12461, name: 'TABLERO INDUPLAC LP OSB BR 25MM', width: 2440, height: 1220, thickness: 25, hasGrain: false },
  { id: '227956', idEmpresa: 110, idTextura: 21241, name: 'MDF FAPLAC MESOPOTAMIA AMATISTA 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: false },
  { id: '259592', idEmpresa: 110, idTextura: 21245, name: 'MDF FAPLAC MESOPOTAMIA PETIRIBI 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: true },
  { id: '259593', idEmpresa: 110, idTextura: 21240, name: 'MDF FAPLAC MESOPOTAMIA TERRACOTA 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: false },
  { id: '259594', idEmpresa: 110, idTextura: 21246, name: 'MDF FAPLAC HILADO YUTE 18MM', width: 2750, height: 1830, thickness: 18, hasGrain: false },
];

export const MATERIAL_TEXTURES = [
  { id: 12450, name: "aglo faplac blend amaranto 18mm" },
  { id: 12451, name: "aglo faplac clasico haya 15mm" },
  { id: 12452, name: "aglo faplac clasico roble dakar 15mm" },
  { id: 12453, name: "aglo faplac liso negro profundo 15mm" },
  { id: 21270, name: "blend amaranto" },
  { id: 21271, name: "blend camellia" },
  { id: 21272, name: "blend merlot" },
  { id: 21275, name: "blend pinot gris" },
  { id: 21273, name: "blend sauco" },
  { id: 21274, name: "blend scotch" },
  { id: 21248, name: "clasica cedro nature" },
  { id: 21247, name: "clasica cedro woodtext" },
  { id: 21251, name: "clasica ebano negro" },
  { id: 21252, name: "clasica roble americano nature" },
  { id: 21250, name: "clasica roble americano supermate" },
  { id: 21253, name: "clasica roble dakar nature" },
  { id: 21249, name: "clasica roble dakar woodtext" },
  { id: 21279, name: "etnica everest" },
  { id: 21280, name: "etnica himalaya" },
  { id: 21276, name: "etnica safari" },
  { id: 21281, name: "etnica sahara" },
  { id: 21278, name: "etnica tribal" },
  { id: 21277, name: "etnica tuareg" },
  { id: 21295, name: "hilado lino blanco" },
  { id: 21297, name: "hilado lino chiaro" },
  { id: 21299, name: "hilado lino negro" },
  { id: 21301, name: "hilado lino terra" },
  { id: 21296, name: "hilado seda azzurra" },
  { id: 21300, name: "hilado seda giorno" },
  { id: 21298, name: "hilado seda notte" },
  { id: 21314, name: "liso azul lago" },
  { id: 21292, name: "lisos almendra" },
  { id: 21294, name: "lisos aluminio" },
  { id: 21288, name: "lisos blanco tundra" },
  { id: 21293, name: "lisos ceniza" },
  { id: 21291, name: "lisos grafito" },
  { id: 21289, name: "lisos gris humo" },
  { id: 21287, name: "lisos litio" },
  { id: 21290, name: "lisos negro profundo" },
  { id: 21311, name: "lisos rojo" },
  { id: 21243, name: "mesopotamia kiri" },
  { id: 21241, name: "mosopotamia amatista" },
  { id: 21239, name: "mosopotamia gris basalto" },
  { id: 21238, name: "mosopotamia gris caliza" },
  { id: 21242, name: "mosopotamia gris tapir" },
  { id: 21237, name: "mosopotamia jade" },
  { id: 21244, name: "mosopotamia paraiso" },
  { id: 21245, name: "mosopotamia petiribi" },
  { id: 21240, name: "mosopotamia terracota" },
  { id: 21246, name: "mosopotamia yute" },
  { id: 21257, name: "nature blanco nature" },
  { id: 21262, name: "nature caju" },
  { id: 21259, name: "nature carvalho mezzo" },
  { id: 21261, name: "nature gaudi" },
  { id: 21312, name: "nature linosa cinza" },
  { id: 21260, name: "nature mont blanc" },
  { id: 21258, name: "nature nocce milano" },
  { id: 21254, name: "nature nogal terracota" },
  { id: 21255, name: "nature teka artico" },
  { id: 21313, name: "nature terrarum" },
  { id: 21256, name: "nature venezia" },
  { id: 21286, name: "nordica baktico" },
  { id: 21285, name: "nordica helsinki" },
  { id: 21283, name: "nordica olmo finlandes" },
  { id: 21284, name: "nordica roble escandinavo" },
  { id: 21282, name: "nordica teka oslo" },
  { id: 21264, name: "urban amberes" },
  { id: 21263, name: "urban coliseo" },
  { id: 21265, name: "urban home" },
  { id: 21266, name: "urban moscu" },
  { id: 21269, name: "urban praga" },
  { id: 21267, name: "urban street" },
  { id: 21268, name: "urban viena" }
];

export interface OptimizedPart {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  color?: string;
}

export interface OptimizedPanel {
  panelNumber: number;
  parts: OptimizedPart[];
  efficiency: number;
  usedArea: number;
  totalArea: number;
}

export interface OptimizationResult {
  optimizedLayout: OptimizedPanel[];
  totalPanels: number;
  totalEfficiency: number;
  summary: string;
  kerf: number;
  trim: number;
  selectedThickness: number;
}
