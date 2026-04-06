// d:\proyectos\muebles3D\src\steel\adapters\wallLocalSystem.ts
import * as THREE from 'three';
import { SteelWall } from '@/lib/steel/types';

export interface WallLocalFrame {
  origin: THREE.Vector3;
  axisX: THREE.Vector3; // dirección horizontal del muro
  axisY: THREE.Vector3; // vertical global
  axisZ: THREE.Vector3; // normal del muro
}

export interface LocalPoint2D {
  x: number;
  y: number;
}

/**
 * Construye un sistema de referencia local (X, Y, Z) para un muro.
 */
export function buildWallLocalFrame(wall: SteelWall): WallLocalFrame {
  const angle = THREE.MathUtils.degToRad(wall.rotation || 0);

  // El motor asume rotación horaria negativa en Z?
  // User: x = wall.x + pos*cos(rot), z = wall.z + pos*sin(rot) ? 
  // Probamos la convención estándar del motor:
  const axisX = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();
  const axisY = new THREE.Vector3(0, 1, 0);
  const axisZ = new THREE.Vector3().crossVectors(axisX, axisY).normalize();

  return {
    origin: new THREE.Vector3(wall.x, 0, wall.z),
    axisX,
    axisY,
    axisZ,
  };
}

/**
 * Proyecta un punto global a coordenadas locales (u, v) del muro.
 */
export function worldToWallLocal(point: THREE.Vector3, frame: WallLocalFrame): LocalPoint2D {
  const rel = new THREE.Vector3().subVectors(point, frame.origin);

  return {
    x: rel.dot(frame.axisX),
    y: rel.dot(frame.axisY),
  };
}

/**
 * Reconstruye una posición global a partir de coordenadas locales (u, v) y un offset de profundidad opcional.
 */
export function wallLocalToWorld(point: LocalPoint2D, frame: WallLocalFrame, zOffset = 0): THREE.Vector3 {
  const worldPos = frame.origin.clone();
  worldPos.add(frame.axisX.clone().multiplyScalar(point.x));
  worldPos.add(frame.axisY.clone().multiplyScalar(point.y));
  worldPos.add(frame.axisZ.clone().multiplyScalar(zOffset));
  return worldPos;
}
