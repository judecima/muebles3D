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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
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
    this.furnitureGroup.children.forEach((child) => {
      this.disposeObject(child);
    });
    this.furnitureGroup.clear();
    this.partsMap.clear();
  }

  private disposeObject(obj: THREE.Object3D) {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  public buildFurniture(parts: Part[]) {
    this.clearFurniture();
    
    parts.forEach(part => {
      if (part.type === 'hardware') return;

      const geometry = new THREE.BoxGeometry(part.width, part.height, part.depth);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x4a90e2, 
        roughness: 0.7,
        metalness: 0.2,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Guardar metadatos para simulación
      mesh.userData.originalPosition = new THREE.Vector3(part.x, part.y, part.z);
      mesh.userData.type = part.type;

      if ((part.type === 'door-left' || part.type === 'door-right') && part.pivot) {
        // Crear sistema de pivote para puertas
        const hingeGroup = new THREE.Group();
        hingeGroup.position.set(part.pivot.x, part.pivot.y, part.pivot.z);
        
        // La malla se posiciona relativa al grupo de la bisagra
        const offsetX = part.type === 'door-left' ? part.width / 2 : -part.width / 2;
        mesh.position.set(offsetX, 0, part.z - part.pivot.z);
        
        hingeGroup.add(mesh);
        this.furnitureGroup.add(hingeGroup);
        this.partsMap.set(part.id, hingeGroup);
        hingeGroup.userData.originalPosition = hingeGroup.position.clone();
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
      // Detectar si el objeto es un grupo de bisagra
      const partType = obj.children[0]?.userData.type || obj.userData.type;
      if (partType === 'door-left' || partType === 'door-right') {
        // Apertura estricta de 90 grados
        const maxAngle = Math.PI / 2;
        const angle = open ? (partType === 'door-left' ? maxAngle : -maxAngle) : 0;
        obj.rotation.y = angle;
      }
    });
  }

  public setDrawers(open: boolean) {
    this.partsMap.forEach((obj) => {
      if (obj.userData.type === 'drawer') {
        const offset = open ? 350 : 0;
        const originalPos = obj.userData.originalPosition as THREE.Vector3;
        obj.position.z = originalPos.z + offset;
      }
    });
  }

  public explodeView(factor: number) {
    const furnitureCenter = new THREE.Vector3();
    new THREE.Box3().setFromObject(this.furnitureGroup).getCenter(furnitureCenter);

    this.partsMap.forEach((obj) => {
      const originalPos = obj.userData.originalPosition as THREE.Vector3;
      const direction = new THREE.Vector3().subVectors(originalPos, furnitureCenter).normalize();
      if (direction.length() < 0.1) direction.set(0, 1, 0);
      obj.position.copy(originalPos).add(direction.multiplyScalar(factor * 300));
    });
  }

  public resetAssembly() {
    this.partsMap.forEach((obj) => {
      const originalPos = obj.userData.originalPosition as THREE.Vector3;
      obj.position.copy(originalPos);
      obj.rotation.set(0, 0, 0);
    });
  }

  public dispose() {
    this.renderer.dispose();
    this.controls.dispose();
  }
}
