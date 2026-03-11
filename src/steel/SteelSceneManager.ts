'use client';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SteelHouseConfig, SteelWall, SteelOpening, LayerVisibility } from '@/lib/steel/types';

export class SteelSceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private houseGroup: THREE.Group;
  private openingsGroup: THREE.Group;
  private roofGroup: THREE.Group;
  private container: HTMLElement;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private isWalkModeActive = false;
  private initialFitDone = false;

  private colors = {
    background: 0xf1f5f9,
    steel: 0x9ca3af,
    bracing: 0xef4444,
    blocking: 0xd97706,
    lintel: 0x2563eb,
    panel_ext: 0x94a3b8,
    panel_int: 0xe2e8f0,
    roof: 0x475569,
    grid: 0xd1d5db,
    floor: 0xe2e8f0
  };

  private profileWidth = 100;
  private profileFlange = 40;

  constructor(
    container: HTMLElement, 
    onOpeningDoubleClick?: (wallId: string, opening: SteelOpening) => void,
    onWalkModeLock?: (locked: boolean) => void
  ) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.colors.background);

    this.camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 10, 100000);
    this.camera.position.set(8000, 6000, 8000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;

    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5000, 10000, 7500);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const grid = new THREE.GridHelper(40000, 80, this.colors.grid, this.colors.grid);
    grid.position.y = -0.5;
    this.scene.add(grid);

    this.houseGroup = new THREE.Group();
    this.scene.add(this.houseGroup);

    this.openingsGroup = new THREE.Group();
    this.scene.add(this.openingsGroup);

    this.roofGroup = new THREE.Group();
    this.scene.add(this.roofGroup);

    this.animate();
    window.addEventListener('resize', this.onWindowResize);
  }

  private onWindowResize = () => {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  private animate = () => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public buildHouse(config: SteelHouseConfig) {
    this.clearGroup(this.houseGroup);
    this.clearGroup(this.openingsGroup);
    this.clearGroup(this.roofGroup);

    config.walls.forEach(wall => {
      const wallGroup = new THREE.Group();
      wallGroup.position.set(wall.x, 0, wall.z);
      wallGroup.rotation.y = (wall.rotation * Math.PI) / 180;
      this.houseGroup.add(wallGroup);

      if (!config.structuralMode) {
        if (config.layers.exteriorPanels) wallGroup.add(this.createPanelMesh(wall, 'exterior'));
        if (config.layers.interiorPanels) wallGroup.add(this.createPanelMesh(wall, 'interior'));
      }

      if (config.layers.steelProfiles) {
        this.generateWallStructure(wall, wallGroup, config.layers);
      }
    });

    if (config.roof.type !== 'none') {
      this.generateRoof(config);
    }

    if (!this.initialFitDone) {
      this.fitCamera();
      this.initialFitDone = true;
    }
  }

  private generateRoof(config: SteelHouseConfig) {
    const pitchRad = (config.roof.pitch * Math.PI) / 180;
    const overhang = config.roof.overhang;
    const spacing = 600;
    const trussCount = Math.floor(config.length / spacing) + 1;

    const roofStructureGroup = new THREE.Group();
    const roofPanelGroup = new THREE.Group();
    this.roofGroup.add(roofStructureGroup);
    this.roofGroup.add(roofPanelGroup);

    // Cerchas
    for (let i = 0; i < trussCount; i++) {
      const z = -config.length / 2 + i * spacing;
      if (z > config.length / 2 + 10) break;

      if (config.layers.roofStructure) {
        if (config.roof.type === 'two-sides') {
          roofStructureGroup.add(this.createTruss2Aguas(config.width, config.globalWallHeight, z, pitchRad));
        } else {
          roofStructureGroup.add(this.createTruss1Agua(config.width, config.globalWallHeight, z, pitchRad));
        }
      }
    }

    // Faldones (Chapas)
    if (config.layers.roofPanels) {
      const W = config.width + overhang * 2;
      const L = config.length + overhang * 2;
      const H = config.globalWallHeight + 45; // Offset para apoyar sobre cercha

      if (config.roof.type === 'two-sides') {
        const hCumbrera = Math.tan(pitchRad) * (config.width / 2);
        // Faldón Izq
        roofPanelGroup.add(this.createSlopeMesh([
          new THREE.Vector3(-W / 2, H, -L / 2),
          new THREE.Vector3(0, H + hCumbrera, -L / 2),
          new THREE.Vector3(0, H + hCumbrera, L / 2),
          new THREE.Vector3(-W / 2, H, L / 2)
        ]));
        // Faldón Der
        roofPanelGroup.add(this.createSlopeMesh([
          new THREE.Vector3(0, H + hCumbrera, -L / 2),
          new THREE.Vector3(W / 2, H, -L / 2),
          new THREE.Vector3(W / 2, H, L / 2),
          new THREE.Vector3(0, H + hCumbrera, L / 2)
        ]));
      } else {
        const hAlta = Math.tan(pitchRad) * config.width;
        roofPanelGroup.add(this.createSlopeMesh([
          new THREE.Vector3(-W / 2, H, -L / 2),
          new THREE.Vector3(W / 2, H + hAlta, -L / 2),
          new THREE.Vector3(W / 2, H + hAlta, L / 2),
          new THREE.Vector3(-W / 2, H, L / 2)
        ]));
      }
    }
  }

  private createTruss2Aguas(width: number, wallH: number, z: number, pitch: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(0, wallH + 20, z); // 20mm offset para apoyo PGU

    const halfW = width / 2;
    const hRidge = Math.tan(pitch) * halfW;
    const diagLen = halfW / Math.cos(pitch);

    // Cordón Inferior
    group.add(this.createProfile(width, 0, 0, 0, 'PGC'));
    // Cordones Superiores
    const leftChord = this.createProfile(diagLen, -halfW / 2, hRidge / 2, pitch, 'PGC');
    const rightChord = this.createProfile(diagLen, halfW / 2, hRidge / 2, -pitch, 'PGC');
    group.add(leftChord, rightChord);
    // Montante Central
    group.add(this.createProfile(hRidge, 0, hRidge / 2, Math.PI / 2, 'PGC'));

    return group;
  }

  private createTruss1Agua(width: number, wallH: number, z: number, pitch: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(0, wallH + 20, z);

    const hAlta = Math.tan(pitch) * width;
    const diagLen = width / Math.cos(pitch);

    group.add(this.createProfile(width, 0, 0, 0, 'PGC'));
    group.add(this.createProfile(diagLen, 0, hAlta / 2, pitch, 'PGC'));
    group.add(this.createProfile(hAlta, width / 2, hAlta / 2, Math.PI / 2, 'PGC'));

    return group;
  }

  private createProfile(len: number, x: number, y: number, rotZ: number, type: 'PGC' | 'PGU'): THREE.Mesh {
    const geom = new THREE.BoxGeometry(len, this.profileFlange, this.profileWidth);
    const mat = new THREE.MeshStandardMaterial({ color: this.colors.steel, metalness: 0.8, roughness: 0.2 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, 0);
    mesh.rotation.z = rotZ;
    return mesh;
  }

  private createSlopeMesh(pts: THREE.Vector3[]): THREE.Mesh {
    const geom = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      pts[0].x, pts[0].y, pts[0].z,
      pts[1].x, pts[1].y, pts[1].z,
      pts[2].x, pts[2].y, pts[2].z,
      pts[0].x, pts[0].y, pts[0].z,
      pts[2].x, pts[2].y, pts[2].z,
      pts[3].x, pts[3].y, pts[3].z,
    ]);
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: this.colors.roof, side: THREE.DoubleSide });
    return new THREE.Mesh(geom, mat);
  }

  private createPanelMesh(wall: SteelWall, side: 'exterior' | 'interior'): THREE.Mesh {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(wall.length, 0);
    shape.lineTo(wall.length, wall.height);
    shape.lineTo(0, wall.height);
    shape.lineTo(0, 0);

    wall.openings.forEach(op => {
      const hole = new THREE.Path();
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      hole.moveTo(op.position, sill);
      hole.lineTo(op.position + op.width, sill);
      hole.lineTo(op.position + op.width, sill + op.height);
      hole.lineTo(op.position, sill + op.height);
      hole.lineTo(op.position, sill);
      shape.holes.push(hole);
    });

    const geometry = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: 15, beveled: false });
    const mat = new THREE.MeshStandardMaterial({ 
      color: side === 'exterior' ? this.colors.panel_ext : this.colors.panel_int 
    });
    const mesh = new THREE.Mesh(geometry, mat);
    const zPos = side === 'exterior' ? (-this.profileWidth / 2 - 15) : (this.profileWidth / 2);
    mesh.position.set(0, 0, zPos);
    return mesh;
  }

  private generateWallStructure(wall: SteelWall, group: THREE.Group, layers: LayerVisibility) {
    const pguBot = this.createProfile(wall.length, wall.length / 2, this.profileFlange / 2, 0, 'PGU');
    const pguTop = this.createProfile(wall.length, wall.length / 2, wall.height - this.profileFlange / 2, 0, 'PGU');
    group.add(pguBot, pguTop);

    const studCount = Math.floor(wall.length / wall.studSpacing) + 1;
    for (let i = 0; i < studCount; i++) {
      const x = Math.min(i * wall.studSpacing, wall.length - this.profileFlange / 2);
      const stud = this.createProfile(wall.height - this.profileFlange * 2, x + this.profileFlange / 2, wall.height / 2, Math.PI / 2, 'PGC');
      group.add(stud);
    }
  }

  private clearGroup(group: THREE.Group) {
    while (group.children.length > 0) {
      const child = group.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
      group.remove(child);
    }
  }

  public fitCamera() {
    this.houseGroup.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.houseGroup);
    if (box.isEmpty()) return;
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.8;
    this.camera.position.set(center.x + cameraDistance, center.y + cameraDistance, center.z + cameraDistance);
    this.controls.target.copy(center);
    this.controls.update();
  }

  public dispose() {
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
  }
}
