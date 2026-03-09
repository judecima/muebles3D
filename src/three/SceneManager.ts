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
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private container: HTMLElement;

  // Estados de apertura individuales
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
    
    container.appendChild(this.renderer.domElement);

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
    this.initInteraction();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private initInteraction() {
    this.container.addEventListener('pointerdown', (event) => {
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.furnitureGroup.children, true);

      if (intersects.length > 0) {
        let object = intersects[0].object;
        // Subir al grupo si es un pivote de puerta
        while (object.parent && object.parent !== this.furnitureGroup && !object.userData.id) {
          object = object.parent;
        }
        
        const type = object.userData.type;
        const id = object.userData.id;

        if (type?.includes('door')) {
          this.toggleDoor(id);
        } else if (type === 'drawer') {
          // Extraer el prefijo del grupo de cajón (ej. cajon-0)
          const groupId = id.split('-').slice(0, 2).join('-');
          this.toggleDrawer(groupId);
        }
      }
    });
  }

  private toggleDoor(id: string) {
    const door = this.partsMap.get(id);
    if (!door) return;
    const isOpen = !this.itemStates.get(id);
    this.itemStates.set(id, isOpen);
    
    const angle = door.userData.type === 'door-left' ? -Math.PI / 2 : Math.PI / 2;
    door.rotation.y = isOpen ? angle : 0;
  }

  private toggleDrawer(groupId: string) {
    const isOpen = !this.itemStates.get(groupId);
    this.itemStates.set(groupId, isOpen);

    this.partsMap.forEach((obj, id) => {
      if (obj.userData.type === 'drawer' && id.startsWith(groupId)) {
        const orig = obj.userData.originalPosition as THREE.Vector3;
        obj.position.z = isOpen ? orig.z + 400 : orig.z;
      }
    });
  }

  private onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public async buildFurniture(parts: Part[], color: FurnitureColor) {
    while (this.furnitureGroup.children.length > 0) {
      this.disposeObject(this.furnitureGroup.children[0]);
      this.furnitureGroup.remove(this.furnitureGroup.children[0]);
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

    const box = new THREE.Box3().setFromObject(this.furnitureGroup);
    box.getCenter(this.controls.target);
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
    // Identificar prefijos únicos de cajones
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
    this.renderer.dispose();
    this.controls.dispose();
  }
}