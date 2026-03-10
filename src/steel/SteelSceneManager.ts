'use client';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SteelHouseConfig, SteelWall } from '@/lib/steel/types';

export class SteelSceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private houseGroup: THREE.Group;
  private container: HTMLElement;

  private colors = {
    background: 0xf8fafc,
    wall: 0x94a3b8,
    grid: 0xe2e8f0,
    outline: 0x475569
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.colors.background);

    this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 50000);
    this.camera.position.set(5000, 5000, 5000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;

    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10000, 20000, 10000);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    // Suelo / Grid
    const grid = new THREE.GridHelper(20000, 40, this.colors.grid, this.colors.grid);
    this.scene.add(grid);

    this.houseGroup = new THREE.Group();
    this.scene.add(this.houseGroup);

    this.animate();
    window.addEventListener('resize', this.onWindowResize);
  }

  private onWindowResize = () => {
    if (!this.container || !this.camera || !this.renderer) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  private animate = () => {
    if (!this.renderer || !this.scene || !this.camera) return;
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public buildHouse(config: SteelHouseConfig) {
    // Limpiar escena previa
    while (this.houseGroup.children.length > 0) {
      const child = this.houseGroup.children[0];
      this.disposeObject(child);
      this.houseGroup.remove(child);
    }

    config.walls.forEach(wall => {
      const wallMesh = this.createWallMesh(wall);
      this.houseGroup.add(wallMesh);
    });

    this.fitCamera();
  }

  private createWallMesh(wall: SteelWall): THREE.Mesh {
    // Crear la forma del muro
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(wall.length, 0);
    shape.lineTo(wall.length, wall.height);
    shape.lineTo(0, wall.height);
    shape.lineTo(0, 0);

    // Añadir huecos para aberturas
    wall.openings.forEach(op => {
      const hole = new THREE.Path();
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      
      hole.moveTo(op.position, sill);
      hole.lineTo(op.position + op.width, sill);
      hole.lineTo(op.position + op.width, sill + op.height);
      hole.lineTo(op.position, sill + op.height);
      hole.lineTo(op.position, sill);
      shape.holes.push(hole);
    });

    // Extruir para dar espesor
    const extrudeSettings = {
      steps: 1,
      depth: wall.thickness,
      beveled: false
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshStandardMaterial({ 
      color: this.colors.wall, 
      side: THREE.DoubleSide,
      roughness: 0.7,
      metalness: 0.2
    });

    const mesh = new THREE.Mesh(geometry, material);
    
    // Posicionamiento y Rotación
    mesh.position.set(wall.x, 0, wall.z);
    mesh.rotation.y = (wall.rotation * Math.PI) / 180;
    
    // Corregir offset de extrusión si es necesario (por defecto extruye hacia Z positivo local)
    // Centramos el espesor del muro sobre su línea de eje
    mesh.translateZ(-wall.thickness / 2);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  private fitCamera() {
    const box = new THREE.Box3().setFromObject(this.houseGroup);
    if (box.isEmpty()) return;

    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;

    this.camera.position.set(center.x + cameraDistance, center.y + cameraDistance, center.z + cameraDistance);
    this.controls.target.copy(center);
    this.controls.update();
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
