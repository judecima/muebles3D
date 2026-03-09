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
  private mouse = new THREE.Vector2();
  private container: HTMLElement;

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
  }

  private onWindowResize = () => {
    if (!this.container || !this.camera || !this.renderer) return;
    this.camera.aspect = this.container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

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
      const w = Math.max(0.1, part.width - (part.isHardware ? 0 : visualGap));
      const h = Math.max(0.1, part.height - (part.isHardware ? 0 : visualGap));
      const d = Math.max(0.1, part.depth - (part.isHardware ? 0 : visualGap));
      
      const geometry = new THREE.BoxGeometry(w, h, d);
      let material: THREE.MeshStandardMaterial;

      if (part.isHardware) {
        material = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.1, metalness: 0.9 });
      } else {
        material = new THREE.MeshStandardMaterial({ 
          color: this.colors.panel, 
          roughness: 0.8, 
          metalness: 0.05 
        });
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;

      const edges = new THREE.EdgesGeometry(geometry);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: this.colors.outline }));
      mesh.add(line);

      mesh.userData.originalPosition = new THREE.Vector3(part.x, part.y, part.z);
      mesh.userData.type = part.type;
      mesh.userData.id = part.id;

      if ((part.type === 'door-left' || part.type === 'door-right') && part.pivot) {
        const pivotGroup = new THREE.Group();
        pivotGroup.position.set(part.pivot.x, part.pivot.y, part.pivot.z);
        const offsetX = (part.type === 'door-left') ? part.width / 2 : -part.width / 2;
        mesh.position.set(offsetX, 0, 0);
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
      if (obj.userData.type?.includes('door')) {
        this.itemStates.set(id, open);
        const angle = obj.userData.type === 'door-left' ? -Math.PI / 2 : Math.PI / 2;
        obj.rotation.y = open ? angle : 0;
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

    drawerGroups.forEach(groupId => this.itemStates.set(groupId, open));

    this.partsMap.forEach((obj) => {
      if (obj.userData.type === 'drawer') {
        const orig = obj.userData.originalPosition as THREE.Vector3;
        obj.position.z = open ? orig.z + 400 : orig.z;
      }
    });
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
    this.partsMap.forEach((obj) => {
      obj.position.copy(obj.userData.originalPosition);
      obj.rotation.set(0, 0, 0);
    });
    this.itemStates.clear();
  }

  public getScreenshot(): string {
    if (!this.renderer || !this.scene || !this.camera) return '';
    
    const originalPos = this.camera.position.clone();
    const originalTarget = this.controls.target.clone();
    
    this.fitCameraToFurniture();
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