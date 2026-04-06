import fs from 'fs';

function main() {
    console.log("Analyzing T7_UPLIFT:");
    const t7Raw = fs.readFileSync('src/server/steel/test/snapshots/T7_UPLIFT.json', 'utf8');
    const t7d = JSON.parse(t7Raw);
    
    // Get Trusses
    const trussDict: any = {};
    Object.values(t7d.members).filter((m: any) => m.memberType?.startsWith('truss')).forEach((m: any) => {
        trussDict[m.memberType] = (trussDict[m.memberType] || []);
        trussDict[m.memberType].push(m.forces?.axialN || 0);
    });
    
    console.log("T7 Truss Forces:", trussDict);

    // Get T1 Smoke Test for baseline comparison
    const t1Raw = fs.readFileSync('src/server/steel/test/snapshots/T1_SMOKE.json', 'utf8');
    const t1d = JSON.parse(t1Raw);
    const t1Dict: any = {};
    Object.values(t1d.members).filter((m: any) => m.memberType?.startsWith('truss')).forEach((m: any) => {
        t1Dict[m.memberType] = (t1Dict[m.memberType] || []);
        t1Dict[m.memberType].push(m.forces?.axialN || 0);
    });
    
    console.log("\nT1 Baseline Truss Forces:", t1Dict);


    // T2 Analysis
    console.log("\nAnalyzing T2_FAIL_BEAM:");
    const t2Raw = fs.readFileSync('src/server/steel/test/snapshots/T2_FAIL_BEAM.json', 'utf8');
    const t2d = JSON.parse(t2Raw);
    
    const fails = t2d.checks?.filter((ck: any) => ck.controllingResult.status === 'FAIL') || [];
    console.log("T2 Fails count:", fails.length);
    if (fails.length > 0) {
        console.log("Fails:", fails.map((f: any) => f.memberId));
    }
    
    // Let's dump all headers in T2
    const headers = Object.values(t2d.members).filter((m: any) => m.memberType === 'header');
    headers.forEach((h: any) => {
        console.log(`Header ${h.id} Forces:`, h.forces);
        const hc = t2d.checks?.find((c: any) => c.memberId === h.id);
        console.log(`Header ${h.id} Check: stat=${hc?.controllingResult.status}, eq=${hc?.controllingResult.governingEquation}, msg=${hc?.controllingResult.message}`);
    });
}
main();
