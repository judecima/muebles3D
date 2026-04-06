// src/server/steel/drawings/PanelGenerator.ts
import { Node3D } from '../domain/model';
import { MemberCheckSummary } from '../checks/types';
import {
  PanelBounds,
  PanelDrawing,
  PanelMemberDrawing,
  PanelOpeningDrawing,
} from './panelTypes';

type StructuralViewMember = {
  id: string;
  memberType: string;
  profileId: string;
  startNodeId: string;
  endNodeId: string;
  wallId?: string;
  status?: 'SAFE' | 'WARNING' | 'FAIL';
  utilization?: number;
  axialN?: number;
  shearY_N?: number;
  momentZ_Nmm?: number;
  message?: string;
};

type StructuralViewModel = {
  nodes: Record<string, Node3D>;
  members: Record<string, StructuralViewMember>;
};

type WallOpening = {
  id: string;
  type: string;
  width: number;
  height: number;
  position: number;
  sillHeight?: number;
};

type SteelWallLike = {
  id: string;
  length: number;
  height: number;
  rotation?: number;
  x: number;
  z: number;
  openings?: WallOpening[];
};

type SteelHouseConfigLike = {
  walls: SteelWallLike[];
  internalWalls?: SteelWallLike[];
};

export class PanelGenerator {
  public static generateAllPanels(
    structuralViewModel: StructuralViewModel,
    config: SteelHouseConfigLike
  ): PanelDrawing[] {
    const walls = [...(config.walls || []), ...(config.internalWalls || [])];
    return walls.map((wall, index) =>
      this.generatePanelForWall(structuralViewModel, wall, index + 1)
    );
  }

  public static generatePanelForWall(
    structuralViewModel: StructuralViewModel,
    wall: SteelWallLike,
    panelIndex = 1
  ): PanelDrawing {
    const wallId = wall.id;
    const wallMembers = Object.values(structuralViewModel.members).filter(
      (m) => m.wallId === wallId
    );

    const warnings: string[] = [];
    if (wallMembers.length === 0) {
      warnings.push(`No se encontraron miembros para wallId=${wallId}`);
    }

    // Vector director del muro para proyección u,v
    const rotRad = (wall.rotation || 0) * Math.PI / 180;
    const dx = Math.cos(rotRad);
    const dz = -Math.sin(rotRad); 

    const memberCounters: Record<string, number> = {};

    const members: PanelMemberDrawing[] = wallMembers.map((member) => {
      const startNode = structuralViewModel.nodes[member.startNodeId];
      const endNode = structuralViewModel.nodes[member.endNodeId];

      if (!startNode || !endNode) {
        warnings.push(`Miembro ${member.id} tiene nodos faltantes.`);
      }

      // Proyección Local: u = (nx - wx)*dx + (nz - wz)*dz
      const toU = (n: Node3D | undefined) => {
          if (!n) return 0;
          return (n.x - wall.x) * dx + (n.z - wall.z) * dz;
      };

      const start = { x: Math.round(toU(startNode)), y: startNode?.y || 0 };
      const end = { x: Math.round(toU(endNode)), y: endNode?.y || 0 };

      const lengthMm = this.distance2D(start.x, start.y, end.x, end.y);
      const label = this.buildMemberLabel(member.memberType, memberCounters);

      return {
        id: member.id,
        label,
        wallId: wallId,
        memberType: member.memberType as any,
        profileId: member.profileId,
        start,
        end,
        lengthMm,
        status: member.status,
        utilization: member.utilization,
        axialN: member.axialN,
        shearY_N: member.shearY_N,
        momentZ_Nmm: member.momentZ_Nmm,
        message: member.message,
      };
    });

    const openings: PanelOpeningDrawing[] = (wall.openings || []).map((op) => ({
      id: op.id,
      type: op.type,
      x: op.position,
      y: op.sillHeight || 0,
      width: op.width,
      height: op.height,
      sillHeight: op.sillHeight,
    }));

    const bounds = this.calculateBounds(members, wall);

    return {
      wallId: wallId,
      panelLabel: `PANEL-${String(panelIndex).padStart(2, '0')}`,
      widthMm: wall.length,
      heightMm: wall.height,
      bounds,
      members: members.sort((a, b) => {
        if (a.memberType !== b.memberType) {
          return a.memberType.localeCompare(b.memberType);
        }
        if (a.start.x !== b.start.x) return a.start.x - b.start.x;
        return a.start.y - b.start.y;
      }),
      openings,
      warnings,
    };
  }

  private static distance2D(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.round(Math.sqrt(dx * dx + dy * dy));
  }

  private static calculateBounds(
    members: PanelMemberDrawing[],
    wall: SteelWallLike
  ): PanelBounds {
    if (members.length === 0) {
      return {
        minX: 0,
        minY: 0,
        maxX: wall.length,
        maxY: wall.height,
        width: wall.length,
        height: wall.height,
      };
    }

    const xs = members.flatMap((m) => [m.start.x, m.end.x]);
    const ys = members.flatMap((m) => [m.start.y, m.end.y]);

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private static buildMemberLabel(
    memberType: string,
    counters: Record<string, number>
  ): string {
    const prefixMap: Record<string, string> = {
      stud: 'ST',
      track: 'TR',
      header: 'HD',
      cripple: 'CR',
      jack: 'JK',
      king: 'KG',
      truss_top_chord: 'TC',
      truss_bottom_chord: 'BC',
      truss_web: 'WB',
    };

    const prefix = prefixMap[memberType] || 'MB';
    counters[prefix] = (counters[prefix] || 0) + 1;
    return `${prefix}-${String(counters[prefix]).padStart(2, '0')}`;
  }
}
