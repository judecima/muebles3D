import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function closetEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  
  const innerW = W - 2 * T;
  const parts: Part[] = [
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static', cutLargo: H, cutAncho: D, cutEspesor: T, grainDirection: 'vertical' },
    { id: 'tapa-sup', name: 'Tapa Superior', width: innerW, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
    { id: 'base-inf', name: 'Base Inferior', width: innerW, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static', cutLargo: innerW, cutAncho: D, cutEspesor: T, grainDirection: 'horizontal' },
  ];

  // Fondo obligatorio (3mm)
  parts.push({ 
    id: 'fondo', name: 'Fondo Mueble', width: W, height: H, depth: 3, 
    x: W/2, y: H/2, z: -D/2 - 1.5, 
    type: 'static', cutLargo: H, cutAncho: W, cutEspesor: 3, grainDirection: 'free' 
  });

  // Barra de colgar (Hardware)
  parts.push({
    id: 'hanger-bar', name: 'Barra de Colgar 25mm', width: innerW, height: 25, depth: 25,
    x: W/2, y: H * 0.8, z: 0, type: 'hardware', isHardware: true,
    cutLargo: 0, cutAncho: 0, cutEspesor: 0, grainDirection: 'free'
  });

  // Cajonera Interna (2 cajones)
  const drawerFrontH = 200;
  const drawerGap = 10;
  const railSpace = 25; // total rieles
  const drawerW = innerW - railSpace;
  const drawerD = D - 50;
  const drawerBoxH = 140;

  for (let i = 0; i < 2; i++) {
    const prefix = `closet-drawer-${i}`;
    const posY = T + 100 + (i * (drawerFrontH + drawerGap)) + (drawerFrontH / 2);
    
    // Frente
    parts.push({ 
      id: `${prefix}-front`, name: `Frente Cajón ${i+1}`, width: innerW - 4, height: drawerFrontH, depth: T, 
      x: W/2, y: posY, z: D/2 - T/2 - 10, type: 'drawer', 
      cutLargo: drawerFrontH, cutAncho: innerW - 4, cutEspesor: T, grainDirection: 'horizontal' 
    });
    
    // Laterales
    parts.push({ 
      id: `${prefix}-side-L`, name: `Lat. Izq. Cajón ${i+1}`, width: T, height: drawerBoxH, depth: drawerD, 
      x: W/2 - drawerW/2 + T/2, y: posY, z: D/2 - drawerD/2 - T - 10, type: 'drawer', 
      cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'free' 
    });
    parts.push({ 
      id: `${prefix}-side-R`, name: `Lat. Der. Cajón ${i+1}`, width: T, height: drawerBoxH, depth: drawerD, 
      x: W/2 + drawerW/2 - T/2, y: posY, z: D/2 - drawerD/2 - T - 10, type: 'drawer', 
      cutLargo: drawerD, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'free' 
    });
    
    // Trasera
    parts.push({ 
      id: `${prefix}-back`, name: `Trasera Cajón ${i+1}`, width: drawerW - 2*T, height: drawerBoxH, depth: T, 
      x: W/2, y: posY, z: D/2 - drawerD - T - 10 + T/2, type: 'drawer', 
      cutLargo: drawerW - 2*T, cutAncho: drawerBoxH, cutEspesor: T, grainDirection: 'free' 
    });
    
    // Piso (MDF 3mm)
    parts.push({ 
      id: `${prefix}-bottom`, name: `Piso Cajón ${i+1}`, width: drawerW - 2*T, height: 3, depth: drawerD - T, 
      x: W/2, y: posY - drawerBoxH/2 + 1.5, z: D/2 - drawerD/2 - T - 10 + T/2, type: 'drawer', 
      cutLargo: drawerD - T, cutAncho: drawerW - 2*T, cutEspesor: 3, grainDirection: 'free' 
    });

    // Rieles (Hardware)
    parts.push({ 
      id: `${prefix}-rail-L`, name: `Riel Telescópico ${drawerD}mm`, width: 13, height: 35, depth: drawerD, 
      x: T + 6.5, y: posY, z: D/2 - drawerD/2 - T - 10, type: 'hardware', isHardware: true, 
      cutLargo: 0, cutAncho: 0, cutEspesor: 0 
    });
    parts.push({ 
      id: `${prefix}-rail-R`, name: `Riel Telescópico ${drawerD}mm`, width: 13, height: 35, depth: drawerD, 
      x: W - T - 6.5, y: posY, z: D/2 - drawerD/2 - T - 10, type: 'hardware', isHardware: true, 
      cutLargo: 0, cutAncho: 0, cutEspesor: 0 
    });
  }

  // Puertas
  const doorW = W / 2 - 2;
  const doorH = H - 10;
  parts.push({ 
    id: 'p-door-L', name: 'Puerta Izquierda', width: doorW, height: doorH, depth: T, 
    x: doorW / 2, y: H/2, z: D / 2 + T / 2, type: 'door-left',
    pivot: { x: 0, y: H/2, z: D / 2 },
    cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical'
  });
  parts.push({ 
    id: 'p-door-R', name: 'Puerta Derecha', width: doorW, height: doorH, depth: T, 
    x: W - doorW / 2, y: H/2, z: D / 2 + T / 2, type: 'door-right',
    pivot: { x: W, y: H/2, z: D / 2 },
    cutLargo: doorH, cutAncho: doorW, cutEspesor: T, grainDirection: 'vertical'
  });

  return { 
    parts, 
    summary: 'Placard Red Arquimax con cajonera interna de 2 cajones, barra de colgar y fondo de 3mm.', 
    hasDoors: true, 
    hasDrawers: true 
  };
}