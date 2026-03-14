'use client';

import * as THREE_LIB from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SteelHouseConfig, SteelWall, SteelOpening, LayerVisibility, InternalWall } from '@/lib/steel/types';
import { InputController } from '@/engine/player/InputController';
import { CollisionSystem } from '@/engine/player/CollisionSystem';
import { PlayerController } from '@/engine/player/PlayerController';
import { ThirdPersonCamera } from '@/engine/player/ThirdPersonCamera';

const THREE = THREE_LIB;

export class SteelSceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  
  private houseGroup: THREE.Group;
  private openingsGroup: THREE.Group;
  private internalWallsGroup: THREE.Group;
  private floorMesh: THREE.Mesh | null = null;
  
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
  public onInternalWallDoubleClick: ((iw: InternalWall, x: number) => void) | null = null;
  public onFloorDoubleClick: ((x: number, z: number) => void) | null = null;

  private colors = {
    background: 0xf1f5f9,
    steel: 0x9ca3af,      
    steelDrywall: 0x64748b, 
    header: 0x2563eb,
    header_truss: 0x7c3aed, 
    king: 0xef4444,
    jack: 0xf59e0b,
    cripple: 0x8b5cf6, 
    floor: 0xe2e8f0,
    panel_ext: 0x94a3b8,
    panel_int: 0xd1d5db,
    blocking: 0x22c55e,   
    junction: 0x3b82f6,   
    corner: 0xef4444,     
    bracing: 0xf59e0b,
    status_ok: 0x22c55e,
    status_warning: 0xf59e0b,
    status_error: 0xef4444,
    ladder: 0xec4899 
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
    const box = new THREE.Box3().setFromObject(this.houseGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.controls.target.copy(center);
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
      const hitPoint = internalIntersects[0].point.clone();
      while (object.parent && !object.userData.isInternalWall) object = object.parent;
      if (object.userData.isInternalWall && this.onInternalWallDoubleClick) {
        const localPoint = object.worldToLocal(hitPoint);
        this.onInternalWallDoubleClick(object.userData.internalWall, localPoint.x);
        return;
      }
    }

    const wallIntersects = this.raycaster.intersectObjects(this.houseGroup.children, true);
    const wallHit = wallIntersects.find(i => i.object.userData.isWall);
    if (wallHit) {
      const { wallId, side } = wallHit.object.userData;
      const localPoint = wallHit.object.worldToLocal(wallHit.point.clone());
      if (this.onWallDoubleClick) this.onWallDoubleClick(wallId, localPoint.x, side);
      return;
    }

    if (this.floorMesh) {
      const floorIntersects = this.raycaster.intersectObject(this.floorMesh);
      if (floorIntersects.length > 0 && this.onFloorDoubleClick) {
        this.onFloorDoubleClick(floorIntersects[0].point.x, floorIntersects[0].point.z);
      }
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

  public buildHouse(config: SteelHouseConfig, structuralResult: any) {
    [this.houseGroup, this.openingsGroup, this.internalWallsGroup].forEach(group => {
      while (group.children.length > 0) {
        const child = group.children[0];
        this.disposeObject(child);
        group.remove(child);
      }
    });
    this.collisions.clear();

    config.walls.forEach(wall => {
      const processed = structuralResult.processedWalls.find((pw: any) => pw.id === wall.id);
      const wallGroup = new THREE.Group();
      wallGroup.position.set(wall.x, 0, wall.z);
      wallGroup.rotation.y = (wall.rotation * Math.PI) / 180;
      this.houseGroup.add(wallGroup);
      wallGroup.updateMatrixWorld(true);
      
      if (!config.structuralMode) {
        if (config.layers.exteriorPanels) wallGroup.add(this.createPanelMesh(wall, 'exterior', config));
        if (config.layers.interiorPanels) wallGroup.add(this.createPanelMesh(wall, 'interior', config));
      }
      
      if (config.layers.steelProfiles && processed) {
        this.renderProcessedStructure(wall, processed, wallGroup, config.layers);
      }
      this.createOpeningTriggers(wall.id, wall.length, wall.height, wall.rotation, wall.x, wall.z, wall.openings, false, processed?.headers || [], 100);
    });

    config.internalWalls.forEach(iw => {
      const processed = structuralResult.processedInternalWalls.find((piw: any) => piw.id === iw.id);
      const iwGroup = new THREE.Group();
      iwGroup.userData = { isInternalWall: true, internalWall: iw };
      const globalPos = this.calculateGlobalPosition(iw, config);
      iwGroup.position.copy(globalPos);
      iwGroup.rotation.y = (iw.rotation * Math.PI) / 180;
      this.internalWallsGroup.add(iwGroup);
      iwGroup.updateMatrixWorld(true);
      
      this.renderProcessedInternalWall(iw, processed, iwGroup, config);
      this.createOpeningTriggers(iw.id, iw.length, iw.height, iw.rotation, iwGroup.position.x, iwGroup.position.z, iw.openings || [], true, processed?.headers || [], 70);
    });

    const floorGeom = new THREE.PlaneGeometry(40000, 40000);
    const floorMat = new THREE.MeshStandardMaterial({ color: this.colors.floor });
    this.floorMesh = new THREE.Mesh(floorGeom, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = -5;
    this.floorMesh.receiveShadow = true;
    this.houseGroup.add(this.floorMesh);
  }

  private renderProcessedStructure(wall: SteelWall, processed: any, group: THREE.Group, layers: LayerVisibility) {
    const structuralGroup = new THREE.Group();
    group.add(structuralGroup);
    const studHeight = wall.height - (this.profileFlange * 2);

    processed.panels.forEach((p: any) => {
      const collMesh = new THREE.Mesh(new THREE.BoxGeometry(p.width, wall.height, wall.thickness + 20), new THREE.MeshBasicMaterial({ visible: false }));
      collMesh.position.set(p.xStart + p.width/2, wall.height/2, 0);
      group.add(collMesh);
      this.collisions.registerWall(collMesh);

      structuralGroup.add(this.createProfile(p.width, p.xStart, 0, 0, 'PGU'));
      structuralGroup.add(this.createProfile(p.width, p.xStart, wall.height - this.profileFlange, 0, 'PGU'));
      
      const startStudsCount = p.isWallStart ? 3 : 2; 
      for (let i = 0; i < startStudsCount; i++) structuralGroup.add(this.createProfile(studHeight, p.xStart + (i * 10), this.profileFlange, 90, 'PGC', p.isWallStart ? this.colors.corner : this.colors.junction));
      
      for (let x = p.xStart + wall.studSpacing; x < p.xEnd - 10; x += wall.studSpacing) {
        const inOpening = wall.openings.some(op => x >= (op.position - 10) && x <= (op.position + op.width + 10));
        if (!inOpening) structuralGroup.add(this.createProfile(studHeight, x, this.profileFlange, 90, 'PGC'));
      }
      
      if (p.isWallEnd) { 
        for (let i = 0; i < 3; i++) structuralGroup.add(this.createProfile(studHeight, p.xEnd - this.profileFlange - (i * 10), this.profileFlange, 90, 'PGC', this.colors.corner)); 
      }
    });

    if (layers.horizontalBlocking) {
      processed.blockings.forEach((b: any) => structuralGroup.add(this.createProfile(b.xEnd - b.xStart, b.xStart, b.y, 0, 'PGU', this.colors.blocking)));
    }

    wall.openings.forEach(op => {
      const headerData = processed.headers.find((h: any) => h.openingId === op.id);
      if (!headerData) return;

      const analysis = headerData.analysis;
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const headerBottom = sill + op.height;
      const headerHeight = analysis.actualHeight;
      
      const fusion = analysis.isFusedWithCorner;
      const numKings = analysis.type === 'truss' ? 3 : 1;

      for (let i = 0; i < numKings; i++) {
        if (fusion !== 'left') structuralGroup.add(this.createProfile(studHeight, op.position - this.profileFlange * (2 + i), this.profileFlange, 90, 'PGC', this.colors.king));
        if (fusion !== 'right') structuralGroup.add(this.createProfile(studHeight, op.position + op.width + this.profileFlange * (1 + i), this.profileFlange, 90, 'PGC', this.colors.king));
      }

      if (fusion !== 'left') structuralGroup.add(this.createProfile(headerBottom - this.profileFlange, op.position - this.profileFlange, this.profileFlange, 90, 'PGC', this.colors.jack));
      if (fusion !== 'right') structuralGroup.add(this.createProfile(headerBottom - this.profileFlange, op.position + op.width, this.profileFlange, 90, 'PGC', this.colors.jack));

      if (analysis.type === 'truss') {
        this.drawTrussHeader(structuralGroup, op.position, headerBottom, op.width, headerHeight, this.profileWidth);
      } else {
        const headerColor = analysis.status === 'error' ? this.colors.status_error : (analysis.status === 'warning' ? this.colors.status_warning : this.colors.header);
        structuralGroup.add(this.createProfile(op.width, op.position, headerBottom, 0, 'PGC', headerColor, 0, this.profileWidth, headerHeight));
      }

      // RENDERIZADO DE SOLERA DE ANTEPECHO (PGU HORIZONTAL INFERIOR DE VENTANA)
      if (op.type === 'window') {
        structuralGroup.add(this.createProfile(op.width, op.position, sill - this.profileFlange, 0, 'PGU', this.colors.steel));
      }

      headerData.cripples.forEach((c: any) => structuralGroup.add(this.createProfile(c.yEnd - c.yStart, c.x, c.yStart, 90, 'PGC', this.colors.cripple)));
    });
  }

  private renderProcessedInternalWall(iw: InternalWall, processed: any, group: THREE.Group, config: SteelHouseConfig) {
    const thickness = this.drywallProfileWidth;
    if (processed) {
      processed.panels.forEach((p: any) => {
        const collMesh = new THREE.Mesh(new THREE.BoxGeometry(p.width, iw.height, thickness + 20), new THREE.MeshBasicMaterial({ visible: false }));
        collMesh.position.set(p.xStart + p.width/2, iw.height/2, 0);
        group.add(collMesh);
        this.collisions.registerWall(collMesh);
      });
    }

    if (!config.structuralMode && config.layers.interiorPanels) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(iw.length, 0); shape.lineTo(iw.length, iw.height); shape.lineTo(0, iw.height); shape.lineTo(0, 0);
      (iw.openings || []).forEach(op => {
        const hole = new THREE.Path();
        const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
        hole.moveTo(op.position, sill); hole.lineTo(op.position + op.width, sill); hole.lineTo(op.position + op.width, sill + op.height); hole.lineTo(op.position, sill + op.height); hole.lineTo(op.position, sill);
        shape.holes.push(hole);
      });
      const panelGeom = new THREE.ExtrudeGeometry(shape, { depth: 12.5, beveled: false });
      const p1 = new THREE.Mesh(panelGeom, new THREE.MeshStandardMaterial({ color: this.colors.panel_int }));
      p1.position.z = thickness/2; group.add(p1);
      const p2 = new THREE.Mesh(panelGeom, new THREE.MeshStandardMaterial({ color: this.colors.panel_int }));
      p2.position.z = -thickness/2 - 12.5; group.add(p2);
    }
  }

  private calculateGlobalPosition(iw: InternalWall, config: SteelHouseConfig): THREE.Vector3 {
    const extParent = config.walls.find(w => w.id === iw.parentWallId);
    if (extParent) {
      const parentMatrix = new THREE.Matrix4().makeRotationY((extParent.rotation * Math.PI) / 180).setPosition(extParent.x, 0, extParent.z);
      return new THREE.Vector3(iw.xPosition, 0, 50).applyMatrix4(parentMatrix);
    }
    const intParent = config.internalWalls.find(w => w.id === iw.parentWallId);
    if (intParent) {
      const parentGlobal = this.calculateGlobalPosition(intParent, config);
      const parentMatrix = new THREE.Matrix4().makeRotationY((intParent.rotation * Math.PI) / 180).setPosition(parentGlobal.x, 0, parentGlobal.z);
      return new THREE.Vector3(iw.xPosition, 0, 0).applyMatrix4(parentMatrix);
    }
    return new THREE.Vector3();
  }

  private drawTrussHeader(group: THREE.Group, x: number, y: number, w: number, h: number, thickness: number) {
    group.add(this.createProfile(w, x, y, 0, 'PGC', this.colors.header_truss, 0, thickness));
    group.add(this.createProfile(w, x, y + h - 40, 0, 'PGC', this.colors.header_truss, 0, thickness));
    const numDivisions = Math.ceil(w / 400);
    const divW = w / numDivisions;
    for (let i = 0; i <= numDivisions; i++) {
      const posX = x + (i * divW);
      if (posX >= x + w - 5) break;
      group.add(this.createProfile(h - 80, posX, y + 40, 90, 'PGC', this.colors.header_truss, 0, thickness));
      if (i < numDivisions) {
        const diagH = h - 80;
        const diagLen = Math.sqrt(divW * divW + diagH * diagH);
        const angle = Math.atan2(diagH, divW);
        const diagGeom = new THREE.BoxGeometry(diagLen, 15, thickness - 10);
        const diagMesh = new THREE.Mesh(diagGeom, new THREE.MeshStandardMaterial({ color: this.colors.header_truss, metalness: 0.8 }));
        diagMesh.position.set(posX + divW/2, y + h/2, 0);
        diagMesh.rotation.z = i % 2 === 0 ? angle : -angle;
        group.add(diagMesh);
      }
    }
  }

  private createProfile(len: number, x: number, y: number, rotZ: number, type: 'PGC' | 'PGU', color?: number, zOffset: number = 0, customWidth?: number, customHeight?: number): THREE.Mesh {
    const width = customWidth || this.profileWidth;
    const flangeHeight = customHeight || this.profileFlange;
    const isVertical = rotZ === 90;
    const geomH = isVertical ? len : flangeHeight;
    const geomW = isVertical ? this.profileFlange : len;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(geomW, geomH, width), new THREE.MeshStandardMaterial({ color: color || this.colors.steel, metalness: 0.8, roughness: 0.2 }));
    mesh.position.set(x + geomW / 2, y + geomH / 2, zOffset);
    mesh.castShadow = mesh.receiveShadow = true; 
    return mesh;
  }

  private createPanelMesh(wall: SteelWall, side: 'exterior' | 'interior', config: SteelHouseConfig): THREE.Mesh {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(wall.length, 0); shape.lineTo(wall.length, wall.height); shape.lineTo(0, wall.height); shape.lineTo(0, 0);
    wall.openings.forEach(op => {
      const hole = new THREE.Path(); const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      hole.moveTo(op.position, sill); hole.lineTo(op.position + op.width, sill); hole.lineTo(op.position + op.width, sill + op.height); hole.lineTo(op.position, sill + op.height); hole.lineTo(op.position, sill);
      shape.holes.push(hole);
    });
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 12, beveled: false }), new THREE.MeshStandardMaterial({ color: side === 'exterior' ? this.colors.panel_ext : this.colors.panel_int, transparent: true, opacity: side === 'exterior' ? 1 : 0.8 }));
    mesh.position.z = side === 'exterior' ? -62 : 50; mesh.userData = { wallId: wall.id, isWall: true, side: side }; return mesh;
  }

  private createOpeningTriggers(wallId: string, length: number, height: number, rotation: number, x: number, z: number, openings: SteelOpening[], isInternal: boolean, headers: any[], thickness: number) {
    openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const headerData = headers.find((h: any) => h.openingId === op.id);
      const status = headerData?.analysis?.status || 'ok';
      const opColor = status === 'error' ? 0xff0000 : (status === 'warning' ? 0xffff00 : 0x00ff00);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(op.width, op.height, thickness + 10), new THREE.MeshBasicMaterial({ color: opColor, transparent: true, opacity: 0.15 }));
      const matrix = new THREE.Matrix4().makeRotationY((rotation * Math.PI) / 180).setPosition(x, 0, z);
      const pos = new THREE.Vector3(op.position + op.width / 2, sill + op.height / 2, 0).applyMatrix4(matrix);
      mesh.position.copy(pos); mesh.rotation.y = (rotation * Math.PI) / 180; mesh.userData = { wallId, opening: op, isInternal };
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
