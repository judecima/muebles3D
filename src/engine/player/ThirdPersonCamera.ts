import * as THREE from 'three';
import { InputController } from './InputController';
import { CollisionSystem } from './CollisionSystem';

export class ThirdPersonCamera {
  public rotationY = 0;
  private rotationX = 0;
  private currentDistance = 3000;
  private minDistance = 800;
  private maxDistance = 3500;
  private heightOffset = 1600; // Altura de los ojos (approx)
  
  private raycaster = new THREE.Raycaster();
  private sensitivity = 0.002;

  constructor(
    private camera: THREE.PerspectiveCamera, 
    private target: THREE.Object3D, 
    private input: InputController,
    private collisions: CollisionSystem
  ) {}

  public update(delta: number) {
    // 1. Manejar rotación por mouse
    this.rotationY -= this.input.mouseDelta.x * this.sensitivity;
    this.rotationX -= this.input.mouseDelta.y * this.sensitivity;

    // 2. Manejar rotación por joystick móvil
    if (this.input.joystickLook.lengthSq() > 0) {
      this.rotationY -= this.input.joystickLook.x * 0.05;
      this.rotationX += this.input.joystickLook.y * 0.05;
    }

    // 3. Limitar rotación vertical
    this.rotationX = Math.max(-Math.PI / 6, Math.min(Math.PI / 3, this.rotationX));

    // 4. Calcular posición ideal
    const offset = new THREE.Vector3(0, 0, -this.maxDistance);
    offset.applyEuler(new THREE.Euler(this.rotationX, this.rotationY, 0));

    const headPosition = this.target.position.clone().add(new THREE.Vector3(0, this.heightOffset, 0));
    const idealPosition = headPosition.clone().add(offset);

    // 5. Evasión de colisiones (Raycasting desde la cabeza hacia la cámara)
    const rayDir = new THREE.Vector3().subVectors(idealPosition, headPosition).normalize();
    this.raycaster.set(headPosition, rayDir);
    this.raycaster.far = this.maxDistance;

    const intersects = this.raycaster.intersectObjects(this.collisions.getMeshes(), false);
    
    let finalDistance = this.maxDistance;
    if (intersects.length > 0) {
      // Si hay una pared en medio, acercamos la cámara
      finalDistance = Math.max(this.minDistance, intersects[0].distance - 100);
    }

    // Suavizado de la distancia
    this.currentDistance = THREE.MathUtils.lerp(this.currentDistance, finalDistance, 0.1);

    // 6. Aplicar posición final
    const finalOffset = rayDir.multiplyScalar(this.currentDistance);
    const finalPosition = headPosition.clone().add(finalOffset);

    this.camera.position.lerp(finalPosition, 0.2);
    this.camera.lookAt(headPosition);
    
    // Reset delta mouse
    this.input.clearMouseDelta();
  }
}
