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

  // Callbacks dinámicos
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
    floor: 0xe2e8f0,
    panel_ext: 0x94a3b8,
    panel_int: 0xd1d5db,
    blocking: 0x22c55e,   
    junction: 0x3b82f6,   
    corner: 0xef4444,     
    highlight: 0xae1ae2
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

    // 1. Detección de aberturas
    const openingIntersects = this.raycaster.intersectObjects(this.openingsGroup.children);
    if (openingIntersects.length > 0) {
      const { wallId, opening, isInternal } = openingIntersects[0].object.userData;
      if (this.onOpeningDoubleClick) this.onOpeningDoubleClick(wallId, opening, isInternal);
      return;
    }

    // 2. Detección de muros internos
    const internalIntersects = this.raycaster.intersectObjects(this.internalWallsGroup.children, true);
    if (internalIntersects.length > 0) {
      let object = internalIntersects[0].object;
      while (object.parent && !object.userData.isInternalWall) object = object.parent;
      if (object.userData.isInternalWall && this.onInternalWallDoubleClick) {
        this.onInternalWallDoubleClick(object.userData.internalWall);
        return;
      }
    }

    // 3. Detección de muros perimetrales
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
    // Limpieza
    [this.houseGroup, this.openingsGroup, this.internalWallsGroup].forEach(group => {
      while (group.children.length > 0) {
        const child = group.children[0];
        this.disposeObject(child);
        group.remove(child);
      }
    });

    this.collisions.clear();

    // Muros Perimetrales
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
      this.createOpeningTriggers(wall.id, wall.length, wall.height, wall.rotation, wall.x, wall.z, wall.openings, false);
    });

    // Muros Internos
    config.internalWalls.forEach(iw => {
      const parent = config.walls.find(w => w.id === iw.parentWallId);
      if (!parent) return;

      const iwGroup = new THREE.Group();
      iwGroup.userData = { isInternalWall: true, internalWall: iw };
      
      const parentMatrix = new THREE.Matrix4()
        .makeRotationY((parent.rotation * Math.PI) / 180)
        .setPosition(parent.x, 0, parent.z);
      
      const pos = new THREE.Vector3(iw.xPosition, 0, 50).applyMatrix4(parentMatrix);
      
      iwGroup.position.copy(pos);
      iwGroup.rotation.y = (iw.rotation * Math.PI) / 180;
      this.internalWallsGroup.add(iwGroup);
      iwGroup.updateMatrixWorld(true);

      this.generateInternalWall(iw, iwGroup, config);
      this.createOpeningTriggers(iw.id, iw.length, iw.height, iw.rotation, iwGroup.position.x, iwGroup.position.z, iw.openings || [], true);
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
    const openings = iw.openings || [];

    if (config.layers.steelProfiles) {
      group.add(this.createProfile(len, 0, 0, 0, 'PGU', this.colors.steelDrywall, 0, thickness));
      group.add(this.createProfile(len, 0, height - this.profileFlange, 0, 'PGU', this.colors.steelDrywall, 0, thickness));

      for (let x = 0; x <= len; x += 400) {
        const finalX = Math.min(x, len - this.profileFlange);
        const inOpening = openings.some(op => finalX >= (op.position - 10) && finalX <= (op.position + op.width + 10));
        if (!inOpening) {
          group.add(this.createProfile(height - this.profileFlange * 2, finalX, this.profileFlange, 90, 'PGC', this.colors.steelDrywall, 0, thickness));
        }
      }

      // Estructura de vanos internos
      openings.forEach(op => {
        const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
        const headerH = sill + op.height;
        group.add(this.createProfile(height - this.profileFlange * 2, op.position - this.profileFlange, this.profileFlange, 90, 'PGC', this.colors.steelDrywall, 0, thickness));
        group.add(this.createProfile(height - this.profileFlange * 2, op.position + op.width, this.profileFlange, 90, 'PGC', this.colors.steelDrywall, 0, thickness));
        group.add(this.createProfile(op.width, op.position, headerH, 0, 'PGC', this.colors.header, 0, thickness));
      });
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
      const panelMat = new THREE.MeshStandardMaterial({ color: this.colors.panel_int });
      
      const p1 = new THREE.Mesh(panelGeom, panelMat);
      p1.position.z = thickness/2;
      group.add(p1);

      const p2 = new THREE.Mesh(panelGeom, panelMat);
      p2.position.z = -thickness/2 - 12.5;
      group.add(p2);
      
      this.collisions.registerWall(p1);
      this.collisions.registerWall(p2);
    }

    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(len, height, thickness + 30),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    hitBox.position.set(len/2, height/2, 0);
    group.add(hitBox);
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
        if (!inOpening) structuralGroup.add(this.createProfile(studHeight, x, this.profileFlange, 90, 'PGC'));
      }

      if (panel.isWallEnd) {
        for (let i = 0; i < 3; i++) {
          structuralGroup.add(this.createProfile(studHeight, panel.xEnd - this.profileFlange - (i * 10), this.profileFlange, 90, 'PGC', this.colors.corner));
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
      
      structuralGroup.add(this.createProfile(studHeight, op.position - this.profileFlange * 2, this.profileFlange, 90, 'PGC', this.colors.king));
      structuralGroup.add(this.createProfile(studHeight, op.position + op.width + this.profileFlange, this.profileFlange, 90, 'PGC', this.colors.king));
      
      const jackH = headerH - this.profileFlange;
      structuralGroup.add(this.createProfile(jackH, op.position - this.profileFlange, this.profileFlange, 90, 'PGC', this.colors.jack));
      structuralGroup.add(this.createProfile(jackH, op.position + op.width, this.profileFlange, 90, 'PGC', this.colors.jack));

      structuralGroup.add(this.createProfile(op.width, op.position, headerH, 0, 'PGC', this.colors.header));

      if (op.type === 'window') {
        structuralGroup.add(this.createProfile(op.width, op.position, sill - this.profileFlange, 0, 'PGU', this.colors.steel));
      }
    });
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

  private createOpeningTriggers(wallId: string, length: number, height: number, rotation: number, x: number, z: number, openings: SteelOpening[], isInternal: boolean) {
    openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(op.width, op.height, 120),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
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
