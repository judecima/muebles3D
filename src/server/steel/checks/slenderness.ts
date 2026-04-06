// src/server/steel/checks/slenderness.ts
import { MemberGeometry } from './types';

export function calculateRadiusOfGyration(geom: MemberGeometry): number {
    if (geom.rx_mm && geom.rx_mm > 0) return geom.rx_mm;
    
    // Si no tenemos el radio de giro directo crudo, lo derivamos de su estática elástica:
    // r = sqrt(I / A)
    if (geom.Ix_mm4 > 0 && geom.A_mm2 > 0) {
        return Math.sqrt(geom.Ix_mm4 / geom.A_mm2);
    }
    
    throw new Error('Imposible derivar Radio de Giro. Area o Inercia faltantes.');
}

export function getEffectiveLengthFactorK(memberType: string): number {
    // K Factor (Factor de Longitud Efectiva)
    // - Pinned-Pinned: K = 1.0 (Truss Webs típico, Studs base)
    // - Fixed-Pinned: K = 0.7 
    // - Fixed-Fixed: K = 0.5
    
    switch (memberType) {
        case 'truss_web':
        case 'truss_bottom_chord':
        case 'truss_top_chord':
            return 1.0; // Pinned connection at both ends (truss assumption)
        case 'stud':
        case 'jack':
        case 'king':
            return 1.0; // Typical wall framing assumption for weak/strong axis unless sheathed
        case 'header':
            // Normalmente en flexión dominante, pero si sufren axial el K es 1.0
            return 1.0;
        default:
            return 1.0; 
    }
}

export function calculateSlenderness(memberType: string, geom: MemberGeometry): number {
    const K = getEffectiveLengthFactorK(memberType);
    const r = calculateRadiusOfGyration(geom);
    
    if (r === 0) throw new Error('Radio de giro nulo detectado.');
    
    return (K * geom.L_mm) / r;
}
