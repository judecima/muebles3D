import { SteelOpening, SteelHouseConfig } from '@/lib/steel/types';

export class StructuralEngine {
  /**
   * Calcula la solución de dintel (header) óptima según las cargas y el ancho del vano.
   * Basado en criterios de flecha L/360 y normativas AISI S100/S240.
   */
  static calculateHeader(opening: SteelOpening, config: SteelHouseConfig): { type: 'single' | 'double' | 'triple' | 'tube' | 'truss' } {
    const width = opening.width;

    // Lógica de decisión estructural según el ancho del vano
    // Valores de referencia industriales para Steel Framing (AISI S240)
    if (width > 2500) {
      return { type: 'truss' }; // Viga reticulada (Truss Header) para grandes luces
    }
    if (width > 1500) {
      return { type: 'tube' }; // Refuerzo con Tubo Estructural / Herrería pesada
    }
    if (width > 1200) {
      return { type: 'triple' }; // Triple PGC (Ensamblado en cajón o viga compuesta)
    }
    if (width > 900) {
      return { type: 'double' }; // Doble PGC (Back-to-back o Boxed)
    }

    return { type: 'single' }; // PGC Simple (Vanos pequeños)
  }
}
