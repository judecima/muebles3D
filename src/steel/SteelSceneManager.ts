'use client';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SteelHouseConfig, SteelWall, SteelOpening, LayerVisibility } from '@/lib/steel/types';
import { StructuralEngine } from '../utils/steel/structuralEngine';
import { InputController } from '@/engine/player/InputController';
import { CollisionSystem } from '@/engine/player/CollisionSystem';
import { PlayerController } from '@/engine/player/PlayerController';
import { ThirdPersonCamera } from '@/engine/player/ThirdPersonCamera';

export class SteelSceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private houseGroup: THREE.Group;
  private openingsGroup: THREE.Group;
  private container: HTMLElement;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Player System
  private input: InputController;
  private collisions: CollisionSystem;
  private player: PlayerController;
  private tpCamera: ThirdPersonCamera;
  private isWalkModeActive = false;

  private prevTime = performance.now();

  private onOpeningDoubleClickCallback?: (wallId: string, opening: SteelOpening) => void;
  private onWallDoubleClickCallback?: (wallId: string, x: number) => void;
  private onWalkModeLock?: (locked: boolean) => void;

  private colors = {
    background: 0xf1f5f9,
    steel: 0x9ca3af, 
    header: 0x2563eb,
    headerTriple: 0x1e40af,
    headerTube: 0x0f172a,
    king: 0xef4444,
    jack: 0xf59e0b,
    grid: 0xd1d5db,
    floor: 0xe2e8f0,
    panel_ext: 0x94a3b8,
    panel_int: 0xe2e8f0
  };

  private profileWidth = 100; 
  private profileFlange = 40;  

  constructor(
    container: HTMLElement, 
    onOpeningDoubleClick?: (wallId: string, opening: SteelOpening) => void,
    onWallDoubleClick?: (wallId: string, x: number) => void,
    onWalkModeLock?: (locked: boolean) => void
  ) {
    this.container = container;
    this.onOpeningDoubleClickCallback = onOpeningDoubleClick;
    this.onWallDoubleClickCallback = onWallDoubleClick;
    this.onWalkModeLock = onWalkModeLock;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.colors.background);

    this.camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 10, 100000);
    this.camera.position.set(8000, 6000, 8000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;

    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // Initialize Player Systems
    this.input = new InputController();
    this.collisions = new CollisionSystem();
    this.player = new PlayerController(this.scene, this.input, this.collisions);
    this.tpCamera = new ThirdPersonCamera(this.camera, this.player.mesh, this.input, this.collisions);
    
    this.player.mesh.visible = false;

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

    this.animate();
    window.addEventListener('resize', this.onWindowResize);
    this.renderer.domElement.addEventListener('dblclick', this.onDoubleClick);
  }

  public updateJoystickMove(x: number, y: number) { this.input.joystickMove.set(x, y); }
  public updateJoystickLook(x: number, y: number) { this.input.joystickLook.set(x, y); }

  public enterWalkMode() {
    this.isWalkModeActive = true;
    this.controls.enabled = false;
    this.player.mesh.visible = true;
    this.player.mesh.position.set(0, 0, 0);
    if (this.onWalkModeLock) this.onWalkModeLock(true);
  }

  public exitWalkMode() {
    this.isWalkModeActive = false;
    this.controls.enabled = true;
    this.player.mesh.visible = false;
    if (this.onWalkModeLock) this.onWalkModeLock(false);
  }

  private onWindowResize = () => {
    if (!this.container || !this.camera || !this.renderer) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  private onDoubleClick = (event: MouseEvent) => {
    if (this.isWalkModeActive) return; 
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 1. Priorizar aberturas existentes
    const openingIntersects = this.raycaster.intersectObjects(this.openingsGroup.children);
    if (openingIntersects.length > 0) {
      const { wallId, opening } = openingIntersects[0].object.userData;
      if (this.onOpeningDoubleClickCallback) this.onOpeningDoubleClickCallback(wallId, opening);
      return;
    }

    // 2. Si no es abertura, buscar muros para agregar
    const wallMeshes: THREE.Object3D[] = [];
    this.houseGroup.traverse(child => {
      if (child.userData && child.userData.isWall) {
        wallMeshes.push(child);
      }
    });

    const wallIntersects = this.raycaster.intersectObjects(wallMeshes);
    if (wallIntersects.length > 0) {
      const intersect = wallIntersects[0];
      const { wallId } = intersect.object.userData;
      const localPoint = intersect.object.worldToLocal(intersect.point.clone());
      // En ExtrudeGeometry el eje X local es el largo del muro
      if (this.onWallDoubleClickCallback) {
        this.onWallDoubleClickCallback(wallId, localPoint.x);
      }
    }
  };

  private animate = () => {
    requestAnimationFrame(this.animate);
    const time = performance.now();
    const delta = (time - this.prevTime) / 1000;

    if (this.isWalkModeActive) {
      this.player.update(delta, this.tpCamera.rotationY);
      this.tpCamera.update(delta);
    } else {
      this.controls.update();
    }
    
    this.prevTime = time;
    this.renderer.render(this.scene, this.camera);
  };

  public buildHouse(config: SteelHouseConfig) {
    while (this.houseGroup.children.length > 0) {
      this.disposeObject(this.houseGroup.children[0]);
      this.houseGroup.remove(this.houseGroup.children[0]);
    }
    while (this.openingsGroup.children.length > 0) {
      this.disposeObject(this.openingsGroup.children[0]);
      this.openingsGroup.remove(this.openingsGroup.children[0]);
    }

    this.collisions.clear();

    config.walls.forEach(wall => {
      const wallGroup = new THREE.Group();
      wallGroup.position.set(wall.x, 0, wall.z);
      wallGroup.rotation.y = (wall.rotation * Math.PI) / 180;
      this.houseGroup.add(wallGroup);

      if (!config.structuralMode) {
        if (config.layers.exteriorPanels) {
          const mesh = this.createPanelMesh(wall, 'exterior');
          wallGroup.add(mesh);
          this.collisions.registerWall(mesh);
        }
        if (config.layers.interiorPanels) {
          const mesh = this.createPanelMesh(wall, 'interior');
          wallGroup.add(mesh);
          this.collisions.registerWall(mesh);
        }
      }

      if (config.layers.steelProfiles) {
        this.generateWallStructure(wall, wallGroup, config.layers, config);
      }
      this.createOpeningTriggers(wall);
    });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40000, 40000),
      new THREE.MeshStandardMaterial({ color: this.colors.floor })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5;
    floor.receiveShadow = true;
    this.houseGroup.add(floor);
  }

  private generateWallStructure(wall: SteelWall, group: THREE.Group, layers: LayerVisibility, config: SteelHouseConfig) {
    const structuralGroup = new THREE.Group();
    group.add(structuralGroup);

    structuralGroup.add(this.createProfile(wall.length, 0, 0, 0, 'PGU'));
    structuralGroup.add(this.createProfile(wall.length, 0, wall.height - this.profileFlange, 0, 'PGU'));

    const studHeight = wall.height - (this.profileFlange * 2);

    wall.openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const headerH = sill + op.height;
      
      const headerAnalysis = StructuralEngine.calculateHeader(op, config);

      structuralGroup.add(this.createProfile(studHeight, op.position - this.profileFlange * 2, this.profileFlange, 90, 'PGC', this.colors.king));
      structuralGroup.add(this.createProfile(studHeight, op.position + op.width + this.profileFlange, this.profileFlange, 90, 'PGC', this.colors.king));

      const jackH = headerH - this.profileFlange;
      structuralGroup.add(this.createProfile(jackH, op.position - this.profileFlange, this.profileFlange, 90, 'PGC', this.colors.jack));
      structuralGroup.add(this.createProfile(jackH, op.position + op.width, this.profileFlange, 90, 'PGC', this.colors.jack));

      if (headerAnalysis.type === 'truss') {
        const trussH = 300;
        const diagCount = Math.max(2, Math.ceil(op.width / 400));
        const diagW = op.width / diagCount;
        structuralGroup.add(this.createProfile(op.width, op.position, headerH, 0, 'PGC', this.colors.headerTriple));
        structuralGroup.add(this.createProfile(op.width, op.position, headerH + trussH, 0, 'PGC', this.colors.headerTriple));
        for (let i = 0; i < diagCount; i++) {
          const diagLen = Math.sqrt(Math.pow(diagW, 2) + Math.pow(trussH, 2));
          const angle = Math.atan2(trussH, diagW);
          const mesh = this.createProfile(diagLen, op.position + (i * diagW), headerH, 0, 'PGC', this.colors.header);
          mesh.rotation.z = (i % 2 === 0) ? angle : -angle;
          mesh.position.y += (i % 2 === 0) ? 0 : trussH;
          structuralGroup.add(mesh);
        }
      } else if (headerAnalysis.type === 'tube') {
        const tubeMesh = this.createProfile(op.width, op.position, headerH, 0, 'PGC', this.colors.headerTube);
        tubeMesh.scale.y = 2.5; 
        structuralGroup.add(tubeMesh);
      } else {
        const count = headerAnalysis.type === 'triple' ? 3 : (headerAnalysis.type === 'double' ? 2 : 1);
        const color = count === 3 ? this.colors.headerTriple : this.colors.header;
        for (let i = 0; i < count; i++) {
          structuralGroup.add(this.createProfile(op.width, op.position, headerH, 0, 'PGC', color, i * 15));
        }
      }

      if (op.type === 'window') {
        structuralGroup.add(this.createProfile(op.width, op.position, sill - this.profileFlange, 0, 'PGU', this.colors.steel));
      }

      const crippleSpacing = wall.studSpacing;
      for (let x = op.position + crippleSpacing; x < op.position + op.width; x += crippleSpacing) {
        const topSpace = wall.height - headerH - (headerAnalysis.type === 'truss' ? 350 : this.profileFlange * 2);
        if (topSpace > 50) {
          structuralGroup.add(this.createProfile(topSpace, x, wall.height - topSpace - this.profileFlange, 90, 'PGC', this.colors.steel));
        }
        if (op.type === 'window' && sill > 100) {
          structuralGroup.add(this.createProfile(sill - this.profileFlange * 2, x, this.profileFlange, 90, 'PGC', this.colors.steel));
        }
      }
    });

    const addStud = (x: number) => {
      const inOpening = wall.openings.some(op => x >= (op.position - 10) && x <= (op.position + op.width + 10));
      if (!inOpening) {
        structuralGroup.add(this.createProfile(studHeight, x, this.profileFlange, 90, 'PGC'));
      }
    };

    addStud(0);
    addStud(wall.length - this.profileFlange);
    const count = Math.floor(wall.length / wall.studSpacing);
    for (let i = 1; i <= count; i++) addStud(i * wall.studSpacing);
  }

  private createProfile(len: number, x: number, y: number, rotZ: number, type: 'PGC' | 'PGU', color?: number, zOffset: number = 0): THREE.Mesh {
    const isVertical = rotZ === 90;
    const geom = new THREE.BoxGeometry(isVertical ? this.profileFlange : len, isVertical ? len : this.profileFlange, this.profileWidth);
    const mat = new THREE.MeshStandardMaterial({ color: color || this.colors.steel, metalness: 0.8, roughness: 0.2 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x + (isVertical ? this.profileFlange / 2 : len / 2), y + (isVertical ? len / 2 : this.profileFlange / 2), zOffset);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createPanelMesh(wall: SteelWall, side: 'exterior' | 'interior'): THREE.Mesh {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(wall.length, 0); shape.lineTo(wall.length, wall.height); shape.lineTo(0, wall.height); shape.lineTo(0, 0);
    wall.openings.forEach(op => {
      const hole = new THREE.Path();
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      hole.moveTo(op.position, sill); hole.lineTo(op.position + op.width, sill); hole.lineTo(op.position + op.width, sill + op.height); hole.lineTo(op.position, sill + op.height); hole.lineTo(op.position, sill);
      shape.holes.push(hole);
    });
    const mesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 12, beveled: false }),
      new THREE.MeshStandardMaterial({ color: side === 'exterior' ? this.colors.panel_ext : this.colors.panel_int })
    );
    mesh.position.z = side === 'exterior' ? -65 : 50;
    mesh.userData = { wallId: wall.id, isWall: true };
    return mesh;
  }

  private createOpeningTriggers(wall: SteelWall) {
    wall.openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(op.width, op.height, 120),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
      );
      const matrix = new THREE.Matrix4().makeRotationY((wall.rotation * Math.PI) / 180).setPosition(wall.x, 0, wall.z);
      const pos = new THREE.Vector3(op.position + op.width / 2, sill + op.height / 2, 0).applyMatrix4(matrix);
      mesh.position.copy(pos);
      mesh.rotation.y = (wall.rotation * Math.PI) / 180;
      mesh.userData = { wallId: wall.id, opening: op };
      this.openingsGroup.add(mesh);
    });
  }

  private disposeObject(obj: THREE.Object3D) {
    obj.traverse(c => {
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
        else c.material.dispose();
      }
    });
  }

  public dispose() {
    this.renderer.dispose();
    this.controls.dispose();
  }
}
