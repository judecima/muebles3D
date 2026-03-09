import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Part } from '@/lib/types';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private furnitureGroup: THREE.Group;
  private partsMap: Map<string, THREE.Object3D> = new Map();

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf3f6f8);

    this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 10000);
    this.camera.position.set(2000, 1500, 2000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(500, 500, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directLight = new THREE.DirectionalLight(0xffffff, 0.8);
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

  public clearFurniture() {
    this.furnitureGroup.clear();
    this.partsMap.clear();
  }

  public buildFurniture(parts: Part[]) {
    this.clearFurniture();
    
    parts.forEach(part => {
      const geometry = new THREE.BoxGeometry(part.width, part.height, part.depth);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x3a7296, 
        metalness: 0.1, 
        roughness: 0.8,
        transparent: true,
        opacity: 0.95
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const partGroup = new THREE.Group();
      partGroup.name = part.id;

      if ((part.type === 'door-left' || part.type === 'door-right') && part.pivot) {
        // Pivot rotation setup
        const pivot = new THREE.Group();
        pivot.position.set(part.pivot.x, part.y, part.pivot.z);
        
        // Offset mesh relative to pivot
        const offsetX = part.type === 'door-left' ? part.width / 2 : -part.width / 2;
        mesh.position.set(offsetX, 0, part.z - part.pivot.z);
        
        pivot.add(mesh);
        this.furnitureGroup.add(pivot);
        this.partsMap.set(part.id, pivot);
      } else {
        mesh.position.set(part.x + part.width / 2, part.y, part.z);
        this.furnitureGroup.add(mesh);
        this.partsMap.set(part.id, mesh);
      }
    });

    // Auto-focus target to center of furniture
    const box = new THREE.Box3().setFromObject(this.furnitureGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.controls.target.copy(center);
  }

  public animateDoors(open: boolean) {
    this.partsMap.forEach((obj, id) => {
      if (id.includes('puerta')) {
        const targetRot = open ? (id.includes('izq') ? Math.PI / 2 : -Math.PI / 2) : 0;
        obj.rotation.y = targetRot;
      }
    });
  }

  public animateDrawers(open: boolean) {
    this.partsMap.forEach((obj, id) => {
      if (id.includes('cajon')) {
        const offset = open ? 400 : 0;
        obj.position.z = (obj.userData.initialZ || 0) + offset;
      }
    });
  }

  public explodeView(factor: number) {
    this.partsMap.forEach((obj, id) => {
      const direction = new THREE.Vector3().copy(obj.position).normalize();
      if (!obj.userData.originalPos) obj.userData.originalPos = obj.position.clone();
      obj.position.copy(obj.userData.originalPos).add(direction.multiplyScalar(factor * 200));
    });
  }

  public dispose() {
    this.renderer.dispose();
  }
}