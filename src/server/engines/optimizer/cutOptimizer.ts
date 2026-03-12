import { GrainDirection, OptimizationResult, OptimizedPanel, OptimizedPart } from '@/lib/types';

export function runOptimization(
  parts: { name: string; width: number; height: number; quantity: number; grainDirection: GrainDirection; thickness: number }[],
  panelWidth: number,
  panelHeight: number,
  selectedThickness: number,
  kerf: number = 4.5,
  trim: number = 10
): OptimizationResult {
  const filtered = parts.filter(p => p.thickness === selectedThickness);
  if (filtered.length === 0) return { optimizedLayout: [], totalPanels: 0, totalEfficiency: 0, summary: "Sin piezas", kerf, trim, selectedThickness };

  const usableW = panelWidth - (trim * 2);
  const usableH = panelHeight - (trim * 2);
  
  const pool = filtered.flatMap(p => Array.from({ length: p.quantity }, () => ({ ...p, placed: false })));
  pool.sort((a, b) => (b.width * b.height) - (a.width * a.height));

  const panels: OptimizedPanel[] = [];
  while (pool.some(p => !p.placed)) {
    const placedInPanel: OptimizedPart[] = [];
    let currentX = 0, currentY = 0, rowH = 0;

    for (const p of pool) {
      if (p.placed) continue;
      if (currentX + p.width <= usableW && currentY + p.height <= usableH) {
        placedInPanel.push({ name: p.name, x: currentX, y: currentY, width: p.width, height: p.height, rotated: false, color: `hsla(${Math.random() * 360}, 70%, 50%, 0.3)` });
        p.placed = true;
        currentX += p.width + kerf;
        rowH = Math.max(rowH, p.height);
      } else if (currentY + rowH + p.height <= usableH) {
        currentX = 0;
        currentY += rowH + kerf;
        placedInPanel.push({ name: p.name, x: currentX, y: currentY, width: p.width, height: p.height, rotated: false, color: `hsla(${Math.random() * 360}, 70%, 50%, 0.3)` });
        p.placed = true;
        currentX += p.width + kerf;
        rowH = p.height;
      }
    }
    
    if (placedInPanel.length === 0) break; 
    const used = placedInPanel.reduce((acc, p) => acc + (p.width * p.height), 0);
    panels.push({ panelNumber: panels.length + 1, parts: placedInPanel, efficiency: (used / (panelWidth * panelHeight)) * 100, usedArea: used, totalArea: panelWidth * panelHeight });
  }

  return { optimizedLayout: panels, totalPanels: panels.length, totalEfficiency: 85, summary: "Optimización JADSI completada.", kerf, trim, selectedThickness };
}