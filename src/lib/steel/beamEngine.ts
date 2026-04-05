/**
 * Simple Beam Engine for structural engineering.
 * Based on Euler-Bernoulli beam theory.
 * Author: Antigravity Engineer
 */

export class DistributedLoad {
    constructor(public magnitude: number, public start: number, public end: number) {}
}

export class Beam {
    private supports: number[] = [];
    private loads: DistributedLoad[] = [];
    private E: number = 210000; // Default Steel Modulus in MPa
    private I: number = 1000000; // Default Inertia in mm4
    
    constructor(public length: number) {}

    addSupport(pos: number) {
        this.supports.push(pos);
    }

    addLoad(load: DistributedLoad) {
        this.loads.push(load);
    }

    setProperties(E: number, I_mm4: number) {
        this.E = E;
        this.I = I_mm4;
    }

    /**
     * Calculates maximum deflection for a simply supported beam with uniform distributed load.
     * f_max = (5 * w * L^4) / (384 * E * I)
     * Units: w (N/mm), L (mm), E (N/mm2), I (mm4) -> deflection in mm.
     */
    getMaxDeflection(): number {
        if (this.loads.length === 0) return 0;

        const w = this.loads[0].magnitude; // N/mm (equiv to kN/m if length is m)
        const L = this.length * 1000; // convert m to mm
        const E = this.E;
        const I = this.I;

        // Simple formula for uniform distribution (typical for headers)
        const deflection = (5 * w * Math.pow(L, 4)) / (384 * E * I);
        
        // Return result in meters (to match previous library expectation if needed)
        // Previous code did: beam.getMaxDeflection() * 1000 -> deflection in mm.
        // So we return meters here:
        return deflection / 1000;
    }
}
