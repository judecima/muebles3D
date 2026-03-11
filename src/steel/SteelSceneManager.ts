'use client';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SteelHouseConfig, SteelWall, SteelOpening, LayerVisibility, InternalWall } from '@/lib/steel/types';
import { StructuralEngine } from '@/utils/steel/structuralEngine';
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

  private input: InputController;
  private collisions: CollisionSystem;
  private player: PlayerController;
  private tpCamera: ThirdPersonCamera;
  private isWalkModeActive = false;

  private prevTime = performance.now();

  private onOpeningDoubleClickCallback?: (wallId: string, opening: SteelOpening) => void;
  private onWallDoubleClickCallback?: (wallId: string, x: number, side: 'exterior' | 'interior') => void;
  private onWalkModeLock?: (locked: boolean) => void;

  private colors = {
    background: 0xf1f5f9,
    steel: 0x9ca3af,      
    steelDrywall: 0x64748b, 
    header: 0x2563eb,
    headerTriple: 0x1e40af,
    headerTube: 0x0f172a,
    king: 0xef4444,
    jack: 0xf59e0b,
    grid: 0xd1d5db,
    floor: 0xe2e8f0,
    panel_ext: 0x94a3b8,
    panel_int: 0xd1d5db,
    blocking: 0x22c55e,   
    junction: 0x3b82f6,   
    corner: 0xef4444,     
    bracing: 0xf59e0b     
  };

  private profileWidth = 100; 
  private drywallProfileWidth = 70;
  private profileFlange = 40;  

  constructor(
    container: HTMLElement, 
    onOpeningDoubleClick?: (wallId: string, opening: SteelOpening) => void,
    onWallDoubleClick?: (wallId: string, x: number, side: 'exterior' | 'interior') => void,
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

    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

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

    const openingIntersects = this.raycaster.intersectObjects(this.openingsGroup.children);
    if (openingIntersects.length > 0) {
      const { wallId, opening } = openingIntersects[0].object.userData;
      if (this.onOpeningDoubleClickCallback) this.onOpeningDoubleClickCallback(wallId, opening);
      return;
    }

    const wallMeshes: THREE.Object3D[] = [];
    this.houseGroup.traverse(child => {
      if (child.userData && child.userData.isWall) wallMeshes.push(child);
    });

    const wallIntersects = this.raycaster.intersectObjects(wallMeshes);
    if (wallIntersects.length > 0) {
      const intersect = wallIntersects[0];
      const { wallId, side } = intersect.object.userData;
      const localPoint = intersect.object.worldToLocal(intersect.point.clone());
      if (this.onWallDoubleClickCallback) this.onWallDoubleClickCallback(wallId, localPoint.x, side);
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

    // Muros Perimetrales
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
        }
      }

      if (config.layers.steelProfiles) {
        this.generateWallStructure(wall, wallGroup, config.layers, config);
      }
      this.createOpeningTriggers(wall);
    });

    // Muros Internos (Drywall)
    config.internalWalls.forEach(iw => {
      const parent = config.walls.find(w => w.id === iw.parentWallId);
      if (!parent) return;

      const iwGroup = new THREE.Group();
      const parentMatrix = new THREE.Matrix4().makeRotationY((parent.rotation * Math.PI) / 180).setPosition(parent.x, 0, parent.z);
      const pos = new THREE.Vector3(iw.xPosition, 0, 50).applyMatrix4(parentMatrix);
      
      iwGroup.position.copy(pos);
      iwGroup.rotation.y = (iw.rotation * Math.PI) / 180;
      this.houseGroup.add(iwGroup);

      this.generateInternalWall(iw, iwGroup, config);
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

  private generateInternalWall(iw: InternalWall, group: THREE.Group, config: SteelHouseConfig) {
    const thickness = this.drywallProfileWidth;
    const height = iw.height;
    const len = iw.length;

    // Estructura Drywall
    if (config.layers.steelProfiles) {
      // Soleras Drywall
      group.add(this.createProfile(len, 0, 0, 0, 'PGU', this.colors.steelDrywall, 0, thickness));
      group.add(this.createProfile(len, 0, height - this.profileFlange, 0, 'PGU', this.colors.steelDrywall, 0, thickness));

      // Montantes Drywall (cada 400)
      for (let x = 0; x <= len; x += 400) {
        const finalX = Math.min(x, len - this.profileFlange);
        group.add(this.createProfile(height - this.profileFlange * 2, finalX, this.profileFlange, 90, 'PGC', this.colors.steelDrywall, 0, thickness));
      }
    }

    // Paneles Drywall (Yeso)
    if (!config.structuralMode && config.layers.interiorPanels) {
      const panelGeom = new THREE.BoxGeometry(len, height, 12.5);
      const panelMat = new THREE.MeshStandardMaterial({ color: this.colors.panel_int });
      
      const p1 = new THREE.Mesh(panelGeom, panelMat);
      p1.position.set(len/2, height/2, thickness/2 + 6.25);
      group.add(p1);

      const p2 = new THREE.Mesh(panelGeom, panelMat);
      p2.position.set(len/2, height/2, -thickness/2 - 6.25);
      group.add(p2);
      
      this.collisions.registerWall(p1);
      this.collisions.registerWall(p2);
    }
  }

  private generateWallStructure(wall: SteelWall, group: THREE.Group, layers: LayerVisibility, config: SteelHouseConfig) {
    const structuralGroup = new THREE.Group();
    group.add(structuralGroup);

    const panels = StructuralEngine.calculateWallPanels(wall, config);
    const studHeight = wall.height - (this.profileFlange * 2);

    panels.forEach(panel => {
      structuralGroup.add(this.createProfile(panel.width, panel.xStart, 0, 0, 'PGU'));
      structuralGroup.add(this.createProfile(panel.width, panel.xStart, wall.height - this.profileFlange, 0, 'PGU'));

      const junctionColor = panel.isWallStart ? this.colors.corner : this.colors.junction;
      const startStudCount = panel.isWallStart ? 3 : 2;
      
      for (let i = 0; i < startStudCount; i++) {
        structuralGroup.add(this.createProfile(studHeight, panel.xStart + (i * 10), this.profileFlange, 90, 'PGC', junctionColor));
      }

      for (let x = panel.xStart + wall.studSpacing; x < panel.xEnd - 50; x += wall.studSpacing) {
        const inOpening = wall.openings.some(op => x >= (op.position - 10) && x <= (op.position + op.width + 10));
        if (!inOpening) {
          structuralGroup.add(this.createProfile(studHeight, x, this.profileFlange, 90, 'PGC'));
        }
      }

      if (panel.isWallEnd) {
        for (let i = 0; i < 3; i++) {
          structuralGroup.add(this.createProfile(studHeight, panel.xEnd - this.profileFlange - (i * 10), this.profileFlange, 90, 'PGC', this.colors.corner));
        }
      }

      if (layers.bracing && panel.needsBracing) {
        const opInPanel = wall.openings.some(op => op.position < panel.xEnd && (op.position + op.width) > panel.xStart);
        if (!opInPanel) {
          this.createBracingCross(structuralGroup, panel.xStart, 0, panel.width, wall.height);
        }
      }
    });

    if (layers.horizontalBlocking) {
      const blocks = StructuralEngine.calculateBlocking(wall);
      blocks.forEach(b => {
        structuralGroup.add(this.createProfile(b.xEnd - b.xStart, b.xStart, b.y, 0, 'PGU', this.colors.blocking));
      });
    }

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
        this.createTrussHeader(structuralGroup, op.position, headerH, op.width);
      } else if (headerAnalysis.type === 'tube') {
        const tubeMesh = this.createProfile(op.width, op.position, headerH, 0, 'PGC', this.colors.headerTube);
        tubeMesh.scale.y = 2.5; 
        structuralGroup.add(tubeMesh);
      } else {
        const count = headerAnalysis.type === 'triple' ? 3 : (headerAnalysis.type === 'double' ? 2 : 1);
        for (let i = 0; i < count; i++) {
          structuralGroup.add(this.createProfile(op.width, op.position, headerH, 0, 'PGC', count >= 2 ? this.colors.headerTriple : this.colors.header, i * 15));
        }
      }

      if (op.type === 'window') {
        structuralGroup.add(this.createProfile(op.width, op.position, sill - this.profileFlange, 0, 'PGU', this.colors.steel));
      }
    });
  }

  private createBracingCross(group: THREE.Group, x: number, y: number, w: number, h: number) {
    const angle = Math.atan2(h, w);
    const length = Math.sqrt(w*w + h*h);
    const d1 = this.createProfile(length, x, y, 0, 'PGU', this.colors.bracing, 5);
    d1.rotation.z = angle;
    d1.position.set(x + w/2, y + h/2, 5);
    group.add(d1);
    const d2 = this.createProfile(length, x, y, 0, 'PGU', this.colors.bracing, -5);
    d2.rotation.z = -angle;
    d2.position.set(x + w/2, y + h/2, -5);
    group.add(d2);
  }

  private createTrussHeader(group: THREE.Group, x: number, y: number, w: number) {
    const trussH = 300;
    group.add(this.createProfile(w, x, y, 0, 'PGC', this.colors.headerTriple));
    group.add(this.createProfile(w, x, y + trussH, 0, 'PGC', this.colors.headerTriple));
    const count = Math.max(2, Math.ceil(w / 400));
    const step = w / count;
    for (let i = 0; i < count; i++) {
      const diagLen = Math.sqrt(step*step + trussH*trussH);
      const angle = Math.atan2(trussH, step);
      const diag = this.createProfile(diagLen, x + (i * step), y, 0, 'PGC', this.colors.header);
      diag.rotation.z = (i % 2 === 0) ? angle : -angle;
      diag.position.y += (i % 2 === 0) ? 0 : trussH;
      group.add(diag);
    }
  }

  private createProfile(len: number, x: number, y: number, rotZ: number, type: 'PGC' | 'PGU', color?: number, zOffset: number = 0, customWidth?: number): THREE.Mesh {
    const width = customWidth || this.profileWidth;
    const isVertical = rotZ === 90;
    const geom = new THREE.BoxGeometry(isVertical ? this.profileFlange : len, isVertical ? len : this.profileFlange, width);
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
    mesh.position.z = side === 'exterior' ? -65 : 55;
    mesh.userData = { wallId: wall.id, isWall: true, side: side };
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
