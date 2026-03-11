import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { InputController } from './InputController';
import { CollisionSystem } from './CollisionSystem';

export class PlayerController {
  public mesh: THREE.Group;
  private velocity = new THREE.Vector3();
  private walkSpeed = 4000;
  private runSpeed = 8000;
  private gravity = -20000;
  private radius = 300;
  
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
        const model = glb.scene;
        model.scale.set(1000, 1000, 1000); // Scale to mm
        this.mesh.add(model);
      },
      undefined,
      () => {
        // Fallback to capsule
        const geometry = new THREE.CapsuleGeometry(300, 1200, 4, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
        const capsule = new THREE.Mesh(geometry, material);
        capsule.position.y = 900;
        this.mesh.add(capsule);
      }
    );
  }

  public update(delta: number, cameraRotationY: number) {
    if (delta > 0.1) return; // Prevent huge skips

    const speed = this.input.keys['ShiftLeft'] ? this.runSpeed : this.walkSpeed;
    
    // Direction calculation relative to camera
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

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      
      // Rotate movement relative to camera orientation
      const angle = cameraRotationY;
      const x = moveDir.x * Math.cos(angle) + moveDir.z * Math.sin(angle);
      const z = moveDir.z * Math.cos(angle) - moveDir.x * Math.sin(angle);
      
      this.velocity.x = x * speed;
      this.velocity.z = z * speed;

      // Rotate character model to face movement
      const targetRotation = Math.atan2(x, z);
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetRotation, 0.15);
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // Apply movement with axis-by-axis collision
    const nextX = this.mesh.position.x + this.velocity.x * delta;
    const testPosX = new THREE.Vector3(nextX, this.mesh.position.y, this.mesh.position.z);
    if (!this.collisions.checkCollision(testPosX, this.radius)) {
      this.mesh.position.x = nextX;
    }

    const nextZ = this.mesh.position.z + this.velocity.z * delta;
    const testPosZ = new THREE.Vector3(this.mesh.position.x, this.mesh.position.y, nextZ);
    if (!this.collisions.checkCollision(testPosZ, this.radius)) {
      this.mesh.position.z = nextZ;
    }

    // Simple Gravity
    this.velocity.y += this.gravity * delta;
    this.mesh.position.y += this.velocity.y * delta;
    
    if (this.mesh.position.y < 0) {
      this.mesh.position.y = 0;
      this.velocity.y = 0;
    }
  }
}
