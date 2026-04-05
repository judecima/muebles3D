
export interface ProfileData {
  name: string;
  height: number; // mm
  width: number;  // mm
  thickness: number; // mm
  ix: number;     // cm4 (Inercia eje fuerte)
  area: number;   // cm2
  weight: number; // kg/m
}

export const STEEL_PROFILES: Record<string, ProfileData> = {
  "PGC-100-0.9": { name: "PGC 100x0.9", height: 100, width: 40, thickness: 0.9, ix: 18.52, area: 1.63, weight: 1.28 },
  "PGC-100-1.25": { name: "PGC 100x1.25", height: 100, width: 40, thickness: 1.25, ix: 24.85, area: 2.23, weight: 1.75 },
  "PGC-150-0.9": { name: "PGC 150x0.9", height: 150, width: 40, thickness: 0.9, ix: 50.12, area: 2.08, weight: 1.63 },
  "PGC-150-1.25": { name: "PGC 150x1.25", height: 150, width: 40, thickness: 1.25, ix: 68.30, area: 2.85, weight: 2.24 },
  "PGC-200-1.25": { name: "PGC 200x1.25", height: 200, width: 40, thickness: 1.25, ix: 145.2, area: 3.48, weight: 2.73 },
  "PGC-200-1.6": { name: "PGC 200x1.6", height: 200, width: 40, thickness: 1.6, ix: 182.4, area: 4.41, weight: 3.46 },
};
