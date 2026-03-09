import { Part, FurnitureDimensions, FurnitureModel } from '@/lib/types';

export function closetEngine(dim: FurnitureDimensions): FurnitureModel {
  const { width: W, height: H, depth: D, thickness: T } = dim;
  
  const parts: Part[] = [
    { id: 'lat-izq', name: 'Lateral Izquierdo', width: T, height: H, depth: D, x: T/2, y: H/2, z: 0, type: 'static' },
    { id: 'lat-der', name: 'Lateral Derecho', width: T, height: H, depth: D, x: W - T/2, y: H/2, z: 0, type: 'static' },
    { id: 'tapa', name: 'Tapa Superior', width: W - 2*T, height: T, depth: D, x: W/2, y: H - T/2, z: 0, type: 'static' },
    { id: 'base', name: 'Base Inferior', width: W - 2*T, height: T, depth: D, x: W/2, y: T/2, z: 0, type: 'static' },
    { id: 'fondo', name: 'Fondo Mueble', width: W - T, height: H - T, depth: 3, x: W/2, y: H/2, z: -D/2 + 1.5, type: 'static' },
  ];

  // Cálculo de Bisagras según altura
  const doorH = H * 0.75;
  let hingeCountPerDoor = 2;
  if (doorH > 1600) hingeCountPerDoor = 4;
  else if (doorH > 900) hingeCountPerDoor = 3;

  // Puertas (Sistema Overlay)
  const doorW = W / 2 - 2;
  const doorY = H - doorH / 2 - T;

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

  // Agregar Bisagras Visuales y al despiece
  for (let i = 0; i < hingeCountPerDoor; i++) {
    const hingeY = doorY - doorH/2 + 100 + (i * (doorH - 200) / (hingeCountPerDoor - 1 || 1));
    parts.push({ id: `hinge-L-${i}`, name: 'Bisagra Cazoleta 90°', width: 20, height: 40, depth: 10, x: T, y: hingeY, z: D/2 - 10, type: 'hardware', isHardware: true });
    parts.push({ id: `hinge-R-${i}`, name: 'Bisagra Cazoleta 90°', width: 20, height: 40, depth: 10, x: W - T, y: hingeY, z: D/2 - 10, type: 'hardware', isHardware: true });
  }

  // Cajones
  const slideClearance = 26;
  const drawerW = W - 2*T - slideClearance;
  const drawerH = 200;
  const drawerD = D - 40;

  for (let i = 0; i < 2; i++) {
    const posY = T + 100 + (i * 220);
    parts.push({ id: `drawer-${i}-frente`, name: `Frente Cajón ${i+1}`, width: W - 2*T - 4, height: drawerH, depth: T, x: W/2, y: posY, z: D/2 + T/2, type: 'drawer' });
    parts.push({ id: `drawer-${i}-box`, name: `Caja Cajón ${i+1}`, width: drawerW, height: drawerH * 0.7, depth: drawerD, x: W/2, y: posY, z: D/2 - drawerD/2, type: 'drawer' });
    parts.push({ id: `rail-${i}`, name: 'Juego Guías Telescópicas', width: 0, height: 0, depth: drawerD, x: 0, y: 0, z: 0, type: 'hardware', isHardware: true });
  }

  return { parts, summary: `Placard con ${hingeCountPerDoor * 2} bisagras calculadas según altura.` };
}
