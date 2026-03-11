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
  private internalWallsGroup: THREE.Group;
  
  private container: HTMLElement;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private input: InputController;
  private collisions: CollisionSystem;
  private player: PlayerController;
  private tpCamera: ThirdPersonCamera;
  private isWalkModeActive = false;

  private prevTime = performance.now();

  public onOpeningDoubleClick: ((wallId: string, opening: SteelOpening, isInternal?: boolean) => void) | null = null;
  public onWallDoubleClick: ((wallId: string, x: number, side: 'exterior' | 'interior') => void) | null = null;
  public onWalkModeLock: ((locked: boolean) => void) | null = null;
  public onInternalWallDoubleClick: ((iw: InternalWall) => void) | null = null;

  private colors = {
    background: 0xf1f5f9,
    steel: 0x9ca3af,      
    steelDrywall: 0x64748b, 
    header: 0x2563eb,
    king: 0xef4444,
    jack: 0xf59e0b,
    cripple: 0x8b5cf6, // Color distintivo para cripples
    floor: 0xe2e8f0,
    panel_ext: 0x94a3b8,
    panel_int: 0xd1d5db,
    blocking: 0x22c55e,   
    junction: 0x3b82f6,   
    corner: 0xef4444,     
    bracing: 0xf59e0b,
    status_ok: 0x22c55e,
    status_warning: 0xf59e0b,
    status_error: 0xef4444
  };

  private profileWidth = 100; 
  private drywallProfileWidth = 70;
  private profileFlange = 40;  

  constructor(container: HTMLElement) {
    this.container = container;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.colors.background);

    this.camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 10, 100000);
    this.camera.position.set(8000, 6000, 8000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;

    while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
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

    this.internalWallsGroup = new THREE.Group();
    this.scene.add(this.internalWallsGroup);

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
      const { wallId, opening, isInternal } = openingIntersects[0].object.userData;
      if (this.onOpeningDoubleClick) this.onOpeningDoubleClick(wallId, opening, isInternal);
      return;
    }

    const internalIntersects = this.raycaster.intersectObjects(this.internalWallsGroup.children, true);
    if (internalIntersects.length > 0) {
      let object = internalIntersects[0].object;
      while (object.parent && !object.userData.isInternalWall) object = object.parent;
      if (object.userData.isInternalWall && this.onInternalWallDoubleClick) {
        this.onInternalWallDoubleClick(object.userData.internalWall);
        return;
      }
    }

    const wallIntersects = this.raycaster.intersectObjects(this.houseGroup.children, true);
    const wallHit = wallIntersects.find(i => i.object.userData.isWall);
    if (wallHit) {
      const { wallId, side } = wallHit.object.userData;
      const localPoint = wallHit.object.worldToLocal(wallHit.point.clone());
      if (this.onWallDoubleClick) this.onWallDoubleClick(wallId, localPoint.x, side);
    }
  };

  private animate = () => {
    if (!this.renderer || !this.scene || !this.camera) return;
    requestAnimationFrame(this.animate);
    const time = performance.now();
    const delta = Math.min((time - this.prevTime) / 1000, 0.1);

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
    [this.houseGroup, this.openingsGroup, this.internalWallsGroup].forEach(group => {
      while (group.children.length > 0) {
        const child = group.children[0];
        this.disposeObject(child);
        group.remove(child);
      }
    });

    this.collisions.clear();

    config.walls.forEach(wall => {
      const wallGroup = new THREE.Group();
      wallGroup.position.set(wall.x, 0, wall.z);
      wallGroup.rotation.y = (wall.rotation * Math.PI) / 180;
      this.houseGroup.add(wallGroup);
      wallGroup.updateMatrixWorld(true);

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
      this.createOpeningTriggers(wall.id, wall.length, wall.height, wall.rotation, wall.x, wall.z, wall.openings, false, config);
    });

    config.internalWalls.forEach(iw => {
      const parent = config.walls.find(w => w.id === iw.parentWallId);
      if (!parent) return;

      const iwGroup = new THREE.Group();
      iwGroup.userData = { isInternalWall: true, internalWall: iw };
      
      const parentMatrix = new THREE.Matrix4().makeRotationY((parent.rotation * Math.PI) / 180).setPosition(parent.x, 0, parent.z);
      const pos = new THREE.Vector3(iw.xPosition, 0, 50).applyMatrix4(parentMatrix);
      
      iwGroup.position.copy(pos);
      iwGroup.rotation.y = (iw.rotation * Math.PI) / 180;
      this.internalWallsGroup.add(iwGroup);
      iwGroup.updateMatrixWorld(true);

      this.generateInternalWall(iw, iwGroup, config);
      this.createOpeningTriggers(iw.id, iw.length, iw.height, iw.rotation, iwGroup.position.x, iwGroup.position.z, iw.openings || [], true, config);
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshStandardMaterial({ color: this.colors.floor }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5;
    floor.receiveShadow = true;
    this.houseGroup.add(floor);
  }

  private generateInternalWall(iw: InternalWall, group: THREE.Group, config: SteelHouseConfig) {
    const thickness = this.drywallProfileWidth;
    const height = iw.height;
    const len = iw.length;
    const openings = iw.openings || [];

    if (config.layers.steelProfiles) {
      const panels = StructuralEngine.calculateWallPanels(iw, config);
      const studHeight = height - this.profileFlange * 2;

      panels.forEach(panel => {
        group.add(this.createProfile(panel.width, panel.xStart, 0, 0, 'PGU', this.colors.steelDrywall, 0, thickness));
        group.add(this.createProfile(panel.width, panel.xStart, height - this.profileFlange, 0, 'PGU', this.colors.steelDrywall, 0, thickness));

        for (let x = panel.xStart; x < panel.xEnd - 10; x += 400) {
          const inOpening = openings.some(op => x >= (op.position - 10) && x <= (op.position + op.width + 10));
          if (!inOpening) group.add(this.createProfile(studHeight, x, this.profileFlange, 90, 'PGC', this.colors.steelDrywall, 0, thickness));
        }
        if (panel.isWallEnd) group.add(this.createProfile(studHeight, panel.xEnd - this.profileFlange, this.profileFlange, 90, 'PGC', this.colors.steelDrywall, 0, thickness));
      });

      openings.forEach(op => {
        const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
        const headerH = sill + op.height;
        group.add(this.createProfile(studHeight, op.position - this.profileFlange, this.profileFlange, 90, 'PGC', this.colors.king, 0, thickness));
        group.add(this.createProfile(studHeight, op.position + op.width, this.profileFlange, 90, 'PGC', this.colors.king, 0, thickness));
        group.add(this.createProfile(op.width, op.position, headerH, 0, 'PGC', this.colors.header, 0, thickness));
        
        // Cripples para tabiques internos
        StructuralEngine.calculateCrippleStuds(iw, op).forEach(c => {
          group.add(this.createProfile(c.yEnd - c.yStart, c.x, c.yStart, 90, 'PGC', this.colors.cripple, 0, thickness));
        });
      });

      if (config.layers.horizontalBlocking) {
        StructuralEngine.calculateBlocking(iw).forEach(b => {
          group.add(this.createProfile(b.xEnd - b.xStart, b.xStart, b.y, 0, 'PGU', this.colors.blocking, 0, thickness));
        });
      }
    }

    if (!config.structuralMode && config.layers.interiorPanels) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(len, 0); shape.lineTo(len, height); shape.lineTo(0, height); shape.lineTo(0, 0);
      openings.forEach(op => {
        const hole = new THREE.Path();
        const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
        hole.moveTo(op.position, sill); hole.lineTo(op.position + op.width, sill); hole.lineTo(op.position + op.width, sill + op.height); hole.lineTo(op.position, sill + op.height); hole.lineTo(op.position, sill);
        shape.holes.push(hole);
      });
      const panelGeom = new THREE.ExtrudeGeometry(shape, { depth: 12.5, beveled: false });
      const p1 = new THREE.Mesh(panelGeom, new THREE.MeshStandardMaterial({ color: this.colors.panel_int }));
      p1.position.z = thickness/2;
      group.add(p1);
      const p2 = new THREE.Mesh(panelGeom, new THREE.MeshStandardMaterial({ color: this.colors.panel_int }));
      p2.position.z = -thickness/2 - 12.5;
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

      const startStudsCount = panel.isWallStart ? 3 : 2; 
      for (let i = 0; i < startStudsCount; i++) {
        structuralGroup.add(this.createProfile(studHeight, panel.xStart + (i * 10), this.profileFlange, 90, 'PGC', panel.isWallStart ? this.colors.corner : this.colors.junction));
      }

      for (let x = panel.xStart + wall.studSpacing; x < panel.xEnd - 10; x += wall.studSpacing) {
        const inOpening = wall.openings.some(op => x >= (op.position - 10) && x <= (op.position + op.width + 10));
        if (!inOpening) structuralGroup.add(this.createProfile(studHeight, x, this.profileFlange, 90, 'PGC'));
      }

      if (panel.isWallEnd) {
        for (let i = 0; i < 3; i++) {
          structuralGroup.add(this.createProfile(studHeight, panel.xEnd - this.profileFlange - (i * 10), this.profileFlange, 90, 'PGC', this.colors.corner));
        }
      }
    });

    if (layers.horizontalBlocking) {
      StructuralEngine.calculateBlocking(wall).forEach(b => {
        structuralGroup.add(this.createProfile(b.xEnd - b.xStart, b.xStart, b.y, 0, 'PGU', this.colors.blocking));
      });
    }

    wall.openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const headerH = sill + op.height;
      const analysis = StructuralEngine.calculateHeader(op, wall.length, config);
      const opColor = analysis.status === 'error' ? this.colors.status_error : (analysis.status === 'warning' ? this.colors.status_warning : this.colors.header);

      const fusedL = analysis.isFusedWithCorner === 'left';
      const fusedR = analysis.isFusedWithCorner === 'right';

      if (!fusedL) {
        structuralGroup.add(this.createProfile(studHeight, op.position - this.profileFlange * 2, this.profileFlange, 90, 'PGC', this.colors.king));
        structuralGroup.add(this.createProfile(headerH - this.profileFlange, op.position - this.profileFlange, this.profileFlange, 90, 'PGC', this.colors.jack));
      } else {
        structuralGroup.add(this.createProfile(headerH - this.profileFlange, op.position, this.profileFlange, 90, 'PGC', this.colors.jack));
      }

      if (!fusedR) {
        structuralGroup.add(this.createProfile(studHeight, op.position + op.width + this.profileFlange, this.profileFlange, 90, 'PGC', this.colors.king));
        structuralGroup.add(this.createProfile(headerH - this.profileFlange, op.position + op.width, this.profileFlange, 90, 'PGC', this.colors.jack));
      } else {
        structuralGroup.add(this.createProfile(headerH - this.profileFlange, op.position + op.width - this.profileFlange, this.profileFlange, 90, 'PGC', this.colors.jack));
      }

      const finalHeaderW = fusedL || fusedR ? op.width + 50 : op.width;
      const finalHeaderX = fusedL ? op.position - 50 : op.position;
      structuralGroup.add(this.createProfile(finalHeaderW, finalHeaderX, headerH, 0, 'PGC', opColor));
      
      if (op.type === 'window') {
        structuralGroup.add(this.createProfile(op.width, op.position, sill - this.profileFlange, 0, 'PGU', this.colors.steel));
      }

      // CRIpple Studs (Modulación continua sobre y bajo el vano)
      StructuralEngine.calculateCrippleStuds(wall, op).forEach(c => {
        structuralGroup.add(this.createProfile(c.yEnd - c.yStart, c.x, c.yStart, 90, 'PGC', this.colors.cripple));
      });
    });
  }

  private createProfile(len: number, x: number, y: number, rotZ: number, type: 'PGC' | 'PGU', color?: number, zOffset: number = 0, customWidth?: number): THREE.Mesh {
    const width = customWidth || this.profileWidth;
    const isVertical = rotZ === 90;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(isVertical ? this.profileFlange : len, isVertical ? len : this.profileFlange, width),
      new THREE.MeshStandardMaterial({ color: color || this.colors.steel, metalness: 0.8, roughness: 0.2 })
    );
    mesh.position.set(x + (isVertical ? this.profileFlange / 2 : len / 2), y + (isVertical ? len / 2 : this.profileFlange / 2), zOffset);
    mesh.castShadow = mesh.receiveShadow = true;
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
      new THREE.MeshStandardMaterial({ color: side === 'exterior' ? this.colors.panel_ext : this.colors.panel_int, transparent: true, opacity: side === 'exterior' ? 1 : 0.8 })
    );
    mesh.position.z = side === 'exterior' ? -65 : 55;
    mesh.userData = { wallId: wall.id, isWall: true, side: side };
    return mesh;
  }

  private createOpeningTriggers(wallId: string, length: number, height: number, rotation: number, x: number, z: number, openings: SteelOpening[], isInternal: boolean, config: SteelHouseConfig) {
    openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const analysis = StructuralEngine.calculateHeader(op, length, config);
      const opColor = analysis.status === 'error' ? 0xff0000 : (analysis.status === 'warning' ? 0xffff00 : 0x00ff00);

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(op.width, op.height, 120),
        new THREE.MeshBasicMaterial({ color: opColor, transparent: true, opacity: 0.1 })
      );
      const matrix = new THREE.Matrix4().makeRotationY((rotation * Math.PI) / 180).setPosition(x, 0, z);
      const pos = new THREE.Vector3(op.position + op.width / 2, sill + op.height / 2, 0).applyMatrix4(matrix);
      mesh.position.copy(pos);
      mesh.rotation.y = (rotation * Math.PI) / 180;
      mesh.userData = { wallId, opening: op, isInternal };
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
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.domElement.removeEventListener('dblclick', this.onDoubleClick);
    this.renderer.dispose();
    this.controls.dispose();
  }
}
