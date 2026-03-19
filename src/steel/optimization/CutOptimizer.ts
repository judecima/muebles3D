export function optimizeCuts(lengths: number[], stock = 6000) {

    const bars: number[][] = [];
  
    lengths.sort((a, b) => b - a);
  
    lengths.forEach(len => {
  
      let placed = false;
  
      for (const bar of bars) {
        const used = bar.reduce((a, b) => a + b, 0);
  
        if (used + len <= stock) {
          bar.push(len);
          placed = true;
          break;
        }
      }
  
      if (!placed) {
        bars.push([len]);
      }
  
    });
  
    return bars;
  }