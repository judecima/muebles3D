import * as THREE from 'three';

export class CollisionSystem {
  private colliders: THREE.Box3[] = [];

  public clear() {
    this.colliders = [];
  }

  public registerWall(mesh: THREE.Mesh) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    this.colliders.push(box);
  }

  public checkCollision(position: THREE.Vector3, radius: number): boolean {
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      position,
      new THREE.Vector3(radius * 2, 1.8, radius * 2)
    );

    for (const collider of this.colliders) {
      if (playerBox.intersectsBox(collider)) {
        return true;
      }
    }
    return false;
  }
}
