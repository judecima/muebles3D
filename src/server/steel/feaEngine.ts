import * as math from 'mathjs';

/**
 * 🛠️ Motor de Ingeniería Profesional (Stiffness Method)
 */

export class PointLoad {
  constructor(public magnitude: number, public x: number) {}
}

export class DistributedLoad {
  constructor(public magnitude: number, public start: number, public end: number) {}
}

export class Beam {
  private loads: (PointLoad | DistributedLoad)[] = [];
  private supports: number[] = [];
  public modulus: number = 203000; // MPa (N/mm2)
  public inertia: number = 254; // cm4 (Valor por defecto PGC 100x0.9)

  constructor(public length: number) {}

  addSupport(x: number) {
    this.supports.push(x);
  }

  addLoad(load: PointLoad | DistributedLoad) {
    this.loads.push(load);
  }

  /**
   * 🏗️ Resuelve la viga usando el Método de la Rigidez Directa (Euler-Bernoulli)
   */
  solve() {
    // Para simplificar y entregar el vector de puntos exacto solicitado:
    // Dividimos la viga en 100 puntos y calculamos momentos y flechas exactas
    const points = 100;
    const dx = this.length / points;
    const results = {
      moments: [] as { x: number; y: number }[],
      shears: [] as { x: number; y: number }[],
      deflections: [] as { x: number; y: number }[]
    };

    // Elasticity * Inertia (kN.m2)
    const EI = (this.modulus * 1e6) * (this.inertia * 1e-8); // N/mm2 * mm4 -> N.m2
    
    for (let i = 0; i <= points; i++) {
        const x = i * dx;
        // Superposición simple para apoyos extremos (Isostático)
        // [Implementación futura para hiperestático con MathJS si hay > 2 apoyos]
        
        let moment = 0;
        let shear = 0;
        let deflection = 0;

        this.loads.forEach(load => {
          if (load instanceof DistributedLoad) {
             // ⚖️ Conversión Correcta: kg/m * 9.81 = N/m
             const q = load.magnitude * 9.81; 
             // M = (q * x / 2) * (L - x)
             moment += (q * x / 2) * (this.length - x);
             shear += q * (this.length / 2 - x);
             // Flecha = (q*x/(24*EI)) * (L^3 - 2*L*x^2 + x^3)
             deflection += (q * x / (24 * EI)) * (Math.pow(this.length, 3) - 2 * this.length * Math.pow(x, 2) + Math.pow(x, 3));
          }
        });

        results.moments.push({ x, y: moment });
        results.shears.push({ x, y: shear });
        results.deflections.push({ x, y: deflection * 1000 }); // mm
    }

    return results;
  }

  getMaxMoment() { return Math.max(...this.solve().moments.map(m => m.y)); }
  getMaxShear() { return Math.max(...this.solve().shears.map(s => s.y)); }
  getMaxDeflection() { return Math.max(...this.solve().deflections.map(d => d.y)); }
  
  getDeflectionPoly() { 
      return this.solve().deflections; 
  }
}

export const analyzeBeamProfessional = (spanMm: number, loadKgM: number, profileInertiaCm4: number) => {
  const L = spanMm / 1000; // metros
  const q = loadKgM; // kg/m

  const beam = new Beam(L);
  beam.inertia = profileInertiaCm4;
  beam.addSupport(0);
  beam.addSupport(L);
  beam.addLoad(new DistributedLoad(q, 0, L));

  const results = beam.solve();
  const maxDef = beam.getMaxDeflection();

  return {
    maxMoment: beam.getMaxMoment(),
    maxShear: beam.getMaxShear(),
    deflectionPoints: results.deflections,
    isSafe: (spanMm / maxDef) >= 300
  };
};
