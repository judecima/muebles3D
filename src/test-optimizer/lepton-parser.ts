import * as fs from 'fs';

/**
 * v46.5 - PARSER NATIVO FINAL
 * Sincronización de conteo de paneles y dimensiones industriales.
 */
export function loadLeptonAudit(filePath: string) {
    const xml = fs.readFileSync(filePath, 'utf8');

    // 1. Extraer datos del Panel Base
    const panelMatch = xml.match(/<panel1[^>]*l="([\d.]+)"[^>]*w="([\d.]+)"[^>]*material="([^"]*)"[^>]*saw="([\d.]+)"/);
    const sheetWidth = parseFloat(panelMatch?.[1] || '1830');
    const sheetHeight = parseFloat(panelMatch?.[2] || '2750');
    const material = panelMatch?.[3] || 'unknown';
    const kerf = parseFloat(panelMatch?.[4] || '4.5');

    // 2. Extraer TODAS las piezas con contexto de su franja padre
    const stripSections = xml.split(/<(?:no\.\d+|panel\d+)/);
    const partsMap = new Map();

    for (const section of stripSections) {
        const wMatch = section.match(/\s+w="([\d.]+)"/);
        const stripWidth = parseFloat(wMatch?.[1] || '0');

        const partRegex = /<part[^>]*cut="([\d.]+)"[^>]*num="([\d.]+)"[^>]*type="1"[^>]*id="([^"]*)"/g;
        let match;
        while ((match = partRegex.exec(section)) !== null) {
            const width = parseFloat(match[1]);
            const height = stripWidth;
            const id = match[3];

            if (!partsMap.has(id)) {
                partsMap.set(id, {
                    id,
                    width,
                    height,
                    quantity: 1,
                    code: id
                });
            }
        }
    }

    // 3. v46.5: Conteo Real de Paneles (Detectar panel1, panel2, panel3...)
    const panelAnyMatch = xml.match(/<(panel\d+)[^>]*num="(\d+)"/g);
    let panelsUsed = 0;
    if (panelAnyMatch) {
        // Usamos un Set para no contar duplicados si el XML repite la etiqueta en sub-nodos
        const uniquePanels = new Set();
        panelAnyMatch.forEach(m => {
            const tag = m.match(/<(panel\d+)/)?.[1];
            if (tag && !uniquePanels.has(tag)) {
                uniquePanels.add(tag);
                const n = m.match(/num="(\d+)"/);
                panelsUsed += parseInt(n?.[1] || '1');
            }
        });
    }

    // Fallback: si no hay tags panelX, debe haber al menos uno si hay piezas
    if (panelsUsed === 0 && xml.includes('part')) panelsUsed = 1;

    return {
        sheetWidth,
        sheetHeight,
        material,
        kerf,
        parts: Array.from(partsMap.values()),
        panelsUsed
    };
}
