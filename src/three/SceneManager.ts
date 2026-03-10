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
  private animationOffsets: Map<string, number> = new Map(); 

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

      let isDrawer = type === 'drawer';
      let isDoor = type?.includes('door');

      if (!isDrawer && !isDoor && groupId) {
        this.partsMap.forEach((p) => {
          if (p.userData.groupId === groupId) {
            if (p.userData.type === 'drawer') isDrawer = true;
            if (p.userData.type?.includes('door')) isDoor = true;
          }
        });
      }

      this.highlightGroup(groupId);

      if (isDoor) {
        const isOpen = !this.itemStates.get(groupId);
        this.toggleSingleDoor(groupId, isOpen);
      } else if (isDrawer) {
        const isOpen = !this.itemStates.get(groupId);
        this.toggleSingleDrawer(groupId, isOpen);
      }
    }
  };

  private highlightGroup(groupId: string) {
    this.partsMap.forEach((obj) => {
      if (obj.userData.groupId === groupId || obj.userData.id === groupId) {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat.emissive) {
              mat.emissive.setHex(this.colors.highlight);
              mat.emissiveIntensity = 0.4;
              setTimeout(() => {
                if (mat.emissive) {
                  mat.emissive.setHex(0);
                  mat.emissiveIntensity = 0;
                }
              }, 300);
            }
          }
        });
      }
    });
  }

  private toggleSingleDoor(id: string, open: boolean) {
    const obj = this.partsMap.get(id);
    if (!obj) return;
    this.itemStates.set(id, open);
    const type = obj.userData.type;
    if (type === 'door-left') obj.rotation.y = open ? -Math.PI / 2 : 0;
    else if (type === 'door-right') obj.rotation.y = open ? Math.PI / 2 : 0;
    else if (type === 'door-flip') obj.rotation.x = open ? -1.745 : 0;
  }

  private toggleSingleDrawer(groupId: string, open: boolean) {
    this.itemStates.set(groupId, open);
  }

  private updateAnimations() {
    this.itemStates.forEach((isOpen, groupId) => {
      let currentOffset = this.animationOffsets.get(groupId) || 0;
      const targetOffset = isOpen ? 350 : 0;
      
      if (Math.abs(targetOffset - currentOffset) > 0.1) {
        currentOffset += (targetOffset - currentOffset) * 0.15;
      } else {
        currentOffset = targetOffset;
      }
      this.animationOffsets.set(groupId, currentOffset);
    });

    this.partsMap.forEach((obj) => {
      const type = obj.userData.type;
      const groupId = obj.userData.groupId || obj.userData.id;

      if (type === 'drawer') {
        const offset = this.animationOffsets.get(groupId) || 0;
        const orig = obj.userData.originalPosition as THREE.Vector3;
        obj.position.z = orig.z + offset;
      }

      // Cinemática Industrial de Pistones v15.7
      if (type === 'piston-body') {
        const config = obj.userData.pistonConfig;
        const door = this.partsMap.get(config.doorId);
        
        if (door) {
          // El anclaje del mueble es la posición de origen fija
          const cabinetAnchor = new THREE.Vector3(config.anchorMueble.x, config.anchorMueble.y, config.anchorMueble.z);
          
          // Calculamos la posición del anclaje de la puerta en el espacio del mundo
          const doorAnchorLocal = new THREE.Vector3(config.anchorPuertaLocal.x, config.anchorPuertaLocal.y, config.anchorPuertaLocal.z);
          const doorAnchorWorld = door.localToWorld(doorAnchorLocal.clone());
          
          // Sincronizamos la posición del cuerpo al anclaje del mueble
          obj.position.copy(cabinetAnchor);
          
          // El pistón mira siempre hacia el punto de anclaje de la puerta
          obj.lookAt(doorAnchorWorld);

          // Calculamos la distancia actual entre anclajes para escalar el vástago
          const currentDist = cabinetAnchor.distanceTo(doorAnchorWorld);
          
          const rod = obj.getObjectByName('piston-rod');
          if (rod) {
            // El vástago se escala linealmente para cerrar el gap entre anclajes
            // Consideramos la longitud cerrada como factor de escala 1
            const scaleFactor = currentDist / config.lengthClosed;
            rod.scale.z = scaleFactor;
          }
        }
      }
    });
  }

  private animate = () => {
    if (!this.renderer || !this.scene || !this.camera) return;
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.updateAnimations();
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

    const baseColor = new THREE.Color(COLOR_PALETTE[color]);
    const interiorColor = baseColor.clone().offsetHSL(0, 0, 0.1); 

    parts.forEach(part => {
      let mesh: THREE.Object3D;

      if (part.type === 'piston-body') {
        // Estructura de Pistón Telescópico v15.7
        const bodyGeom = new THREE.CylinderGeometry(6, 6, part.depth, 16);
        bodyGeom.rotateX(Math.PI / 2); // Alinear cilindro con eje Z
        bodyGeom.translate(0, 0, part.depth / 2); // Pivotear en el extremo
        
        const bodyMat = new THREE.MeshStandardMaterial({ color: this.colors.piston_body, metalness: 0.5, roughness: 0.3 });
        const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
        
        // Vástago interno móvil
        const rodGeom = new THREE.CylinderGeometry(3.5, 3.5, part.depth, 16);
        rodGeom.rotateX(Math.PI / 2);
        rodGeom.translate(0, 0, part.depth / 2);
        const rodMat = new THREE.MeshStandardMaterial({ color: this.colors.piston_rod, metalness: 0.8, roughness: 0.1 });
        const rodMesh = new THREE.Mesh(rodGeom, rodMat);
        rodMesh.name = 'piston-rod';
        
        bodyMesh.add(rodMesh);
        mesh = bodyMesh;
      } else {
        let geometry: THREE.BufferGeometry;
        if (part.isHardware && part.name.includes('Bisagra')) {
          geometry = new THREE.CylinderGeometry(17.5, 17.5, 12, 32);
          geometry.rotateZ(Math.PI / 2); 
        } else {
          geometry = new THREE.BoxGeometry(part.width, part.height, part.depth);
        }

        let material: THREE.MeshStandardMaterial;
        if (part.isHardware) {
          material = new THREE.MeshStandardMaterial({ color: part.name.includes('Riel') ? this.colors.rail : this.colors.hinge, roughness: 0.2, metalness: 0.8 });
        } else if (part.name.includes('Fondo')) {
          material = new THREE.MeshStandardMaterial({ color: this.colors.mdf_back, roughness: 0.9 });
        } else {
          const isInternal = part.name.includes('Estante') || 
                             (part.name.includes('Cajón') && !part.name.includes('Frente')) ||
                             part.name.includes('Refuerzo') ||
                             part.name.includes('Divisor');
          material = new THREE.MeshStandardMaterial({ color: isInternal ? interiorColor : baseColor, roughness: 0.7 });
        }

        mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = mesh.receiveShadow = true;

        if (!part.isHardware) {
          const edges = new THREE.EdgesGeometry(geometry);
          const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: this.colors.outline, transparent: true, opacity: 0.3 }));
          mesh.add(line);
        }
      }

      mesh.userData.originalPosition = new THREE.Vector3(part.x, part.y, part.z);
      mesh.userData.type = part.type;
      mesh.userData.id = part.id;
      mesh.userData.groupId = part.groupId;
      mesh.userData.pistonConfig = part.pistonConfig;

      if ((part.type?.includes('door')) && part.pivot) {
        const pivotGroup = new THREE.Group();
        pivotGroup.position.set(part.pivot.x, part.pivot.y, part.pivot.z);
        let offsetX = 0, offsetY = 0, offsetZ = 0;
        if (part.type === 'door-left') offsetX = part.width / 2;
        else if (part.type === 'door-right') offsetX = -part.width / 2;
        else if (part.type === 'door-flip') { offsetY = -part.height / 2; offsetZ = part.depth / 2; }
        mesh.position.set(offsetX, offsetY, offsetZ);
        pivotGroup.add(mesh);
        pivotGroup.userData = { ...mesh.userData };
        pivotGroup.userData.originalPosition = pivotGroup.position.clone();
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
      if (obj.userData.type?.includes('door')) {
        this.toggleSingleDoor(obj.userData.groupId || id, open);
      }
    });
  }

  public setDrawers(open: boolean) {
    const groups = new Set<string>();
    this.partsMap.forEach((obj, id) => {
      if (obj.userData.type === 'drawer') groups.add(obj.userData.groupId || id);
    });
    groups.forEach(g => this.toggleSingleDrawer(g, open));
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
      this.animationOffsets.set(id, 0);
    });
  }

  public getScreenshot(): string {
    if (!this.renderer) return '';
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
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
    if (this.renderer) this.renderer.dispose();
    this.controls.dispose();
  }
}
