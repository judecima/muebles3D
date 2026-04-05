import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { InputController } from './InputController';
import { CollisionSystem } from './CollisionSystem';

export class PlayerController {
  public mesh: THREE.Group;
  private model: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private animations: Map<string, THREE.AnimationAction> = new Map();
  private currentAnimation: string = 'idle';
  
  private velocity = new THREE.Vector3();
  private walkSpeed = 3000; // mm/s
  private runSpeed = 6000;  // mm/s
  private gravity = -15000; // mm/s²
  private radius = 300;
  private height = 1800;
  
  private verticalVelocity = 0;
  private targetRotation = 0;

  constructor(private scene: THREE.Scene, private input: InputController, private collisions: CollisionSystem) {
    this.mesh = new THREE.Group();
    this.initModel();
    this.scene.add(this.mesh);
    this.mesh.position.set(0, 0, 0);
  }

  private initModel() {
    // 1. Cuerpo (Cilindro de 1.50m)
    const bodyGeom = new THREE.CylinderGeometry(150, 150, 1500, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.7 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 750;
    body.castShadow = true;
    this.mesh.add(body);

    // 2. Cabeza (Esfera)
    const headGeom = new THREE.SphereGeometry(120, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24 });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1650;
    head.castShadow = true;
    this.mesh.add(head);

    // 3. Brazos (Cilindros simplificados)
    const armGeom = new THREE.CylinderGeometry(40, 40, 600, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
    
    const leftArm = new THREE.Mesh(armGeom, armMat);
    leftArm.position.set(-200, 1100, 0);
    leftArm.rotation.z = Math.PI / 8;
    this.mesh.add(leftArm);

    const rightArm = new THREE.Mesh(armGeom, armMat);
    rightArm.position.set(200, 1100, 0);
    rightArm.rotation.z = -Math.PI / 8;
    this.mesh.add(rightArm);
  }

  private playAnimation(name: string) {
    if (this.currentAnimation === name || !this.animations.has(name)) return;
    
    const prevAction = this.animations.get(this.currentAnimation);
    const newAction = this.animations.get(name)!;

    if (prevAction) prevAction.fadeOut(0.2);
    newAction.reset().fadeIn(0.2).play();
    this.currentAnimation = name;
  }

  public update(delta: number, cameraRotationY: number) {
    if (delta > 0.1) return;

    const isRunning = this.input.keys['ShiftLeft'];
    const speed = isRunning ? this.runSpeed : this.walkSpeed;
    
    // Dirección de movimiento
    const moveDir = new THREE.Vector3();
    if (this.input.keys['KeyW']) moveDir.z += 1;
    if (this.input.keys['KeyS']) moveDir.z -= 1;
    if (this.input.keys['KeyA']) moveDir.x += 1;
    if (this.input.keys['KeyD']) moveDir.x -= 1;

    // Mobile joystick support
    if (this.input.joystickMove.lengthSq() > 0) {
      moveDir.x = -this.input.joystickMove.x;
      moveDir.z = this.input.joystickMove.y;
    }

    let moving = moveDir.lengthSq() > 0;

    if (moving) {
      moveDir.normalize();
      
      // Rotar dirección relativo a la cámara
      const angle = cameraRotationY;
      const x = moveDir.x * Math.cos(angle) + moveDir.z * Math.sin(angle);
      const z = moveDir.z * Math.cos(angle) - moveDir.x * Math.sin(angle);
      
      this.velocity.x = x * speed;
      this.velocity.z = z * speed;

      // Rotación suave del modelo
      this.targetRotation = Math.atan2(x, z);
      const rotationSpeed = 10;
      let diff = this.targetRotation - this.mesh.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.mesh.rotation.y += diff * rotationSpeed * delta;

      this.playAnimation(isRunning ? 'run' : 'walk');
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
      this.playAnimation('idle');
    }

    // Gravedad
    this.verticalVelocity += this.gravity * delta;
    const nextY = this.mesh.position.y + this.verticalVelocity * delta;
    
    if (nextY <= 0) {
      this.mesh.position.y = 0;
      this.verticalVelocity = 0;
    } else {
      this.mesh.position.y = nextY;
    }

    // Aplicar movimiento con colisiones (X y Z por separado)
    const stepX = this.velocity.x * delta;
    const stepZ = this.velocity.z * delta;

    const testPosX = this.mesh.position.clone().add(new THREE.Vector3(stepX, 0, 0));
    if (!this.collisions.checkCollision(testPosX, this.radius)) {
      this.mesh.position.x = testPosX.x;
    }

    const testPosZ = this.mesh.position.clone().add(new THREE.Vector3(0, 0, stepZ));
    if (!this.collisions.checkCollision(testPosZ, this.radius)) {
      this.mesh.position.z = testPosZ.z;
    }

    // Update animations
    if (this.mixer) this.mixer.update(delta);
  }
}
