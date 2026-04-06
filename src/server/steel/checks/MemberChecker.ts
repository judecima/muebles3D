// src/server/steel/checks/MemberChecker.ts
import { Member, Node3D } from '../domain/model';
import { MemberResult } from '../analysis/AnalysisResult';
import { STEEL_PROFILES } from '../profilesDB';
import { MemberCheckSummary, CheckResult, MemberGeometry } from './types';
import { evaluateTension, evaluateCompression, evaluateFlexure } from './capacity';
import { calculateSlenderness } from './slenderness';
import { evaluateInteraction } from './interaction';

export class MemberCheckerPRO {
    /**
     * Valida integralmente un miembro usando aproximaciones industriales normativas.
     */
    public static checkMember(
        member: Member, 
        memberResult: MemberResult, 
        nodes: Record<string, Node3D>
    ): MemberCheckSummary {
        const warnings: string[] = [];
        const results: CheckResult[] = [];
        
        // 1. Extraer Geometría Espacial Requerida
        const n1 = nodes[member.startNodeId];
        const n2 = nodes[member.endNodeId];
        const L_mm = Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.y - n1.y, 2) + Math.pow(n2.z - n1.z, 2));

        if (L_mm === 0) {
            warnings.push("Longitud de miembro L=0. Chequeos espaciales pueden ser estáticos u omitidos.");
        }

        // 2. Extraer Geometría de Perfil Transversal
        const p = STEEL_PROFILES[member.profileId] || STEEL_PROFILES["PGC-100-0.9"];
        if (!STEEL_PROFILES[member.profileId]) {
            warnings.push(`Perfil ${member.profileId} no encontrado en Base de Datos. Usando PGC-100-0.9 como Fallback.`);
        }

        // Las bases asumen área en cm2 y ix en cm4
        const geom: MemberGeometry = {
            L_mm,
            A_mm2: p.area * 100, 
            Ix_mm4: p.ix * 10000, 
            rx_mm: 0, 
            Sx_mm3: undefined // Normalmente no definido crudamente en la DB base actual del usuari
        };

        const demands = memberResult.forces;

        // Banderas de Presencia de Carga
        const hasAxial = Math.abs(demands.axialN) > 0.01;
        const isTension = demands.axialN > 0;
        const isCompression = demands.axialN < 0;
        const hasMomentZ = Math.abs(demands.momentZ_Nm) > 0.01;

        // 3. Orquestación Guiada por el Tipo de Esfuerzo (Demanda Dinámica)
        let primaryAxialResult: CheckResult | undefined = undefined;
        let primaryFlexureResult: CheckResult | undefined = undefined;

        if (hasAxial) {
            if (isTension) {
                primaryAxialResult = evaluateTension(member.id, demands.axialN, geom);
                results.push(primaryAxialResult);
            } else if (isCompression) {
                // Requiere Slenderness (Euler / Pandeo)
                let esbeltez = 0;
                try {
                    esbeltez = calculateSlenderness(member.memberType, geom);
                } catch (e: any) {
                    warnings.push(`Fallo calculo estructural de esbeltez: ${e.message}`);
                    esbeltez = 1; // Fallback estático
                }
                primaryAxialResult = evaluateCompression(member.id, demands.axialN, geom, esbeltez);
                results.push(primaryAxialResult);
            }
        }

        if (hasMomentZ) {
            primaryFlexureResult = evaluateFlexure(member.id, demands.momentZ_Nm, geom);
            results.push(primaryFlexureResult);
        }

        // 4. Interacción (Múltiples demandas actuando en simultáneo)
        if (primaryAxialResult && primaryFlexureResult) {
            const intResult = evaluateInteraction(member.id, primaryAxialResult, primaryFlexureResult);
            results.push(intResult);
        }

        // 5. Criterio Gobernante (Worst Case Scenario)
        let controllingResult: CheckResult = {
            memberId: member.id, checkType: 'TENSION', demand: {}, capacity: {}, utilization: 0, status: 'SAFE', governingEquation: 'Ninguna', message: 'Sin demanda apreciable.', warnings: []
        };

        if (results.length > 0) {
            controllingResult = results.reduce((prev, curr) => (curr.utilization > prev.utilization) ? curr : prev);
        }

        // Merge Warnings Generales
        controllingResult.warnings.push(...warnings);
        const uniqueWarnings = Array.from(new Set(controllingResult.warnings));
        controllingResult.warnings = uniqueWarnings;

        return {
            memberId: member.id,
            profileId: member.profileId,
            memberType: member.memberType,
            results,
            controllingResult
        };
    }
}
