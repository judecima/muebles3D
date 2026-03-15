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
  hasShelf2?: boolean; // Segundo estante para módulos divididos (3 puertas)
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
  name: string;
}

export const AVAILABLE_PANELS: PanelSize[] = [
  { id: '140113', width: 2750, height: 1830, name: 'AGLO FAPLAC BLEND AMARANTO 18MM' },
  { id: '140114', width: 2600, height: 1830, name: 'MDF FAPLAC FONDO CLASICO CEDRO 3MM' },
  { id: '140115', width: 2750, height: 1830, name: 'MDF FAPLAC LISO GRAFITO 18MM' },
  { id: '140116', width: 2750, height: 1830, name: 'MDF FAPLAC LISO GRIS HUMO 18MM' },
  { id: '140117', width: 2750, height: 1830, name: 'MDF FAPLAC LISO LITIO 18MM' },
  { id: '140118', width: 2750, height: 1830, name: 'MDF FAPLAC LISO NEGRO PROFUNDO 18MM' },
  { id: '140119', width: 2750, height: 1830, name: 'MDF FAPLAC LISO ROJO 18MM' },
  { id: '140120', width: 2750, height: 1830, name: 'MDF FAPLAC LISO TITANIO 18MM' },
  { id: '140121', width: 2750, height: 1830, name: 'MDF FAPLAC LISO VERDE 18MM' },
  { id: '140122', width: 2750, height: 1830, name: 'MDF FAPLAC NATURE CAJÚ 18MM' },
  { id: '140123', width: 2750, height: 1830, name: 'MDF FAPLAC NATURE CARVALHO ASERRADO 18MM' },
  { id: '140124', width: 2750, height: 1830, name: 'MDF FAPLAC NATURE CARVALHO MEZZO 18MM' },
  { id: '140125', width: 2600, height: 1830, name: 'MDF FAPLAC FONDO CLASICO EBANO NEGRO 3MM' },
  { id: '140126', width: 2750, height: 1830, name: 'MDF FAPLAC NATURE GAUDI 18MM' },
  { id: '140127', width: 2750, height: 1830, name: 'MDF FAPLAC NATURE LINOSA CINZA 18MM' },
  { id: '140128', width: 2750, height: 1830, name: 'MDF FAPLAC NATURE MONT BLANC 18MM' },
  { id: '140129', width: 2750, height: 1830, name: 'MDF FAPLAC NATURE NOCCE MILANO 18MM' },
  { id: '140130', width: 2750, height: 1830, name: 'MDF FAPLAC NATURE NOGAL TERRACOTA 18MM' },
  { id: '140131', width: 2750, height: 1830, name: 'MDF FAPLAC NATURE PRAGA 18MM' },
  { id: '140132', width: 2750, height: 1830, name: 'MDF FAPLAC NATURE TEKA ARTICO 18MM' },
  { id: '140133', width: 2750, height: 1830, name: 'MDF FAPLAC NATURE TERRARUM 18MM' },
  { id: '140134', width: 2750, height: 1830, name: 'MDF FAPLAC NATURE VENEZIA 18MM' },
  { id: '140135', width: 2750, height: 1830, name: 'MDF FAPLAC NORDICO BALTICO 18MM' },
  { id: '140136', width: 2600, height: 1830, name: 'MDF FAPLAC FONDO CLASICO ROBLE AMERICANO 3MM' },
  { id: '140137', width: 2750, height: 1830, name: 'MDF FAPLAC NORDICO HELSINKI 18MM' },
  { id: '140138', width: 2750, height: 1830, name: 'MDF FAPLAC NORDICO OLMO FINLANDES 18MM' },
  { id: '140139', width: 2750, height: 1830, name: 'MDF FAPLAC NORDICO ROBLE ESCANDINAVO 18MM' },
  { id: '140140', width: 2750, height: 1830, name: 'MDF FAPLAC NORDICO TEKA OSLO 18MM' },
  { id: '140141', width: 2750, height: 1830, name: 'MDF FAPLAC URBAN STREET 18MM' },
  { id: '140142', width: 2750, height: 1830, name: 'MDF FAPLAC URBAN AMBERES 18MM' },
  { id: '140143', width: 2750, height: 1830, name: 'MDF FAPLAC URBAN COLISEO 18MM' },
  { id: '140144', width: 2750, height: 1830, name: 'MDF FAPLAC URBAN HOME 18MM' },
  { id: '140145', width: 2750, height: 1830, name: 'MDF FAPLAC URBAN MOSCÚ 18MM' },
  { id: '140146', width: 2750, height: 1830, name: 'MDF FAPLAC URBAN VIENA 18MM' },
  { id: '140147', width: 2600, height: 1830, name: 'MDF FAPLAC FONDO CLASICO ROBLE DAKAR 3MM' },
  { id: '140148', width: 2600, height: 1830, name: 'MDF FAPLAC FONDO CLASICO ROBLE ESPAÑOL 3MM' },
  { id: '140149', width: 2600, height: 1830, name: 'MDF FAPLAC FONDO LISO 3MM NEGRO' },
  { id: '140150', width: 2600, height: 1830, name: 'MDF FAPLAC FONDO LISO ALMENDRA 3MM' },
  { id: '140151', width: 2600, height: 1830, name: 'MDF FAPLAC FONDO LISO CENIZA 3MM' },
  { id: '140152', width: 2600, height: 1830, name: 'MDF FAPLAC FONDO LISO GRAFITO 3MM' },
  { id: '140153', width: 2750, height: 1830, name: 'MDF FAPLAC BLANCO 12MM TUNDRA' },
  { id: '140154', width: 2750, height: 1830, name: 'AGLO FAPLAC CLASICO HAYA 15MM' },
  { id: '140155', width: 2750, height: 1830, name: 'MDF FAPLAC BLANCO 12MM' },
  { id: '140156', width: 2750, height: 1830, name: 'MDF FAPLAC BLANCO 15MM TUNDRA' },
  { id: '140157', width: 2750, height: 1830, name: 'MDF FAPLAC BLANCO 15MM' },
  { id: '140158', width: 2790, height: 2060, name: 'LAMINADO COMPACTO EGGER BLANCO ALPINO SOLIDO 13MM' },
  { id: '140159', width: 2790, height: 2060, name: 'LAMINADO COMPACTO EGGER GRIS SOMBRA SOLIDO 13MM' },
  { id: '140160', width: 2130, height: 1830, name: 'MDF EGGER FONDO PINO CASCINA 5.5MM' },
  { id: '140161', width: 2600, height: 1830, name: 'MDF EGGER CLASICO 18MM CEREJEIRA' },
  { id: '140162', width: 2600, height: 1830, name: 'MDF EGGER CLASICO 18MM HAYA' },
  { id: '140163', width: 2600, height: 1830, name: 'MDF EGGER CLASICO 18MM ROBLE MORO' },
  { id: '140164', width: 2750, height: 1830, name: 'MDF FAPLAC BLANCO 18MM TUNDRA' },
  { id: '140165', width: 2600, height: 1830, name: 'MDF EGGER CLASICO 18MM WENGUE' },
  { id: '140166', width: 2600, height: 1830, name: 'MDF EGGER ENCHAPADO ROBLE AMERICANO 18MM' },
  { id: '140167', width: 2600, height: 1830, name: 'MDF EGGER ENCHAPADO ROBLE BLANCO 18MM' },
  { id: '140168', width: 2600, height: 1830, name: 'MDF EGGER ENCHAPADO WENGUE 18MM' },
  { id: '140169', width: 2600, height: 1830, name: 'MDF EGGER ESENCIA 18MM ENIGMA' },
  { id: '140170', width: 2600, height: 1830, name: 'MDF EGGER ESENCIA 18MM FRESNO NEGRO' },
  { id: '140171', width: 2600, height: 1830, name: 'MDF EGGER ESENCIA 18MM ROBLE NATURAL' },
  { id: '140172', width: 2600, height: 1830, name: 'MDF EGGER ESENCIA 18MM TECA LIMO' },
  { id: '140173', width: 2600, height: 1830, name: 'MDF EGGER ESENCIA 18MM TORTONA MARMARA' },
  { id: '140174', width: 2600, height: 1830, name: 'MDF EGGER FONDO 3MM GRIS GRAFITO' },
  { id: '140175', width: 2750, height: 1850, name: 'MDF FAPLAC BLANCO 18MM' },
  { id: '140176', width: 2600, height: 1830, name: 'MDF EGGER FONDO 3MM ROBLE MORO' },
  { id: '140177', width: 2600, height: 1830, name: 'MDF EGGER FONDO 3MM ROBLE NATURAL' },
  { id: '140178', width: 2600, height: 1830, name: 'MDF EGGER FONDO 3MM TECA' },
  { id: '140179', width: 2600, height: 1830, name: 'MDF EGGER LACA 18MM AZUL ACERO' },
  { id: '140180', width: 2600, height: 1830, name: 'MDF EGGER LACA 18MM ESMERALDA' },
  { id: '140181', width: 2600, height: 1830, name: 'MDF EGGER LACA 18MM VERDE OLIVA' },
  { id: '140182', width: 2600, height: 1830, name: 'MDF EGGER LACA 18MM VISON' },
  { id: '140183', width: 2600, height: 1830, name: 'MDF EGGER LISO 18MM ALMENDRA' },
  { id: '140184', width: 2600, height: 1830, name: 'MDF EGGER LISO 18MM CENIZA' },
  { id: '140185', width: 2600, height: 1830, name: 'MDF EGGER MATERIA CONCRETO METROPOLITAN 18MM' },
  { id: '140186', width: 2750, height: 1830, name: 'MDF FAPLAC BLANCO 18MM NATURE' },
  { id: '140187', width: 2600, height: 1830, name: 'MDF EGGER MATERIA 18MM LINO' },
  { id: '140188', width: 2600, height: 1830, name: 'MDF EGGER MATERIA 18MM OXIDO' },
  { id: '140189', width: 2600, height: 1830, name: 'MDF EGGER MATERIA 18MM RAMIO CAFE' },
  { id: '140190', width: 2600, height: 1830, name: 'MDF EGGER MATERIA 18MM RAMIO PLATA' },
  { id: '140191', width: 2600, height: 1830, name: 'MDF EGGER TOUCH 18MM OLMO ALPINO' },
  { id: '140192', width: 2600, height: 1830, name: 'MDF EGGER TOUCH 18MM TECA ITALIA' },
  { id: '140193', width: 2600, height: 1830, name: 'MDF EGGER BLANCO 12MM' },
  { id: '140194', width: 2600, height: 1830, name: 'MDF EGGER BLANCO 15MM' },
  { id: '140195', width: 2600, height: 1830, name: 'MDF EGGER BLANCO 18MM 2.60' },
  { id: '140196', width: 2600, height: 1830, name: 'MDF EGGER BLANCO SM 18MM (LACA)' },
  { id: '140197', width: 2750, height: 1830, name: 'MDF FAPLAC BLANCO 9MM' },
  { id: '140198', width: 2600, height: 1830, name: 'MDF EGGER CRUDO 12MM.' },
  { id: '140199', width: 2600, height: 1830, name: 'MDF EGGER CRUDO 15MM.' },
  { id: '140200', width: 2600, height: 1830, name: 'MDF EGGER CRUDO 18MM.' },
  { id: '140201', width: 2600, height: 1830, name: 'MDF EGGER CRUDO 9MM.' },
  { id: '140208', width: 2750, height: 1830, name: 'MDF FAPLAC BLEND AMARANTO 18MM' },
  { id: '140219', width: 2750, height: 1830, name: 'MDF FAPLAC BLEND CAMELLIA 18MM' },
  { id: '140230', width: 2750, height: 1830, name: 'MDF FAPLAC BLEND MERLOT 18MM' },
  { id: '140242', width: 2750, height: 1830, name: 'MDF FAPLAC BLEND PINOT GRIS 18MM' },
  { id: '140253', width: 2750, height: 1830, name: 'MDF FAPLAC BLEND SCOTCH 18MM' },
  { id: '140264', width: 2750, height: 1830, name: 'MDF FAPLAC CLASICO ABEDUL 18MM' },
  { id: '140275', width: 2750, height: 1830, name: 'MDF FAPLAC CLASICO CEDRO 15MM' },
  { id: '140286', width: 2750, height: 1830, name: 'MDF FAPLAC CLASICO CEDRO 18MM' },
  { id: '140297', width: 2750, height: 1830, name: 'MDF FAPLAC CLASICO CEREZO 18MM' },
  { id: '140308', width: 2750, height: 1830, name: 'MDF FAPLAC CLASICO EBANO NEGRO 18MM' },
  { id: '140319', width: 2750, height: 1830, name: 'MDF FAPLAC CLASICO HAYA 18MM' },
  { id: '140330', width: 2750, height: 1830, name: 'MDF FAPLAC CLASICO MAPLE 18MM' },
  { id: '140341', width: 2750, height: 1830, name: 'MDF FAPLAC CLASICO NATURE CEDRO 18MM' },
  { id: '140352', width: 2750, height: 1830, name: 'AGLO FAPLAC LISO NEGRO PROFUNDO 15MM' },
  { id: '140353', width: 2750, height: 1830, name: 'MDF FAPLAC CLASICO NATURE ROBLE AMERICANO 18MM' },
  { id: '140364', width: 2750, height: 1830, name: 'MDF FAPLAC CLASICO NATURE ROBLE DAKAR 18MM' },
  { id: '140375', width: 2750, height: 1830, name: 'MDF FAPLAC CLASICO ROBLE AMERICANO 18MM' },
  { id: '140385', width: 2750, height: 1830, name: 'MDF FAPLAC CLASICO ROBLE DAKAR 18MM' },
  { id: '140386', width: 2750, height: 1830, name: 'MDF FAPLAC CLASICO TANGANICA TABACO 18MM' },
  { id: '140395', width: 2750, height: 1830, name: 'MDF FAPLAC ETNICA EVEREST 18MM' },
  { id: '140396', width: 2750, height: 1830, name: 'MDF FAPLAC ETNICA HIMALAYA 18MM' },
  { id: '140397', width: 2750, height: 1830, name: 'MDF FAPLAC ETNICA SAFARI 18MM' },
  { id: '140398', width: 2750, height: 1830, name: 'MDF FAPLAC ETNICA SAHARA 18MM' },
  { id: '140399', width: 2750, height: 1830, name: 'MDF FAPLAC ETNICA TRIBAL 18MM' },
  { id: '140400', width: 2750, height: 1830, name: "MDF FAPLAC ETNICA TUAREG 18MM" },
  { id: "227956", width: 2750, height: 1830, name: "MDF FAPLAC MESOPOTAMIA AMATISTA 18MM" },
  { id: "227957", width: 2750, height: 1830, name: "MDF FAPLAC MESOPOTAMIA GRIS CALIZA 18MM" },
  { id: "227958", width: 2750, height: 1830, name: "MDF FAPLAC MESOPOTAMIA GRIS BASALTO 18MM" },
  { id: "227959", width: 2750, height: 1830, name: "MDF FAPLAC MESOPOTAMIA GRIS TAPIR 18MM" },
  { id: "227960", width: 2750, height: 1830, name: "MDF FAPLAC MESOPOTAMIA JADE 18MM" },
  { id: "227961", width: 2750, height: 1830, name: "MDF FAPLAC MESOPOTAMIA KIRI 18MM" },
  { id: "227962", width: 2750, height: 1830, name: "MDF FAPLAC MESOPOTAMIA PARAISO 18MM" },
  { id: "236941", width: 2750, height: 1830, name: "MDF FAPLAC BLEND SAUCO 18MM" },
  { id: "259592", width: 2750, height: 1830, name: "MDF FAPLAC MESOPOTAMIA PETIRIBI 18MM" },
  { id: "259593", width: 2750, height: 1830, name: "MDF FAPLAC MESOPOTAMIA TERRACOTA 18MM" },
  { id: "259594", width: 2750, height: 1830, name: "MDF FAPLAC HILADO YUTE 18MM" },
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
