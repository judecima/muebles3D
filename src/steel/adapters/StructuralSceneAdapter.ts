// d:\proyectos\muebles3D\src\steel\adapters\StructuralSceneAdapter.ts
import * as THREE from 'three';
import { HouseStructuralViewModel, DTOMember } from '@/lib/steel/structuralDTO';
import { SteelHouseConfig, SteelWall } from '@/lib/steel/types';
import { STEEL_PROFILES } from '@/server/steel/profilesDB';
import { buildWallLocalFrame, worldToWallLocal, LocalPoint2D } from './wallLocalSystem';

export type RenderMode = 'presentation' | 'structural_debug';

export class StructuralSceneAdapter {
    private static colors = {
        steel: 0x9ca3af,
        header: 0x2563eb,
        king: 0xef4444,
        jack: 0xf59e0b,
        cripple: 0x8b5cf6,
        status_ok: 0x22c55e,
        status_warning: 0xf59e0b,
        status_error: 0xef4444
    };

    /**
     * Transforma los miembros de un muro específico al sistema de coordenadas local del grupo del muro.
     */
    public static transformWallToScene(
        dto: HouseStructuralViewModel,
        wall: SteelWall,
        mode: RenderMode
    ) {
        const membersGroup = new THREE.Group();
        const nodesGroup = new THREE.Group();

        const wallMembers = Object.values(dto.members).filter(m => 
            m.wallId === wall.id && 
            m.memberType !== 'header' && 
            m.memberType !== 'jack'
        );
        const frame = buildWallLocalFrame(wall);

        wallMembers.forEach(member => {
            const n1 = dto.nodes[member.startNodeId];
            const n2 = dto.nodes[member.endNodeId];
            if (!n1 || !n2) return;

            // 🎯 PROYECCIÓN VECTORIAL ROBUSTA
            const startGlobal = new THREE.Vector3(n1.x, n1.y, n1.z);
            const endGlobal = new THREE.Vector3(n2.x, n2.y, n2.z);
            
            const startLocal = worldToWallLocal(startGlobal, frame);
            const endLocal = worldToWallLocal(endGlobal, frame);

            // ✂️ LÓGICA DE RECORTE (CLIPPING)
            if (member.memberType === 'stud') {
                const pieces = this.calculateClippedSegments(startLocal, endLocal, wall);
                pieces.forEach(p => {
                    const mesh = this.createMemberMeshLocal(
                        member, 
                        new THREE.Vector3(startLocal.x, p.yStart, 0), 
                        new THREE.Vector3(endLocal.x, p.yEnd, 0), 
                        mode
                    );
                    if (mesh) membersGroup.add(mesh);
                });
                return;
            }

            // Miembros no recortables (headers, kings, etc) - Se renderizan íntegros
            // Si el DTO ya trae el frame, lo renderizamos. 
            const mesh = this.createMemberMeshLocal(
                member, 
                new THREE.Vector3(startLocal.x, startLocal.y, 0), 
                new THREE.Vector3(endLocal.x, endLocal.y, 0), 
                mode
            );
            
            if (mesh) membersGroup.add(mesh);

            if (mode === 'structural_debug') {
                const nodeMarker = new THREE.Mesh(
                    new THREE.SphereGeometry(15, 8, 8),
                    new THREE.MeshBasicMaterial({ color: 0xffffff })
                );
                nodeMarker.position.set(startLocal.x, startLocal.y, 0);
                nodesGroup.add(nodeMarker);
            }
        });

        // 🏠 RECONSTRUCCIÓN ARQUITECTÓNICA DEL MARCO (OPENING FRAME)
        if (wall.openings) {
            wall.openings.forEach(op => {
                const frameGroup = this.buildOpeningFrame(op, wall, mode);
                membersGroup.add(frameGroup);
            });
        }

        return { members: membersGroup, nodes: nodesGroup };
    }

