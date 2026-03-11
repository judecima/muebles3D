import * as THREE from 'three';
import { InputController } from './InputController';

export class ThirdPersonCamera {
  public rotationY = 0;
  private rotationX = 0;
  private distance = 3500;
  private heightOffset = 1800;
  private sensitivity = 0.002;

  constructor(private camera: THREE.PerspectiveCamera, private target: THREE.Object3D, private input: InputController) {}

  public update(delta: number) {
    // Mouse rotation
    this.rotationY -= this.input.mouseDelta.x * this.sensitivity;
    this.rotationX -= this.input.mouseDelta.y * this.sensitivity;

    // Mobile joystick rotation
    if (this.input.joystickLook.lengthSq() > 0) {
      this.rotationY -= this.input.joystickLook.x * 0.05;
      this.rotationX += this.input.joystickLook.y * 0.05;
    }

    // Clamp vertical rotation
    this.rotationX = Math.max(-Math.PI / 4, Math.min(Math.PI / 3, this.rotationX));

    const offset = new THREE.Vector3(0, 0, -this.distance);
    offset.applyEuler(new THREE.Euler(this.rotationX, this.rotationY, 0));

    const targetPos = this.target.position.clone().add(new THREE.Vector3(0, this.heightOffset, 0));
    const idealPos = targetPos.clone().add(offset);

    // Smooth camera follow
    this.camera.position.lerp(idealPos, 0.15);
    this.camera.lookAt(targetPos);
    
    // Reset delta
    this.input.clearMouseDelta();
  }
}
