import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function closetEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  
  const innerW = W - 2 * T;
  const railSpace = 26; // 13mm por lado
  const drawerW = innerW - railSpace;
  const drawerD = D - 40;
  const drawerH = 160;
  const frontH = 200;
  const gap = 4;

  // 1. Estructura Principal
  const parts: Part[] = [
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: T/2, y: H/2, z: 0, type: 'static' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static' },
    { id: 'tapa-sup', name: 'Tapa Superior', width: innerW, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static' },
    { id: 'base-inf', name: 'Base Inferior', width: innerW, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static' },
    { id: 'fondo', name: 'Fondo Mueble', width: W - T, height: H - T, depth: 3, x: W/2, y: H/2, z: -D/2 + 1.5, type: 'static' },
  ];

  // 2. Módulo de Cajones (Posicionamiento desde abajo)
  const numDrawers = 2;
  const startY = T + 100; // Zócalo o altura inicial
  
  for (let i = 0; i < numDrawers; i++) {
    const posY = startY + (i * (frontH + gap)) + frontH/2;
    const prefix = `cajon-${i}`;
    
    // Frente de Cajón (Cubre el hueco interno)
    parts.push({ 
      id: `${prefix}-frente`, 
      name: `Frente Cajón ${i+1}`, 
      width: innerW - 4, height: frontH, depth: T, 
      x: W/2, y: posY, z: D/2 + T/2, 
      type: 'drawer' 
    });
    
    // Caja del Cajón (Calculada para rieles de 13mm)
    parts.push({ id: `${prefix}-lat-izq`, name: `Lateral Izq. Cajón ${i+1}`, width: T, height: drawerH, depth: drawerD, x: W/2 - drawerW/2 + T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer' });
    parts.push({ id: `${prefix}-lat-der`, name: `Lateral Der. Cajón ${i+1}`, width: T, height: drawerH, depth: drawerD, x: W/2 + drawerW/2 - T/2, y: posY, z: D/2 - drawerD/2, type: 'drawer' });
    parts.push({ id: `${prefix}-trasera`, name: `Trasera Cajón ${i+1}`, width: drawerW - 2*T, height: drawerH, depth: T, x: W/2, y: posY, z: D/2 - drawerD + T/2, type: 'drawer' });
    parts.push({ id: `${prefix}-piso`, name: `Piso Cajón ${i+1}`, width: drawerW - 2*T, height: 3, depth: drawerD - T, x: W/2, y: posY - drawerH/2 + 1.5, z: D/2 - drawerD/2 + T/2, type: 'drawer' });

    // Rieles Telescópicos (Fijos a los laterales internos)
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

  // 3. Base Cajonera (Estante Estructural)
  // Se posiciona 30mm por encima del último cajón
  const lastDrawerTopY = startY + (numDrawers * (frontH + gap));
  const baseCajoneraY = lastDrawerTopY + 30 + T/2;
  
  parts.push({
    id: 'base-cajonera',
    name: 'Base Cajonera',
    width: innerW,
    height: T,
    depth: D,
    x: W/2,
    y: baseCajoneraY,
    z: 0,
    type: 'static'
  });

  // 4. Puertas (Zona superior)
  const doorH = H - baseCajoneraY - T/2 - gap;
  const doorW = W / 2 - 2;
  const doorY = H - T - doorH / 2;

  parts.push({ 
    id: 'door-L', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, 
    x: doorW / 2, y: doorY, z: D / 2 + T / 2, type: 'door-left',
    pivot: { x: 0, y: doorY, z: D / 2 }
  });

  parts.push({ 
    id: 'door-R', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, 
    x: W - doorW / 2, y: doorY, z: D / 2 + T / 2, type: 'door-right',
    pivot: { x: W, y: doorY, z: D / 2 }
  });

  // Cálculo de bisagras según altura
  let hingeCount = 2;
  if (doorH > 1600) hingeCount = 4;
  else if (doorH > 900) hingeCount = 3;

  for (let i = 0; i < hingeCount * 2; i++) {
    parts.push({ id: `bis-${i}`, name: 'Bisagra Cazoleta 90°', width: 0, height: 0, depth: 0, x: 0, y: 0, z: 0, type: 'hardware', isHardware: true });
  }

  return { parts, summary: 'Placard Red Arquimax con módulo de cajones técnico, rieles de 13mm y base estructural divisoria.' };
}
