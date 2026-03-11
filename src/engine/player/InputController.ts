import * as THREE from 'three';

export class InputController {
  public keys: Record<string, boolean> = {};
  public mouseDelta = new THREE.Vector2();
  public joystickMove = new THREE.Vector2();
  public joystickLook = new THREE.Vector2();
  
  constructor() {
    window.addEventListener('keydown', (e) => this.keys[e.code] = true);
    window.addEventListener('keyup', (e) => this.keys[e.code] = false);
    
    // Mouse rotation logic (used when walk mode is active)
    window.addEventListener('mousemove', (e) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      this.mouseDelta.x = e.movementX;
      this.mouseDelta.y = e.movementY;
    });
  }

  public update() {
    // We clear mouse delta after each frame update in the controllers
  }

  public clearMouseDelta() {
    this.mouseDelta.set(0, 0);
  }
}
