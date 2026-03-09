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
  private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
  private textures: Map<FurnitureColor, THREE.Texture> = new Map();

  private textureMap: Record<FurnitureColor, string> = {
    'alarce-blanco': 'https://images.unsplash.com/photo-1610048764081-f35f553d1002?q=80&w=2000&auto=format&fit=crop',
    'alarce-marron': 'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?q=80&w=2070&auto=format&fit=crop'
  };

  private colorFallbackMap: Record<FurnitureColor, number> = {
    'alarce-blanco': 0xeeeeee,
    'alarce-marron': 0x5d4037
  };

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8fafc);

    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 10000);
    this.camera.position.set(1500, 1000, 1500);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const directLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directLight.position.set(1000, 2000, 1000);
    directLight.castShadow = true;
    this.scene.add(directLight);

    this.furnitureGroup = new THREE.Group();
    this.scene.add(this.furnitureGroup);

    this.animate();

    window.addEventListener('resize', () => this.onWindowResize(container));
  }

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
      return await new Promise((resolve, reject) => {
        this.textureLoader.load(
          this.textureMap[color],
          (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            this.textures.set(color, texture);
            resolve(texture);
          },
          undefined,
          (err) => reject(err)
        );
      });
    } catch (e) {
      console.warn(`Error loading texture for ${color}, using fallback color.`);
      return null;
    }
  }

  public async buildFurniture(parts: Part[], color: FurnitureColor) {
    // 1. Limpieza segura
    while (this.furnitureGroup.children.length > 0) {
      const obj = this.furnitureGroup.children[0];
      this.disposeObject(obj);
      this.furnitureGroup.remove(obj);
    }
    this.partsMap.clear();

    const baseTexture = await this.loadTexture(color);

    parts.forEach(part => {
      const geometry = new THREE.BoxGeometry(part.width || 1, part.height || 1, part.depth || 1);
      
      let material: THREE.MeshStandardMaterial;
      if (part.isHardware) {
        material = new THREE.MeshStandardMaterial({ 
          color: 0x94a3b8, 
          roughness: 0.3, 
          metalness: 0.8 
        });
      } else {
        const matOptions: THREE.MeshStandardMaterialParameters = {
          color: this.colorFallbackMap[color],
          roughness: 0.8,
          metalness: 0.05
        };

        if (baseTexture) {
          const partTexture = baseTexture.clone();
          partTexture.repeat.set(part.width / 500, part.height / 500);
          partTexture.needsUpdate = true;
          matOptions.map = partTexture;
          matOptions.color = 0xffffff; // Reset color to let texture show
        }
        
        material = new THREE.MeshStandardMaterial(matOptions);
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      mesh.userData.originalPosition = new THREE.Vector3(part.x, part.y, part.z);
      mesh.userData.type = part.type;

      if ((part.type === 'door-left' || part.type === 'door-right') && part.pivot) {
        const hingeGroup = new THREE.Group();
        hingeGroup.position.set(part.pivot.x, part.pivot.y, part.pivot.z);
        
        const offsetX = (part.type === 'door-left') ? part.width / 2 : -part.width / 2;
        mesh.position.set(offsetX, 0, part.z - part.pivot.z);
        
        hingeGroup.add(mesh);
        this.furnitureGroup.add(hingeGroup);
        
        this.partsMap.set(part.id, hingeGroup);
        hingeGroup.userData.originalPosition = hingeGroup.position.clone();
        hingeGroup.userData.type = part.type;
      } else {
        mesh.position.set(part.x, part.y, part.z);
        this.furnitureGroup.add(mesh);
        this.partsMap.set(part.id, mesh);
      }
    });

    const box = new THREE.Box3().setFromObject(this.furnitureGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.controls.target.lerp(center, 0.5);
  }

  public setDoors(open: boolean) {
    const angle90 = Math.PI / 2;
    this.partsMap.forEach((obj) => {
      const type = obj.userData.type;
      if (type === 'door-left') {
        obj.rotation.y = open ? -angle90 : 0;
      } else if (type === 'door-right') {
        obj.rotation.y = open ? angle90 : 0;
      }
    });
  }

  public setDrawers(open: boolean) {
    this.partsMap.forEach((obj) => {
      if (obj.userData.type === 'drawer') {
        const originalPos = obj.userData.originalPosition as THREE.Vector3;
        obj.position.z = open ? originalPos.z + 350 : originalPos.z;
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
      const targetPos = originalPos.clone().add(direction.multiplyScalar(factor * 250));
      obj.position.copy(targetPos);
    });
  }

  public resetAssembly() {
    this.partsMap.forEach((obj) => {
      const originalPos = obj.userData.originalPosition as THREE.Vector3;
      obj.position.copy(originalPos);
      obj.rotation.set(0, 0, 0);
    });
  }

  private disposeObject(obj: THREE.Object3D) {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        } else {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
    });
  }

  public dispose() {
    this.renderer.dispose();
    this.controls.dispose();
  }
}
