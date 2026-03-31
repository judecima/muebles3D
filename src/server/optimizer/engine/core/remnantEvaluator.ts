export function evaluateRemnantValue(r: { width: number; height: number }): number {
  const area = r.width * r.height;
  const minDim = Math.min(r.width, r.height);
  const maxDim = Math.max(r.width, r.height);
  const ratio = maxDim / (minDim || 1);

  let score = area;

  // Piezas de más de 150mm son muy valiosas en carpintería (zócalos, tirantes)
  if (minDim >= 150) score += 500000;
  // Piezas cuadradas son mejores que tiras largas
  if (ratio < 3) score += 300000;
  // Penalizar "Fideos" (Noodles)
  if (ratio > 6) score -= 1000000;

  return score;
}

export function classifyRemnant(r: { width: number; height: number }): 'PREMIUM' | 'USABLE' | 'WASTE' {
  const minDim = Math.min(r.width, r.height);
  const maxDim = Math.max(r.width, r.height);
  const ratio = maxDim / (minDim || 1);

  if (minDim >= 150 && ratio < 4) return 'PREMIUM';
  if (minDim >= 60) return 'USABLE';
  return 'WASTE';
}
