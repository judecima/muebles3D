export interface HouseModel {
    walls: HouseWall[];
  }
  
  export interface HouseWall {
    id: string;
    length: number;
    height: number;
    panels: HousePanel[];
  }
  
  export interface HousePanel {
    id: string;
    xStart: number;
    xEnd: number;
    width: number;
  
    // 🔥 estructural REAL
    isWallStart: boolean;
    isWallEnd: boolean;
    needsBracing: boolean;
  
    // 🔥 refuerzos
    doubleStuds: boolean;
    reinforcementFactor: number;
  
    // 🔥 fabricación
    studs: HouseStud[];
  }
  
  export interface HouseStud {
    x: number;
    height: number;
    type: 'normal' | 'double' | 'king' | 'jack' | 'cripple';
  }

import { SteelHouseConfig } from '@/lib/steel/types';
import { StructuralEngine } from './structuralEngine';

export function buildHouseModel(config: SteelHouseConfig): HouseModel {
  const walls: HouseWall[] = [];

  config.walls.forEach(wall => {
    const panels = StructuralEngine.calculateWallPanels(wall, config);

    const housePanels: HousePanel[] = panels.map(p => {
      const studHeight = wall.height - 80;

      // 🔥 FACTOR REAL (clave)
      const reinforcementFactor = p.doubleStuds
        ? (p.needsBracing ? 2.5 : 2)
        : 1;

      const studs: HouseStud[] = [];

      // 🔹 studs base
      for (let x = p.xStart; x <= p.xEnd; x += wall.studSpacing) {
        studs.push({
          x,
          height: studHeight,
          type: 'normal'
        });

        // 🔥 duplicación real
        if (p.doubleStuds) {
          studs.push({
            x: x + 15,
            height: studHeight,
            type: 'double'
          });
        }
      }

      // 🔥 refuerzo adicional (por carga)
      const extraCount = Math.floor(studs.length * (reinforcementFactor - 1));

      for (let i = 0; i < extraCount; i++) {
        studs.push({
          x: p.xStart + (i * 20),
          height: studHeight,
          type: 'double'
        });
      }

      return {
        id: p.id,
        xStart: p.xStart,
        xEnd: p.xEnd,
        width: p.width,

        isWallStart: p.isWallStart,
        isWallEnd: p.isWallEnd,
        needsBracing: p.needsBracing,

        doubleStuds: p.doubleStuds,
        reinforcementFactor,

        studs
      };
    });

    walls.push({
      id: wall.id,
      length: wall.length,
      height: wall.height,
      panels: housePanels
    });
  });

  return { walls };
}