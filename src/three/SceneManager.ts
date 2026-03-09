
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
  private partsState: Map<string, boolean> = new Map(); // Estado individual (abierto/cerrado)
  private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
  private textures: Map<FurnitureColor, THREE.Texture> = new Map();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private textureMap: Record<FurnitureColor, string> = {
    'alarce-blanco': 'https://images.unsplash.com/photo-1610048764081-f35f553d1002?q=80&w=2000&auto=format&fit=crop',
    'alarce-marron': 'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?q=80&w=2070&auto=format&fit=crop'
  };

  private colorFallbackMap: Record<FurnitureColor, number> = {
    'alarce-blanco': 0xF5F5DC,
    'alarce-marron': 0x5D4037
  };

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f9);

    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 10000);
    this.camera.position.set(1800, 1200, 1800);

    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      preserveDrawingBuffer: true,
      alpha: true 
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(1500, 3000, 1000);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    this.scene.add(mainLight);

    this.furnitureGroup = new THREE.Group();
    this.scene.add(this.furnitureGroup);

    this.animate();

    // Eventos
    window.addEventListener('resize', () => this.onWindowResize(container));
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
  }

  private onPointerDown = (event: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.furnitureGroup.children, true);

    if (intersects.length > 0) {
      let object = intersects[0].object;
      let target: THREE.Object3D | null = object;

      // Buscar el contenedor que tenga el tipo de parte (puerta o cajón)
      while (target && !target.userData.type && target.parent) {
        target = target.parent;
      }

      if (target && target.userData.type) {
        const type = target.userData.type;
        const isOpen = this.partsState.get(target.uuid) || false;

        if (type === 'door-left' || type === 'door-right') {
          const angle = (type === 'door-left' ? -Math.PI / 2 : Math.PI / 2);
          target.rotation.y = isOpen ? 0 : angle;
          this.partsState.set(target.uuid, !isOpen);
        } else if (type === 'drawer') {
          const originalPos = target.userData.originalPosition as THREE.Vector3;
          target.position.z = isOpen ? originalPos.z : originalPos.z + 400;
          this.partsState.set(target.uuid, !isOpen);
        }
      }
    }
  };

  private onWindowResize(container: HTMLElement) {
    if (!container) return;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private async loadTexture(color: FurnitureColor): Promise<THREE.Texture | null> {
    if (this.textures.has(color)) return this.textures.get(color)!;
    try {
      return await new Promise((resolve) => {
        this.textureLoader.load(this.textureMap[color], (t) => {
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          this.textures.set(color, t);
          resolve(t);
        }, undefined, () => resolve(null));
      });
    } catch { return null; }
  }

  private getShadedColor(baseColor: number, partName: string): THREE.Color {
    const color = new THREE.Color(baseColor);
    const name = partName.toLowerCase();
    if (name.includes('tapa') || name.includes('frente')) return color.multiplyScalar(1.05);
    if (name.includes('lateral')) return color.multiplyScalar(0.95);
    if (name.includes('base') || name.includes('fondo')) return color.multiplyScalar(0.85);
    return color;
  }

  public async buildFurniture(parts: Part[], color: FurnitureColor) {
    while (this.furnitureGroup.children.length > 0) {
      const obj = this.furnitureGroup.children[0];
      this.disposeObject(obj);
      this.furnitureGroup.remove(obj);
    }
    this.partsMap.clear();
    this.partsState.clear();

    const baseTexture = await this.loadTexture(color);
    const gap = 1.0;

    parts.forEach(part => {
      const w = Math.max(0.1, part.width - (part.isHardware ? 0 : gap));
      const h = Math.max(0.1, part.height - (part.isHardware ? 0 : gap));
      const d = Math.max(0.1, part.depth - (part.isHardware ? 0 : gap));
      
      const geometry = new THREE.BoxGeometry(w, h, d);
      let material: THREE.MeshStandardMaterial;

      if (part.isHardware) {
        material = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.2, metalness: 0.8 });
      } else {
        const shadedColor = this.getShadedColor(this.colorFallbackMap[color], part.name);
        material = new THREE.MeshStandardMaterial({ 
          color: shadedColor, 
          roughness: 0.6, 
          metalness: 0.05 
        });
        if (baseTexture) {
          material.map = baseTexture.clone();
          material.map.repeat.set(part.width / 800, part.height / 800);
        }
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;

      // Bordes
      const line = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry), 
        new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.5 })
      );
      mesh.add(line);

      mesh.userData.originalPosition = new THREE.Vector3(part.x, part.y, part.z);
      mesh.userData.type = part.type;
      mesh.userData.id = part.id;

      if ((part.type === 'door-left' || part.type === 'door-right') && part.pivot) {
        const hingeGroup = new THREE.Group();
        hingeGroup.position.set(part.pivot.x, part.pivot.y, part.pivot.z);
        const offsetX = (part.type === 'door-left') ? part.width / 2 : -part.width / 2;
        mesh.position.set(offsetX, 0, part.z - part.pivot.z);
        hingeGroup.add(mesh);
        hingeGroup.userData.type = part.type;
        hingeGroup.userData.originalPosition = hingeGroup.position.clone();
        this.furnitureGroup.add(hingeGroup);
        this.partsMap.set(part.id, hingeGroup);
      } else {
        mesh.position.set(part.x, part.y, part.z);
        this.furnitureGroup.add(mesh);
        this.partsMap.set(part.id, mesh);
      }
    });

    const box = new THREE.Box3().setFromObject(this.furnitureGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.controls.target.copy(center);
  }

  public setDoors(open: boolean) {
    this.partsMap.forEach((obj) => {
      const type = obj.userData.type;
      if (type === 'door-left' || type === 'door-right') {
        const angle = (type === 'door-left' ? -Math.PI / 2 : Math.PI / 2);
        obj.rotation.y = open ? angle : 0;
        this.partsState.set(obj.uuid, open);
      }
    });
  }

  public setDrawers(open: boolean) {
    this.partsMap.forEach((obj) => {
      if (obj.userData.type === 'drawer') {
        const originalPos = obj.userData.originalPosition as THREE.Vector3;
        obj.position.z = open ? originalPos.z + 400 : originalPos.z;
        this.partsState.set(obj.uuid, open);
      }
    });
  }

  public explodeView(factor: number) {
    const box = new THREE.Box3().setFromObject(this.furnitureGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);

    this.partsMap.forEach((obj) => {
      const originalPos = obj.userData.originalPosition as THREE.Vector3;
      const direction = new THREE.Vector3().subVectors(originalPos, center).normalize();
      if (direction.length() < 0.1) direction.set(0, 1, 0);
      obj.position.copy(originalPos.clone().add(direction.multiplyScalar(factor * 350)));
    });
  }

  public resetAssembly() {
    this.partsMap.forEach((obj) => {
      const originalPos = obj.userData.originalPosition as THREE.Vector3;
      obj.position.copy(originalPos);
      obj.rotation.set(0, 0, 0);
      this.partsState.set(obj.uuid, false);
    });
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
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.dispose();
    this.controls.dispose();
  }
}
