
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
    'alarce-blanco': 0xF5F5DC,
    'alarce-marron': 0x5D4037
  };

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f9); // Slate-100 para mejor contraste

    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 10000);
    this.camera.position.set(1800, 1200, 1800);

    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      preserveDrawingBuffer: true,
      alpha: true 
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    
    // Configuración de Sombras Avanzada
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Iluminación de Estudio
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(1500, 3000, 1000);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 10000;
    mainLight.shadow.camera.left = -2000;
    mainLight.shadow.camera.right = 2000;
    mainLight.shadow.camera.top = 2000;
    mainLight.shadow.camera.bottom = -2000;
    this.scene.add(mainLight);

    const fillLight = new THREE.PointLight(0xffffff, 0.4);
    fillLight.position.set(-1000, 1000, 1000);
    this.scene.add(fillLight);

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
      return await new Promise((resolve) => {
        this.textureLoader.load(
          this.textureMap[color],
          (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.anisotropy = 16;
            this.textures.set(color, texture);
            resolve(texture);
          },
          undefined,
          () => resolve(null)
        );
      });
    } catch (e) {
      return null;
    }
  }

  private getShadedColor(baseColor: number, partName: string): THREE.Color {
    const color = new THREE.Color(baseColor);
    const name = partName.toLowerCase();
    
    // Variaciones tonales sutiles para distinguir piezas (Lógica CAD)
    if (name.includes('tapa') || name.includes('frente')) {
      return color.multiplyScalar(1.05); // Un poco más claro
    } else if (name.includes('lateral')) {
      return color.multiplyScalar(0.95); // Un poco más oscuro
    } else if (name.includes('base') || name.includes('fondo')) {
      return color.multiplyScalar(0.85); // Más oscuro para profundidad
    } else if (name.includes('estante')) {
      return color.multiplyScalar(1.02);
    }
    return color;
  }

  public async buildFurniture(parts: Part[], color: FurnitureColor) {
    while (this.furnitureGroup.children.length > 0) {
      const obj = this.furnitureGroup.children[0];
      this.disposeObject(obj);
      this.furnitureGroup.remove(obj);
    }
    this.partsMap.clear();

    const baseTexture = await this.loadTexture(color);
    const gap = 1.0; // Separación visual de 1mm entre paneles

    parts.forEach(part => {
      // Reducimos ligeramente la geometría para crear la separación visual (gap)
      const w = Math.max(0.1, part.width - (part.isHardware ? 0 : gap));
      const h = Math.max(0.1, part.height - (part.isHardware ? 0 : gap));
      const d = Math.max(0.1, part.depth - (part.isHardware ? 0 : gap));
      
      const geometry = new THREE.BoxGeometry(w, h, d);
      
      let material: THREE.MeshStandardMaterial;
      if (part.isHardware) {
        material = new THREE.MeshStandardMaterial({ 
          color: 0x64748b, 
          roughness: 0.2, 
          metalness: 0.8 
        });
      } else {
        const shadedColor = this.getShadedColor(this.colorFallbackMap[color], part.name);
        const matOptions: THREE.MeshStandardMaterialParameters = {
          color: shadedColor,
          roughness: 0.6,
          metalness: 0.05
        };

        if (baseTexture) {
          const partTexture = baseTexture.clone();
          partTexture.repeat.set(part.width / 800, part.height / 800);
          partTexture.needsUpdate = true;
          matOptions.map = partTexture;
        }
        
        material = new THREE.MeshStandardMaterial(matOptions);
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Agregar Bordes (EdgesGeometry)
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x334155, // Slate-700
        transparent: true,
        opacity: 0.5 
      });
      const line = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(line);

      mesh.userData.originalPosition = new THREE.Vector3(part.x, part.y, part.z);
      mesh.userData.type = part.type;
      mesh.userData.name = part.name;

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

    // Centrar cámara en el nuevo mueble
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
        obj.position.z = open ? originalPos.z + 400 : originalPos.z;
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
      const targetPos = originalPos.clone().add(direction.multiplyScalar(factor * 350));
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

  public getScreenshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
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
      if (child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
  }

  public dispose() {
    this.renderer.dispose();
    this.controls.dispose();
  }
}
