import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Part, FurnitureColor } from '@/lib/types';

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

  private colors = {
    panel: 0xE8D9B5,
    border: 0xC8B08A,
    outline: 0x444444,
    background: 0xf1f5f9
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(2000, 3000, 1000);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

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
      let object = intersects[0].object;
      while (object.parent && object.parent !== this.furnitureGroup) {
        object = object.parent;
      }

      const id = object.userData.id;
      const type = object.userData.type;

      if (type?.includes('door')) {
        const isOpen = !this.itemStates.get(id);
        this.toggleSingleDoor(id, isOpen);
      } else if (type === 'drawer') {
        const prefix = id.split('-').slice(0, 2).join('-');
        const isOpen = !this.itemStates.get(prefix);
        this.toggleSingleDrawer(prefix, isOpen);
      }
    }
  };

  private toggleSingleDoor(id: string, open: boolean) {
    const obj = this.partsMap.get(id);
    if (!obj) return;

    this.itemStates.set(id, open);
    const type = obj.userData.type;

    if (type === 'door-left') {
      obj.rotation.y = open ? -Math.PI / 2 : 0;
    } else if (type === 'door-right') {
      obj.rotation.y = open ? Math.PI / 2 : 0;
    } else if (type === 'door-flip') {
      // Apertura a 100 grados (aprox 1.74 rad)
      obj.rotation.x = open ? -1.74 : 0; 
      this.updatePistons(open, obj);
    }
  }

  private updatePistons(open: boolean, doorObj: THREE.Object3D) {
    this.partsMap.forEach((obj) => {
      if (obj.userData.type === 'piston-body' && obj.userData.config) {
        const config = obj.userData.config;
        const rod = obj.getObjectByName('rod');
        
        const actualAnchorLocal = new THREE.Vector3(
          config.anchorPuerta.x - doorObj.position.x,
          config.anchorPuerta.y - doorObj.position.y,
          config.anchorPuerta.z - doorObj.position.z
        );

        const worldAnchorPuerta = actualAnchorLocal.clone().applyMatrix4(doorObj.matrixWorld);
        obj.lookAt(worldAnchorPuerta);

        const distance = obj.position.distanceTo(worldAnchorPuerta);
        
        if (rod) {
          const cylinderLen = config.lengthClosed * 0.6;
          const currentExtension = distance - cylinderLen;
          rod.scale.z = currentExtension / (config.lengthClosed * 0.4); 
          rod.position.z = (cylinderLen / 2) + (currentExtension / 2);
        }
      }
    });
  }

  private toggleSingleDrawer(prefix: string, open: boolean) {
    this.itemStates.set(prefix, open);
    this.partsMap.forEach((obj, id) => {
      if (id.startsWith(prefix) && obj.userData.type === 'drawer') {
        const orig = obj.userData.originalPosition as THREE.Vector3;
        obj.position.z = open ? orig.z + 400 : orig.z;
      }
    });
  }

  private animate = () => {
    if (!this.renderer || !this.scene || !this.camera) return;
    requestAnimationFrame(this.animate);
    this.controls.update();
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

    const visualGap = 1.0;

    parts.forEach(part => {
      if (part.type === 'piston-body') {
        this.createPiston(part);
        return;
      }

      const w = Math.max(0.1, part.width - (part.isHardware ? 0 : visualGap));
      const h = Math.max(0.1, part.height - (part.isHardware ? 0 : visualGap));
      const d = Math.max(0.1, part.depth - (part.isHardware ? 0 : visualGap));
      
      const geometry = new THREE.BoxGeometry(w, h, d);
      let material: THREE.MeshStandardMaterial;

      if (part.isHardware) {
        const colorVal = part.name.includes('Blanco') ? 0xffffff : 0x64748b;
        material = new THREE.MeshStandardMaterial({ color: colorVal, roughness: 0.2, metalness: 0.7 });
      } else {
        material = new THREE.MeshStandardMaterial({ 
          color: color === 'alarce-blanco' ? 0xffffff : 0x4a3728, 
          roughness: 0.8, 
          metalness: 0.05 
        });
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;

      const edges = new THREE.EdgesGeometry(geometry);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: this.colors.outline, transparent: true, opacity: 0.15 }));
      mesh.add(line);

      mesh.userData.originalPosition = new THREE.Vector3(part.x, part.y, part.z);
      mesh.userData.type = part.type;
      mesh.userData.id = part.id;

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
    group.position.set(part.x, part.y, part.z);

    const L_closed = config.lengthClosed;
    const cylLen = L_closed * 0.6;
    const rodLen = L_closed * 0.4;

    // Cilindro (Negro)
    const cylinderGeom = new THREE.CylinderGeometry(4, 4, cylLen, 16);
    cylinderGeom.rotateX(Math.PI / 2);
    const cylinderMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const cylinder = new THREE.Mesh(cylinderGeom, cylinderMat);
    group.add(cylinder);

    // Vástago (Metal)
    const rodGeom = new THREE.CylinderGeometry(2.5, 2.5, rodLen, 16);
    rodGeom.rotateX(Math.PI / 2);
    const rodMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 1, roughness: 0.1 });
    const rod = new THREE.Mesh(rodGeom, rodMat);
    rod.name = 'rod';
    rod.position.z = cylLen / 2; 
    group.add(rod);

    // Soportes de acero
    const supportGeom = new THREE.SphereGeometry(6, 16, 16);
    const supportMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    
    const supportMueble = new THREE.Mesh(supportGeom, supportMat);
    supportMueble.position.z = -cylLen / 2;
    group.add(supportMueble);

    const supportPuerta = new THREE.Mesh(supportGeom, supportMat);
    supportPuerta.position.z = rodLen / 2;
    rod.add(supportPuerta);

    const p2 = new THREE.Vector3(config.anchorPuerta.x, config.anchorPuerta.y, config.anchorPuerta.z);
    group.lookAt(p2);
    
    group.userData.id = part.id;
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
    let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2));

    cameraDistance *= 2.2;

    const direction = new THREE.Vector3(1, 0.7, 1).normalize();
    this.camera.position.copy(direction.multiplyScalar(cameraDistance).add(center));

    this.controls.target.copy(center);
    this.controls.update();
  }

  public setDoors(open: boolean) {
    this.partsMap.forEach((obj, id) => {
      const type = obj.userData.type;
      if (type === 'door-left' || type === 'door-right' || type === 'door-flip') {
        this.toggleSingleDoor(id, open);
      }
    });
  }

  public setDrawers(open: boolean) {
    const drawerGroups = new Set<string>();
    this.partsMap.forEach((obj, id) => {
      if (obj.userData.type === 'drawer') {
        const prefix = id.split('-').slice(0, 2).join('-');
        drawerGroups.add(prefix);
      }
    });

    drawerGroups.forEach(prefix => this.toggleSingleDrawer(prefix, open));
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
      
      if (obj.userData.type === 'drawer') {
        const prefix = id.split('-').slice(0, 2).join('-');
        this.itemStates.set(prefix, false);
      }
      
      if (obj.userData.type === 'piston-body' && obj.userData.config) {
        const config = obj.userData.config;
        const p2 = new THREE.Vector3(config.anchorPuerta.x, config.anchorPuerta.y, config.anchorPuerta.z);
        obj.lookAt(p2);
        const rod = obj.getObjectByName('rod');
        if (rod) {
          rod.scale.z = 1;
          rod.position.z = (config.lengthClosed * 0.6 / 2) + (config.lengthClosed * 0.4 / 2);
        }
      }
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
    const maxDim = Math.max(size.x, size.y, size.z);
    
    const dist = maxDim * 2.5;
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
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    if (this.controls) this.controls.dispose();
    this.partsMap.clear();
    this.itemStates.clear();
  }
}