    private static createMemberMesh(
        member: DTOMember, 
        start: THREE.Vector3, 
        end: THREE.Vector3, 
        mode: RenderMode
    ): THREE.Mesh | null {
        const distance = start.distanceTo(end);
        if (distance < 1) return null;

        const profile = STEEL_PROFILES[member.profileId] || { height: 100, width: 40 };
        
        // Geometría técnica orientada
        const geom = new THREE.BoxGeometry(profile.width, distance, profile.height);
        geom.translate(0, distance / 2, 0); 

        let color = this.colors.steel;
        if (mode === 'presentation') {
            if (member.memberType === 'header') color = this.colors.header;
            else if (member.memberType === 'king') color = this.colors.king;
            else if (member.memberType === 'jack') color = this.colors.jack;
            else if (member.memberType === 'cripple') color = this.colors.cripple;
        } else {
            if (member.status === 'FAIL') color = this.colors.status_error;
            else if (member.status === 'WARNING') color = this.colors.status_warning;
            else if (member.utilization && member.utilization > 0) {
                color = member.utilization > 0.8 ? 0xf59e0b : this.colors.status_ok;
            }
        }

        const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.3 });
        const mesh = new THREE.Mesh(geom, mat);
        
        mesh.position.copy(start);
        mesh.lookAt(end);
        mesh.rotateX(Math.PI / 2);

        mesh.userData = { isMember: true, ...member };
        return mesh;
    }

    private static calculateClippedSegments(
        start: LocalPoint2D, 
        end: LocalPoint2D, 
        wall: SteelWall
    ): { yStart: number, yEnd: number }[] {
        if (!wall.openings || wall.openings.length === 0) {
            return [{ yStart: start.y, yEnd: end.y }];
        }

        const midX = (start.x + end.x) / 2;
        const yMin = Math.min(start.y, end.y);
        const yMax = Math.max(start.y, end.y);

        // Encontrar si este stud (X) cae dentro de alguna abertura
        const overlappingOp = wall.openings.find(op => {
            const margin = 5;
            return midX > (op.position + margin) && midX < (op.position + op.width - margin);
        });

        if (!overlappingOp) {
            return [{ yStart: yMin, yEnd: yMax }];
        }

        const opSill = overlappingOp.type === 'door' ? 0 : (overlappingOp.sillHeight || 900);
        const opHeader = opSill + overlappingOp.height;

        const segments: { yStart: number, yEnd: number }[] = [];

        // Tramo Inferior (Cripple inferior - solo ventanas)
        if (overlappingOp.type === 'window' && yMin < opSill) {
            segments.push({ yStart: yMin, yEnd: opSill });
        }

        // Tramo Superior (Cripple superior)
        if (yMax > opHeader) {
            segments.push({ yStart: opHeader, yEnd: yMax });
        }

        return segments;
    }

    private static createMemberMeshLocal(
        member: DTOMember, 
        start: THREE.Vector3, 
        end: THREE.Vector3, 
        mode: RenderMode
    ): THREE.Mesh | null {
        return this.createMemberMesh(member, start, end, mode);
    }

    /**
     * Construye el marco (header, sill, jacks) de una abertura de forma arquitectónica.
     */
    private static buildOpeningFrame(
        opening: any,
        wall: SteelWall,
        mode: RenderMode
    ): THREE.Group {
        const frameGroup = new THREE.Group();

        const sillY = opening.type === 'door' ? 0 : (opening.sillHeight || 900);
        const headerY = sillY + opening.height;
        const xStart = opening.position;
        const xEnd = opening.position + opening.width;

        const fakeMemberBase = { 
            status: 'SAFE', 
            profileId: 'PGC-100-0.9', // Perfil existente en la DB
            utilization: 0 
        };

        // 1. Header (Superior)
        const header = this.createMemberMeshLocal(
            { ...fakeMemberBase, memberType: 'header' } as any,
            new THREE.Vector3(xStart, headerY, 0),
            new THREE.Vector3(xEnd, headerY, 0),
            mode
        );
        if (header) frameGroup.add(header);

        // 2. Sill (Inferior - solo ventanas)
        if (opening.type === 'window') {
            const sill = this.createMemberMeshLocal(
                { ...fakeMemberBase, memberType: 'track' } as any,
                new THREE.Vector3(xStart, sillY, 0),
                new THREE.Vector3(xEnd, sillY, 0),
                mode
            );
            if (sill) frameGroup.add(sill);
        }

        // 3. Jacks (Laterales internos)
        const jackL = this.createMemberMeshLocal(
            { ...fakeMemberBase, memberType: 'jack' } as any,
            new THREE.Vector3(xStart, sillY, 0),
            new THREE.Vector3(xStart, headerY, 0),
            mode
        );
        const jackR = this.createMemberMeshLocal(
            { ...fakeMemberBase, memberType: 'jack' } as any,
            new THREE.Vector3(xEnd, sillY, 0),
            new THREE.Vector3(xEnd, headerY, 0),
            mode
        );
        
        if (jackL) frameGroup.add(jackL);
        if (jackR) frameGroup.add(jackR);

        return frameGroup;
    }

}
