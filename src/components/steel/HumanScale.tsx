import React from 'react';
import { Html } from '@react-three/drei';

export const HumanScale = ({ position = [2000, 0, 2000] }: { position?: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* Cuerpo (Cilindro de 1.50m) */}
      <mesh position={[0, 750, 0]}>
        <cylinderGeometry args={[150, 150, 1500, 16]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.6} />
      </mesh>
      {/* Cabeza (Esfera a 1.70m) */}
      <mesh position={[0, 1650, 0]}>
        <sphereGeometry args={[150, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      {/* Etiqueta de Escala Técnica */}
      <Html position={[0, 1900, 0]} center>
        <div className="bg-black/70 text-[10px] text-white px-2 py-0.5 rounded border border-white/20 whitespace-nowrap">
          REF. OPERARIO (1.80m)
        </div>
      </Html>
    </group>
  );
};
