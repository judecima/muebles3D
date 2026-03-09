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
    'alerce-blanco': 'https://images.unsplash.com/photo-1610048764081-f35f553d1002?q=80&w=2000&auto=format&fit=crop',
    'alerce-marron': 'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?q=80&w=2070&auto=format&fit=crop'
  };

  private colorTintMap: Record<FurnitureColor, number> = {
    'alerce-blanco': 0xffffff,
    'alerce-marron': 0xffffff
  };

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f9);

    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 10000);
    this.camera.position.set(1200, 1000, 1800);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    const directLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directLight.position.set(1000, 2000, 1000);
    directLight.castShadow = true;
    this.scene.add(directLight);

    this.furnitureGroup = new THREE.Group();
    this.scene.add(this.furnitureGroup);

    this.animate();

    window.addEventListener('resize', () => this.onWindowResize(container));
  }

  private onWindowResize(container: HTMLElement) {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private async getTexture(color: FurnitureColor): Promise<THREE.Texture> {
    if (this.textures.has(color)) return this.textures.get(color)!;

    return new Promise((resolve) => {
      this.textureLoader.load(this.textureMap[color], (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(0.001, 0.001); // Escala para mm
        this.textures.set(color, texture);
        resolve(texture);
      });
    });
  }

  public async buildFurniture(parts: Part[], color: FurnitureColor) {
    // 1. Limpieza absoluta
    this.furnitureGroup.children.forEach((child) => this.disposeObject(child));
    this.furnitureGroup.clear();
    this.partsMap.clear();

    const texture = await this.getTexture(color);

    parts.forEach(part => {
      const geometry = new THREE.BoxGeometry(part.width || 1, part.height || 1, part.depth || 1);
      
      // Ajustar repetición de textura según tamaño de la pieza
      const partTexture = texture.clone();
      partTexture.repeat.set(part.width / 500, part.height / 500);

      const material = new THREE.MeshStandardMaterial({ 
        map: part.isHardware ? null : partTexture,
        color: part.isHardware ? 0x94a3b8 : this.colorTintMap[color], 
        roughness: 0.8,
        metalness: part.isHardware ? 0.6 : 0.05,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Guardar posición original para explosión
      mesh.userData.originalPosition = new THREE.Vector3(part.x, part.y, part.z);
      mesh.userData.type = part.type;

      if ((part.type === 'door-left' || part.type === 'door-right') && part.pivot) {
        // SISTEMA DE BISAGRA REALISTA
        const hingeGroup = new THREE.Group();
        hingeGroup.position.set(part.pivot.x, part.pivot.y, part.pivot.z);
        
        // Offset relativo al pivote
        const offsetX = (part.type === 'door-left') ? part.width / 2 : -part.width / 2;
        mesh.position.set(offsetX, 0, part.z - part.pivot.z);
        
        hingeGroup.add(mesh);
        this.furnitureGroup.add(hingeGroup);
        
        // El hingeGroup es el que rotará
        this.partsMap.set(part.id, hingeGroup);
        hingeGroup.userData.originalPosition = hingeGroup.position.clone();
        hingeGroup.userData.type = part.type;
      } else {
        mesh.position.set(part.x, part.y, part.z);
        this.furnitureGroup.add(mesh);
        this.partsMap.set(part.id, mesh);
      }
    });

    // Centrar la cámara en el nuevo mueble
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
