'use client';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Part, FurnitureColor, COLOR_PALETTE } from '@/lib/types';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private furnitureGroup: THREE.Group;
  private partsMap: Map<string, THREE.Object3D> = new Map();
  private container: HTMLElement;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private itemStates: Map<string, boolean> = new Map();
  private animationOffsets: Map<string, number> = new Map(); // Para transiciones suaves

  private colors = {
    outline: 0x444444,
    background: 0xf1f5f9,
    mdf_back: 0xC8C8C8,
    hinge: 0x9A9A9A,
    rail: 0x8A8A8A,
    piston_body: 0x1F1F1F,
    piston_rod: 0xD9D9D9,
    highlight: 0x4A90E2
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.colors.background);

    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 10000);
    this.camera.position.set(1500, 1000, 1500);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(1000, 2000, 1500);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    const groundGeom = new THREE.PlaneGeometry(10000, 10000);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.15 });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.furnitureGroup = new THREE.Group();
    this.scene.add(this.furnitureGroup);

    this.animate();
    window.addEventListener('resize', this.onWindowResize);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
  }

  private onWindowResize = () => {
    if (!this.container || !this.camera || !this.renderer) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  private onPointerDown = (event: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.furnitureGroup.children, true);

    if (intersects.length > 0) {
      let object = intersects[0].object as THREE.Mesh;
      while (object.parent && object.parent !== this.furnitureGroup) {
        object = object.parent as THREE.Mesh;
      }

      const id = object.userData.id;
      const groupId = object.userData.groupId || id;
      const type = object.userData.type;

      this.highlightObject(object);

      if (type?.includes('door')) {
        const isOpen = !this.itemStates.get(groupId);
        this.toggleSingleDoor(groupId, isOpen);
      } else if (type === 'drawer') {
        const isOpen = !this.itemStates.get(groupId);
        this.toggleSingleDrawer(groupId, isOpen);
      }
    }
  };

  private highlightObject(object: THREE.Object3D) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const originalMaterial = child.material as THREE.MeshStandardMaterial;
        child.material = originalMaterial.clone();
        (child.material as THREE.MeshStandardMaterial).emissive.setHex(this.colors.highlight);
        (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4;

        setTimeout(() => {
          if (child.material) {
            (child.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
            (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
          }
        }, 300);
      }
    });
  }

  private toggleSingleDoor(id: string, open: boolean) {
    const obj = this.partsMap.get(id);
    if (!obj) return;
    this.itemStates.set(id, open);
    // La rotación se aplica en el animate() para suavidad si se desea, 
    // pero por ahora lo mantenemos directo para coherencia con el motor actual
    const type = obj.userData.type;
    if (type === 'door-left') obj.rotation.y = open ? -Math.PI / 2 : 0;
    else if (type === 'door-right') obj.rotation.y = open ? Math.PI / 2 : 0;
    else if (type === 'door-flip') obj.rotation.x = open ? -1.745 : 0;
  }

  private toggleSingleDrawer(groupId: string, open: boolean) {
    this.itemStates.set(groupId, open);
  }

  private updateAnimations() {
    this.partsMap.forEach((obj, id) => {
      const type = obj.userData.type;
      const groupId = obj.userData.groupId || id;

      if (type === 'drawer') {
        const isOpen = !!this.itemStates.get(groupId);
        let currentOffset = this.animationOffsets.get(groupId) || 0;
        
        // Calcular profundidad para el 80% de apertura
        let depth = 450; 
        if ((obj as any).geometry?.parameters?.depth) {
          depth = (obj as any).geometry.parameters.depth;
        }
        const targetOffset = isOpen ? depth * 0.8 : 0;
        
        // Interpolación suave (ease-out aproximado)
        if (Math.abs(targetOffset - currentOffset) > 0.1) {
          currentOffset += (targetOffset - currentOffset) * 0.15;
          this.animationOffsets.set(groupId, currentOffset);
        } else {
          currentOffset = targetOffset;
        }

        const orig = obj.userData.originalPosition as THREE.Vector3;
        obj.position.z = orig.z + currentOffset;
      }
    });
  }

  private updateAllPistons() {
    this.partsMap.forEach((pistonObj) => {
      if (pistonObj.userData.type === 'piston-body' && pistonObj.userData.config) {
        const config = pistonObj.userData.config;
        const doorPivotGroup = this.partsMap.get(config.doorId);
        if (!doorPivotGroup) return;

        const doorMesh = doorPivotGroup.children[0];
        const rod = pistonObj.getObjectByName('rod');
        
        const worldAnchorPuerta = doorMesh.localToWorld(new THREE.Vector3(
          config.anchorPuertaLocal.x,
          config.anchorPuertaLocal.y,
          config.anchorPuertaLocal.z
        ));

        pistonObj.lookAt(worldAnchorPuerta);

        const currentDistance = pistonObj.position.distanceTo(worldAnchorPuerta);
        
        if (rod) {
          const cylinderLen = config.lengthClosed * 0.6;
          const extension = currentDistance - cylinderLen;
          const baseRodLen = config.lengthClosed * 0.4;
          rod.scale.z = Math.max(0.01, extension / baseRodLen);
        }
      }
    });
  }

  private animate = () => {
    if (!this.renderer || !this.scene || !this.camera) return;
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.updateAnimations();
    this.updateAllPistons();
    this.renderer.render(this.scene, this.camera);
  };

  public async buildFurniture(parts: Part[], color: FurnitureColor) {
    while (this.furnitureGroup.children.length > 0) {
      const child = this.furnitureGroup.children[0];
      this.disposeObject(child);
      this.furnitureGroup.remove(child);
    }
    this.partsMap.clear();
    this.itemStates.clear();
    this.animationOffsets.clear();

    const hexBase = COLOR_PALETTE[color];
    const baseColor = new THREE.Color(hexBase);
    const interiorColor = baseColor.clone().offsetHSL(0, 0, 0.1); 

    parts.forEach(part => {
      if (part.type === 'piston-body') {
        this.createPiston(part);
        return;
      }

      let geometry: THREE.BufferGeometry;
      if (part.isHardware && part.name.includes('Bisagra')) {
        const radius = 17.5; 
        const height = 12;
        geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
        if (part.groupId?.includes('flip') || part.id.includes('flip')) {
          geometry.rotateX(0); 
        } else {
          geometry.rotateZ(Math.PI / 2); 
        }
      } else {
        geometry = new THREE.BoxGeometry(part.width, part.height, part.depth);
      }

      let material: THREE.MeshStandardMaterial;
      if (part.isHardware) {
        let colorVal = this.colors.hinge;
        if (part.name.includes('Riel')) colorVal = this.colors.rail;
        if (part.name.includes('Pistón')) colorVal = this.colors.piston_body;
        material = new THREE.MeshStandardMaterial({ color: colorVal, roughness: 0.2, metalness: 0.8 });
      } else if (part.name.includes('Fondo')) {
        material = new THREE.MeshStandardMaterial({ color: this.colors.mdf_back, roughness: 0.9 });
      } else {
        const isInternal = part.name.includes('Estante') || 
                           (part.name.includes('Cajón') && !part.name.includes('Frente')) ||
                           part.name.includes('Refuerzo') ||
                           part.name.includes('Divisor');
        
        material = new THREE.MeshStandardMaterial({ 
          color: isInternal ? interiorColor : baseColor, 
          roughness: 0.7, 
          metalness: 0.05 
        });
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;

      if (!part.isHardware) {
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: this.colors.outline, transparent: true, opacity: 0.5 }));
        mesh.add(line);
      }

      mesh.userData.originalPosition = new THREE.Vector3(part.x, part.y, part.z);
      mesh.userData.type = part.type;
      mesh.userData.id = part.id;
      mesh.userData.groupId = part.groupId;

      if ((part.type === 'door-left' || part.type === 'door-right' || part.type === 'door-flip') && part.pivot) {
        const pivotGroup = new THREE.Group();
        pivotGroup.position.set(part.pivot.x, part.pivot.y, part.pivot.z);
        
        let offsetX = 0, offsetY = 0, offsetZ = 0;
        if (part.type === 'door-left') offsetX = part.width / 2;
        else if (part.type === 'door-right') offsetX = -part.width / 2;
        else if (part.type === 'door-flip') {
          offsetY = -part.height / 2;
          offsetZ = part.depth / 2;
        }

        mesh.position.set(offsetX, offsetY, offsetZ);
        pivotGroup.add(mesh);
        pivotGroup.userData.originalPosition = pivotGroup.position.clone();
        pivotGroup.userData.type = part.type;
        pivotGroup.userData.id = part.id;
        pivotGroup.userData.groupId = part.groupId;
        this.furnitureGroup.add(pivotGroup);
        this.partsMap.set(part.id, pivotGroup);
      } else {
        mesh.position.set(part.x, part.y, part.z);
        this.furnitureGroup.add(mesh);
        this.partsMap.set(part.id, mesh);
      }
    });

    this.fitCameraToFurniture();
  }

  private createPiston(part: Part) {
    if (!part.pistonConfig) return;
    const config = part.pistonConfig;
    const group = new THREE.Group();
    group.position.set(config.anchorMueble.x, config.anchorMueble.y, config.anchorMueble.z);

    const L_closed = config.lengthClosed;
    const cylLen = L_closed * 0.6;
    const rodLen = L_closed * 0.4;

    const cylinderGeom = new THREE.CylinderGeometry(5, 5, cylLen, 16);
    cylinderGeom.rotateX(Math.PI / 2); 
    cylinderGeom.translate(0, 0, cylLen / 2);
    const cylinderMat = new THREE.MeshStandardMaterial({ color: this.colors.piston_body, roughness: 0.9 });
    const cylinder = new THREE.Mesh(cylinderGeom, cylinderMat);
    group.add(cylinder);

    const rodGeom = new THREE.CylinderGeometry(3, 3, rodLen, 16);
    rodGeom.rotateX(Math.PI / 2);
    rodGeom.translate(0, 0, rodLen / 2);
    const rodMat = new THREE.MeshStandardMaterial({ color: this.colors.piston_rod, metalness: 1, roughness: 0.1 });
    const rod = new THREE.Mesh(rodGeom, rodMat);
    rod.name = 'rod';
    rod.position.z = cylLen;
    group.add(rod);

    const ballGeom = new THREE.SphereGeometry(6, 16, 16);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
    const ballMueble = new THREE.Mesh(ballGeom, ballMat);
    group.add(ballMueble);
    const ballPuerta = new THREE.Mesh(ballGeom, ballMat);
    ballPuerta.position.z = rodLen;
    rod.add(ballPuerta);
    
    group.userData.id = part.id;
    group.userData.groupId = part.groupId;
    group.userData.type = 'piston-body';
    group.userData.config = config;
    group.userData.originalPosition = group.position.clone();
    
    this.furnitureGroup.add(group);
    this.partsMap.set(part.id, group);
  }

  public fitCameraToFurniture() {
    const box = new THREE.Box3().setFromObject(this.furnitureGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2.2;
    const direction = new THREE.Vector3(1, 0.7, 1).normalize();
    this.camera.position.copy(direction.multiplyScalar(cameraDistance).add(center));
    this.controls.target.copy(center);
    this.controls.update();
  }

  public setDoors(open: boolean) {
    this.partsMap.forEach((obj, id) => {
      const type = obj.userData.type;
      if (type === 'door-left' || type === 'door-right' || type === 'door-flip') {
        const groupId = obj.userData.groupId || id;
        this.toggleSingleDoor(groupId, open);
      }
    });
  }

  public setDrawers(open: boolean) {
    const drawerGroups = new Set<string>();
    this.partsMap.forEach((obj, id) => {
      if (obj.userData.type === 'drawer') {
        const groupId = obj.userData.groupId || id;
        drawerGroups.add(groupId);
      }
    });
    drawerGroups.forEach(groupId => this.toggleSingleDrawer(groupId, open));
  }

  public explodeView(factor: number) {
    const box = new THREE.Box3().setFromObject(this.furnitureGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.partsMap.forEach((obj) => {
      const orig = obj.userData.originalPosition as THREE.Vector3;
      const dir = new THREE.Vector3().subVectors(orig, center).normalize();
      obj.position.copy(orig.clone().add(dir.multiplyScalar(factor * 300)));
    });
  }

  public resetAssembly() {
    this.partsMap.forEach((obj, id) => {
      obj.position.copy(obj.userData.originalPosition);
      obj.rotation.set(0, 0, 0);
      this.itemStates.set(id, false);
      const groupId = obj.userData.groupId || id;
      this.itemStates.set(groupId, false);
      this.animationOffsets.set(groupId, 0);
    });
  }

  public getScreenshot(): string {
    if (!this.renderer || !this.scene || !this.camera) return '';
    const originalPos = this.camera.position.clone();
    const originalTarget = this.controls.target.clone();
    const box = new THREE.Box3().setFromObject(this.furnitureGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    const dist = Math.max(size.x, size.y, size.z) * 2.5;
    this.camera.position.set(center.x + dist, center.y + dist, center.z + dist);
    this.controls.target.copy(center);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    const data = this.renderer.domElement.toDataURL('image/png');
    this.camera.position.copy(originalPos);
    this.controls.target.copy(originalTarget);
    this.controls.update();
    return data;
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
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement?.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    this.controls.dispose();
    this.partsMap.clear();
    this.itemStates.clear();
    this.animationOffsets.clear();
  }
}
