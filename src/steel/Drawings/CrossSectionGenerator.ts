export interface CrossSectionElement {
    type: 'stud' | 'track' | 'panel' | 'insulation' | 'header';
    x: number;
    y: number;
    width: number;
    height: number;
  }
  
  export function generateWallSection(wall: SteelWall, processed: any): CrossSectionElement[] {
    const elements: CrossSectionElement[] = [];
  
    processed.panels.forEach((p: any) => {
  
      // solera inferior
      elements.push({
        type: 'track',
        x: p.xStart,
        y: 0,
        width: p.width,
        height: 40
      });
  
      // solera superior
      elements.push({
        type: 'track',
        x: p.xStart,
        y: wall.height - 40,
        width: p.width,
        height: 40
      });
  
      // studs
      for (let x = p.xStart; x <= p.xEnd; x += wall.studSpacing) {
        elements.push({
          type: 'stud',
          x,
          y: 40,
          width: 40,
          height: wall.height - 80
        });
      }
  
      // panel (OSB)
      elements.push({
        type: 'panel',
        x: p.xStart,
        y: 0,
        width: p.width,
        height: wall.height
      });
  
      // aislación
      elements.push({
        type: 'insulation',
        x: p.xStart,
        y: 40,
        width: p.width,
        height: wall.height - 80
      });
  
    });
  
    return elements;
  }