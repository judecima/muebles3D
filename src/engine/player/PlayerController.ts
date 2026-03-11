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
    const loader = new GLTFLoader();
    loader.load('/models/character.glb', 
      (glb) => {
        this.model = glb.scene;
        // Escalar modelo si es necesario (asumimos que el modelo viene en metros y trabajamos en mm)
        // Muchos modelos de internet miden ~2 unidades de alto
        this.model.scale.set(1000, 1000, 1000); 
        this.mesh.add(this.model);

        // Configurar animaciones
        this.mixer = new THREE.AnimationMixer(this.model);
        glb.animations.forEach((clip) => {
          const name = clip.name.toLowerCase();
          const action = this.mixer!.clipAction(clip);
          if (name.includes('idle')) this.animations.set('idle', action);
          else if (name.includes('walk')) this.animations.set('walk', action);
          else if (name.includes('run')) this.animations.set('run', action);
        });

        // Play idle by default
        this.playAnimation('idle');
      },
      undefined,
      () => {
        // Fallback: Cápsula Estilizada
        const geometry = new THREE.CapsuleGeometry(this.radius, this.height - this.radius * 2, 4, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3 });
        const capsule = new THREE.Mesh(geometry, material);
        capsule.position.y = this.height / 2;
        capsule.castShadow = true;
        this.mesh.add(capsule);
      }
    );
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
