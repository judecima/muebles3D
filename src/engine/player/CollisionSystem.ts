import * as THREE from 'three';

export class CollisionSystem {
  private colliders: THREE.Box3[] = [];
  private meshes: THREE.Mesh[] = [];

  public clear() {
    this.colliders = [];
    this.meshes = [];
  }

  public registerWall(mesh: THREE.Mesh) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    this.colliders.push(box);
    this.meshes.push(mesh);
  }

  public getMeshes(): THREE.Mesh[] {
    return this.meshes;
  }

  public checkCollision(position: THREE.Vector3, radius: number): boolean {
    // Definimos una caja de colisión para el jugador (Cápsula simplificada a AABB)
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      position.clone().add(new THREE.Vector3(0, 900, 0)), // Centro de la cápsula de 1.8m
      new THREE.Vector3(radius * 2, 1800, radius * 2)
    );

    for (const collider of this.colliders) {
      if (playerBox.intersectsBox(collider)) {
        return true;
      }
    }
    return false;
  }
}
