import gsap from 'gsap';
import { SteelSceneManager } from './SteelSceneManager';
import { SteelHouseConfig } from '@/lib/steel/types';

export const startPresentation = (
  manager: SteelSceneManager, 
  config: SteelHouseConfig,
  onStepChange: (step: string) => void,
  onConfigUpdate: (newConfig: SteelHouseConfig) => void
) => {
  const tl = gsap.timeline();

  // Paso 0: Reset
  tl.call(() => {
    onStepChange('start');
    onConfigUpdate({ ...config, xRayMode: false, explosionFactor: 0, blueprintMode: false });
  });

  // Paso 1: Fundación y Platea
  tl.to({}, { duration: 1 });
  tl.call(() => onStepChange('foundation'));
  tl.to(manager.getCamera().position, { x: 4000, y: 1500, z: 4000, duration: 2, ease: "power2.inOut" });
  
  // Paso 2: Análisis de Rayos X (Esqueleto)
  tl.to({}, { duration: 1 });
  tl.call(() => {
    onStepChange('xray');
    onConfigUpdate({ ...config, xRayMode: true });
  });
  tl.to(manager.getCamera().position, { y: 3000, duration: 2 });

  // Paso 3: Visualización de Cargas (Vectores)
  tl.call(() => {
    onStepChange('xray'); // El narrador dirá algo sobre cargas
    onConfigUpdate({ ...config, layers: { ...config.layers, structuralDiagrams: true } });
  });
  tl.to({}, { duration: 3 }); // Pausa para ver flechas

  // Paso 4: Despiece en Vista Explosionada
  tl.call(() => onStepChange('exploded'));
  const explosionObj = { factor: 0 };
  tl.to(explosionObj, { 
    factor: 1, 
    duration: 5, 
    ease: "expo.out",
    onUpdate: () => {
      onConfigUpdate({ ...config, xRayMode: true, explosionFactor: explosionObj.factor });
    }
  });

  // Paso 5: Cierre Blueprint y Certificación Tech
  tl.to({}, { duration: 1 });
  tl.call(() => {
    onStepChange('blueprint');
    onConfigUpdate({ ...config, xRayMode: false, explosionFactor: 0, blueprintMode: true });
  });
  
  tl.to(manager.getCamera().position, { x: 6000, y: 4000, z: 6000, duration: 3 });

  // Paso final: Rotación Cinematográfica
  tl.call(() => {
    manager.getControls().autoRotate = true;
    manager.getControls().autoRotateSpeed = 4;
  });
  
  tl.to({}, { duration: 6 });
  
  tl.call(() => {
    manager.getControls().autoRotate = false;
    onStepChange('end');
  });

  return tl;
};
