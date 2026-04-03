# Motor de Corte Industrial - Guía de Validación (Quality Gate)

Este documento define las reglas de aceptación y el proceso de validación continua para el motor de optimización. Todas las mejoras funcionales deben ser validadas contra este Gate antes de ser integradas como estables.

## 1. Filosofía de Validación
No optimizamos a ciegas. Cada cambio debe demostrar un beneficio real (eficiencia) sin degradar la estabilidad industrial (conteo de paneles, robustez, tiempo).

---

## 2. Los "Hard Gates" (Bloqueantes)
Una versión se marca automáticamente como **FAIL** si falla cualquiera de estas reglas comparada con el `baseline.json` actual:

1. **Estabilidad de Paneles**: El conteo total de paneles no puede aumentar en ningún modelo de la suite multi-modelo.
2. **Ausencia de Noodles**: No pueden aparecer nuevos "tiras de basura" (piezas < 60mm) en el panel final.
3. **Robustez Determinista**: El éxito en el test de permutación (Shuffle) debe ser del **100%**. Una mejora que depende del orden de entrada no es estable.
4. **Resistencia a Mutación**: El éxito en el test de Jitter (±5%) y eliminación de piezas debe mantenerse dentro de los rangos históricos (>70%).

---

## 3. Los "Soft Gates" (Deseables)
Se registran alertas pero no bloquean la versión (marcan como **PASS_WITH_WARNING**):

1. **Rendimiento**: El tiempo promedio por modelo no debería aumentar más de **50-100ms**.
2. **Eficiencia P1**: Se busca un promedio incremental de mejora en el Panel 1 (>92% en referencia).

---

## 4. Proceso de Validación y Promoción

### Paso 1: Ejecutar Validación
```bash
npm run engine:validate
```
Esto genera un snapshot JSON en `src/test-optimizer/history/vXX.json` y actualiza `latest.json`.

### Paso 2: Análisis de Resultados
Revisar el `verdict` en `history/latest.json`. Si es `PASS`, la versión es elegible para promoción.

### Paso 3: Promoción de Baseline (Manual)
Si una versión demuestra ser superior y estable, se promueve manualmente como la nueva referencia oficial:
```bash
cp src/test-optimizer/history/vXX.json src/test-optimizer/history/baseline.json
```

---

## 5. Ubicación de Archivos
- **Suite Multi-Modelo**: `src/test-optimizer/benchmark-multi-model.ts`
- **Suite de Robustez**: `src/test-optimizer/robustness-validation.ts`
- **Historial JSON**: `src/test-optimizer/history/`

---

## 6. Historial de Baselines (Log de Versiones)

### [2026-04-02] v45.3 (Official Baseline) 🏆
- **Estado**: Promovida a Baseline Oficial.
- **Logros**: Reducción de 3 a 2 paneles en Modelo A (Eficiencia P1: 94.8%).
- **Warning de Performance**: Model A execution time registrado en **257ms**.
- **Nota**: Se acepta este incremento temporal en pro de la densidad masiva lograda en P2. Próxima iteración enfocada en rendimiento.

### [2026-04-02] v45.3.1 (HOTFIX INDUSTRIAL) 🏆

- **Estado**: Baseline Oficial (Hotfix).
- **Cambio Principal**: Restauración de la **Regla Industrial de Selección Global**.
- **Acción**: Eliminación del pre-filtrado por `closureScore` que causaba regresión de paneles.
- **Logros**: Recuperación de los 2 paneles en Modelo A con 94.8% de eficiencia en P1.
- **Robustez**: 100% (Confirmada tras reparación).

| Versión | Estado | Model A | P1 Eff | Robustez | Notas |
| :--- | :--- | :--- | :--- | :--- | :--- |
| v45.3 | Baseline (Pre-Regresión) | 2 | 94.8% | 100% | Eficiencia máxima alcanzada |
| **v45.3.1** | **HOTFIX ESTABLE** | 2 | 94.8% | 100% | Regla industrial restaurada |

---

### 7. Registro de Deuda Técnica (Fase 6)
- **Performance (Model A)**: El tiempo de ejecución se mantiene en **257ms**. Se prioriza la densidad y estabilidad en esta fase sobre la velocidad bruta.
- **Profiling**: Pendiente optimizar el loop de selección sin afectar la heurística de empaquetado.
