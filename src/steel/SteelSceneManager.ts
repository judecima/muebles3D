'use client';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { SteelHouseConfig, SteelWall, SteelOpening } from '@/lib/steel/types';

export class SteelSceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private fpControls: PointerLockControls;
  private houseGroup: THREE.Group;
  private openingsGroup: THREE.Group;
  private container: HTMLElement;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Movimiento FPS
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private moveUp = false;
  private moveDown = false;
  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private prevTime = performance.now();

  // Control Táctil para Mirada
  private touchStart = new THREE.Vector2();
  private isWalkModeActive = false;

  private onOpeningDoubleClickCallback?: (wallId: string, opening: SteelOpening) => void;
  private onWalkModeLock?: (locked: boolean) => void;

  private colors = {
    background: 0xf1f5f9,
    wall: 0x94a3b8,
    grid: 0xd1d5db,
    floor: 0xe2e8f0,
    outline: 0x475569,
    openingHover: 0x3b82f6
  };

  constructor(
    container: HTMLElement, 
    onOpeningDoubleClick?: (wallId: string, opening: SteelOpening) => void,
    onWalkModeLock?: (locked: boolean) => void
  ) {
    this.container = container;
    this.onOpeningDoubleClickCallback = onOpeningDoubleClick;
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

    // Controles de Inspección (Orbit)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // Controles de Caminata (FPS)
    this.fpControls = new PointerLockControls(this.camera, document.body);
    this.scene.add(this.fpControls.getObject());

    this.fpControls.addEventListener('lock', () => {
      this.controls.enabled = false;
      this.isWalkModeActive = true;
      if (this.onWalkModeLock) this.onWalkModeLock(true);
    });

    this.fpControls.addEventListener('unlock', () => {
      this.controls.enabled = true;
      this.isWalkModeActive = false;
      if (this.onWalkModeLock) this.onWalkModeLock(false);
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5000, 10000, 7500);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
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
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);

    // Eventos Táctiles para Móvil
    this.renderer.domElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.renderer.domElement.addEventListener('touchmove', this.onTouchMove, { passive: false });
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.isWalkModeActive) return;
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW': this.moveForward = true; break;
      case 'ArrowLeft':
      case 'KeyA': this.moveLeft = true; break;
      case 'ArrowDown':
      case 'KeyS': this.moveBackward = true; break;
      case 'ArrowRight':
      case 'KeyD': this.moveRight = true; break;
      case 'Space': this.moveUp = true; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.moveDown = true; break;
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW': this.moveForward = false; break;
      case 'ArrowLeft':
      case 'KeyA': this.moveLeft = false; break;
      case 'ArrowDown':
      case 'KeyS': this.moveBackward = false; break;
      case 'ArrowRight':
      case 'KeyD': this.moveRight = false; break;
      case 'Space': this.moveUp = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.moveDown = false; break;
    }
  };

  private onTouchStart = (event: TouchEvent) => {
    if (!this.isWalkModeActive) return;
    const touch = event.touches[0];
    this.touchStart.set(touch.clientX, touch.clientY);
  };

  private onTouchMove = (event: TouchEvent) => {
    if (!this.isWalkModeActive) return;
    event.preventDefault();
    const touch = event.touches[0];
    const movementX = touch.clientX - this.touchStart.x;
    const movementY = touch.clientY - this.touchStart.y;

    // Rotar cámara manualmente en móvil (PointerLock no bloquea en táctiles)
    const rotationSpeed = 0.005;
    this.camera.rotation.y -= movementX * rotationSpeed;
    this.camera.rotation.x -= movementY * rotationSpeed;
    this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));

    this.touchStart.set(touch.clientX, touch.clientY);
  };

  public setMovement(direction: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down', active: boolean) {
    switch (direction) {
      case 'forward': this.moveForward = active; break;
      case 'backward': this.moveBackward = active; break;
      case 'left': this.moveLeft = active; break;
      case 'right': this.moveRight = active; break;
      case 'up': this.moveUp = active; break;
      case 'down': this.moveDown = active; break;
    }
  }

  public enterWalkMode() {
    this.camera.position.y = 1700; // Altura de ojos (mm)
    this.isWalkModeActive = true;
    try {
      this.fpControls.lock();
    } catch (e) {
      // En móvil PointerLock puede fallar, pero activamos el modo igual
      if (this.onWalkModeLock) this.onWalkModeLock(true);
    }
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
    const intersects = this.raycaster.intersectObjects(this.openingsGroup.children);

    if (intersects.length > 0) {
      const openingMesh = intersects[0].object;
      const wallId = openingMesh.userData.wallId;
      const opening = openingMesh.userData.opening;
      if (this.onOpeningDoubleClickCallback && wallId && opening) {
        this.onOpeningDoubleClickCallback(wallId, opening);
      }
    }
  };

  private animate = () => {
    if (!this.renderer || !this.scene || !this.camera) return;
    requestAnimationFrame(this.animate);

    const time = performance.now();
    const delta = (time - this.prevTime) / 1000;

    if (this.isWalkModeActive) {
      this.velocity.x -= this.velocity.x * 10.0 * delta;
      this.velocity.z -= this.velocity.z * 10.0 * delta;
      this.velocity.y -= this.velocity.y * 10.0 * delta;

      this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
      this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
      this.direction.y = Number(this.moveUp) - Number(this.moveDown);
      this.direction.normalize();

      const speed = 40000.0; // Velocidad en mm/s

      if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * speed * delta;
      if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * speed * delta;
      if (this.moveUp || this.moveDown) this.velocity.y += this.direction.y * speed * delta;

      // Movimiento relativo a la cámara
      const worldDir = new THREE.Vector3();
      this.camera.getWorldDirection(worldDir);
      worldDir.y = 0;
      worldDir.normalize();

      const worldRight = new THREE.Vector3();
      worldRight.crossVectors(this.camera.up, worldDir).negate();

      const moveVec = new THREE.Vector3();
      moveVec.addScaledVector(worldDir, -this.velocity.z * delta);
      moveVec.addScaledVector(worldRight, this.velocity.x * delta);
      
      this.camera.position.add(moveVec);
      this.camera.position.y += (this.velocity.y * delta);
    } else {
      this.controls.update();
    }

    this.prevTime = time;
    this.renderer.render(this.scene, this.camera);
  };

  public buildHouse(config: SteelHouseConfig) {
    while (this.houseGroup.children.length > 0) {
      const child = this.houseGroup.children[0];
      this.disposeObject(child);
      this.houseGroup.remove(child);
    }

    while (this.openingsGroup.children.length > 0) {
      const child = this.openingsGroup.children[0];
      this.disposeObject(child);
      this.openingsGroup.remove(child);
    }

    const wallsBox = new THREE.Box3();
    
    config.walls.forEach(wall => {
      const wallMesh = this.createWallMesh(wall);
      this.houseGroup.add(wallMesh);
      wallsBox.expandByObject(wallMesh);
      
      this.createOpeningTriggers(wall);
    });

    if (!wallsBox.isEmpty()) {
      const size = new THREE.Vector3();
      wallsBox.getSize(size);
      const center = new THREE.Vector3();
      wallsBox.getCenter(center);

      const floorGeom = new THREE.PlaneGeometry(size.x + 15000, size.z + 15000);
      const floorMat = new THREE.MeshStandardMaterial({ color: this.colors.floor });
      const floor = new THREE.Mesh(floorGeom, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(center.x, -5, center.z);
      floor.receiveShadow = true;
      this.houseGroup.add(floor);
    }

    if (!this.isWalkModeActive) {
      this.fitCamera();
    }
  }

  private createWallMesh(wall: SteelWall): THREE.Mesh {
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

    const extrudeSettings = {
      steps: 1,
      depth: wall.thickness,
      beveled: false
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshStandardMaterial({ 
      color: this.colors.wall, 
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(wall.x, 0, wall.z);
    mesh.rotation.y = (wall.rotation * Math.PI) / 180;
    mesh.translateZ(-wall.thickness / 2);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  private createOpeningTriggers(wall: SteelWall) {
    wall.openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const geometry = new THREE.BoxGeometry(op.width, op.height, wall.thickness + 5);
      const material = new THREE.MeshBasicMaterial({ 
        color: this.colors.openingHover, 
        transparent: true, 
        opacity: 0,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(geometry, material);
      
      const wallMatrix = new THREE.Matrix4();
      wallMatrix.makeRotationY((wall.rotation * Math.PI) / 180);
      wallMatrix.setPosition(wall.x, 0, wall.z);

      const localPos = new THREE.Vector3(op.position + op.width / 2, sill + op.height / 2, 0);
      localPos.applyMatrix4(wallMatrix);
      
      mesh.position.copy(localPos);
      mesh.rotation.y = (wall.rotation * Math.PI) / 180;
      
      mesh.userData.wallId = wall.id;
      mesh.userData.opening = op;

      this.openingsGroup.add(mesh);
    });
  }

  private fitCamera() {
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

  private disposeObject(obj: THREE.Object3D) {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
  }

  public dispose() {
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.domElement.removeEventListener('dblclick', this.onDoubleClick);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    this.renderer.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.renderer.domElement.removeEventListener('touchmove', this.onTouchMove);
    if (this.renderer) this.renderer.dispose();
    this.controls.dispose();
    this.fpControls.dispose();
  }
}
