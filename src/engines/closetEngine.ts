import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function closetEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  
  const innerW = W - 2 * T;
  const parts: Part[] = [
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: T/2, y: H/2, z: 0, type: 'static' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static' },
    { id: 'tapa', name: 'Tapa Superior', width: W - 2*T, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static' },
    { id: 'base', name: 'Base Inferior', width: W - 2*T, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static' },
    { id: 'fondo', name: 'Fondo Mueble', width: W - T, height: H - T, depth: 3, x: W/2, y: H/2, z: -D/2 + 1.5, type: 'static' },
  ];

  // --- Módulo de Cajones Técnicos ---
  const railSpace = 26; // 13mm cada lado
  const drawerW = innerW - railSpace;
  const drawerD = D - 40;
  const drawerH = 180;
  const frontH = 210;
  
  let topOfDrawersY = 0;

  for (let i = 0; i < 2; i++) {
    const posY = T + 120 + (i * 220); // Posición centro Y del cajón
    const prefix = `cajon-${i}`;
    
    // Guardamos la posición más alta para el estante estructural
    if (i === 1) topOfDrawersY = posY + frontH / 2;

    // 1. Frente del Cajón
    parts.push({ 
      id: `${prefix}-frente`, 
      name: `Frente Cajón ${i+1}`, 
      width: innerW - 4, 
      height: frontH, 
      depth: T, 
      x: W/2, 
      y: posY, 
      z: D/2 + T/2, 
      type: 'drawer' 
    });
    
    // 2. Caja del Cajón
    parts.push({ id: `${prefix}-lat-izq`, name: `Lateral Izq. Cajón ${i+1}`, width: T, height: drawerH, depth: drawerD, x: W/2 - drawerW/2 + T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer' });
    parts.push({ id: `${prefix}-lat-der`, name: `Lateral Der. Cajón ${i+1}`, width: T, height: drawerH, depth: drawerD, x: W/2 + drawerW/2 - T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer' });
    parts.push({ id: `${prefix}-trasera`, name: `Trasera Cajón ${i+1}`, width: drawerW - 2*T, height: drawerH, depth: T, x: W/2, y: posY, z: D/2 - drawerD + T/2, type: 'drawer' });
    parts.push({ id: `${prefix}-piso`, name: `Piso Cajón ${i+1}`, width: drawerW - 2*T, height: 3, depth: drawerD - T, x: W/2, y: posY - drawerH/2 + 1.5, z: D/2 - drawerD/2 + T/2, type: 'drawer' });

    // 3. Rieles (Fijos al lateral interno del mueble)
    parts.push({ 
      id: `${prefix}-riel-izq`, name: `Riel Telescópico ${drawerD}mm`, 
      width: 13, height: 35, depth: drawerD, 
      x: T + 6.5, y: posY, z: D/2 - drawerD/2, 
      type: 'hardware', isHardware: true 
    });
    parts.push({ 
      id: `${prefix}-riel-der`, name: `Riel Telescópico ${drawerD}mm`, 
      width: 13, height: 35, depth: drawerD, 
      x: W - T - 6.5, y: posY, z: D/2 - drawerD/2, 
      type: 'hardware', isHardware: true 
    });
  }

  // --- Estante Estructural (Base sobre cajonera) ---
  const shelfY = topOfDrawersY + 25 + T/2; // 25mm de luz sobre el frente
  parts.push({
    id: 'estante-base-cajonera',
    name: 'Base Cajonera (Estante Estructural)',
    width: innerW,
    height: T,
    depth: D,
    x: W/2,
    y: shelfY,
    z: 0,
    type: 'static'
  });

  // --- Puertas (Hanging area) ---
  // Las puertas cubren desde el estante estructural hasta la tapa superior
  const doorH = H - shelfY - T/2 - 4;
  const doorW = W / 2 - 2;
  const doorY = H - T - doorH / 2;

  // Puerta Izquierda
  parts.push({ 
    id: 'door-L', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, 
    x: doorW / 2, y: doorY, z: D / 2 + T / 2, type: 'door-left',
    pivot: { x: 0, y: doorY, z: D / 2 }
  });

  // Puerta Derecha
  parts.push({ 
    id: 'door-R', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, 
    x: W - doorW / 2, y: doorY, z: D / 2 + T / 2, type: 'door-right',
    pivot: { x: W, y: doorY, z: D / 2 }
  });

  // Cálculo de Bisagras según altura de la puerta
  let hingeCount = 2;
  if (doorH > 1600) hingeCount = 4;
  else if (doorH > 900) hingeCount = 3;

  for (let i = 0; i < hingeCount * 2; i++) {
    parts.push({ 
      id: `bisagra-${i}`, 
      name: 'Bisagra Cazoleta 90°', 
      width: 0, height: 0, depth: 0, 
      x: 0, y: 0, z: 0, 
      type: 'hardware', 
      isHardware: true 
    });
  }

  return { parts, summary: 'Placard Red Arquimax con base estructural sobre cajonera y zona de colgado superior.' };
}
