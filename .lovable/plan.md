

## Plan: Detección de asesores pendientes solo para mes vigente + normalización de códigos

### Problema actual

1. **Detección acumulativa**: Se detectan asesores de cualquier mes cargado, incluyendo meses pasados donde los asesores pudieron haber sido vendedores temporales
2. **Falsos positivos por ceros a la izquierda**: `2923` (CSV) no matchea con `02923` (perfil) — la comparación es exacta sin normalizar
3. **No se cruza por cédula**: Si un asesor existe con cédula `1061691366` pero código diferente, no se detecta como existente
4. **48 pendientes cuando solo deberían ser 3**: CAMAYO, MONTILLA y ZORRILLA

### Cambios por fases

---

### FASE 1: Corregir detección — solo mes vigente + normalización

**Archivo: `src/components/informacion/CargarVentasTab.tsx`** — función `detectNewAdvisors`

1. **Solo detectar para el mes en curso**: Antes de ejecutar la detección, comparar `month/year` con el mes actual del sistema. Si el archivo cargado es de un mes anterior, NO ejecutar detección (esos asesores ya no son relevantes)
2. **Normalizar códigos al comparar**: Al consultar `profiles`, obtener todos los `codigo_asesor` y `cedula`, y comparar normalizando (quitando ceros a la izquierda con `replace(/^0+/, '')`)
3. **Cruce secundario por cédula**: Si el código no matchea, verificar si la cédula del candidato existe en algún perfil
4. **Excluir códigos genéricos**: Filtrar códigos que normalizados sean `1` (ej: `01`, `001`, `0001` = GENERAL MERCADEO)

**Lógica resumida**:
```text
candidatos del CSV (mes vigente)
  → normalizar codigo_asesor (quitar ceros izq)
  → comparar contra profiles normalizados
  → comparar también por cedula
  → excluir genéricos
  → solo los que no matchean = verdaderos pendientes
```

---

### FASE 2: Limpiar pendientes existentes (auto-resolución)

**Archivo: `src/hooks/usePendingAdvisors.ts`**

- Al cargar la lista de pendientes, ejecutar verificación automática contra `profiles`
- Para cada pendiente, comparar `codigo_asesor` normalizado y `cedula` contra perfiles existentes
- Si hay match, marcar automáticamente como `creado` (auto-resuelto)
- Esto limpia los ~45 falsos positivos actuales sin intervención manual

**Migración SQL**: Marcar como `descartado` el registro `codigo_asesor = '01'` (GENERAL MERCADEO) y todos los pendientes cuyo mes de detección NO sea el mes vigente actual (abril 2026)

---

### FASE 3: Actualizar wizard y documentación

**Archivo: `src/components/usuarios/PendingAdvisorsWizard.tsx`**
- Sin cambios funcionales, solo se beneficia de la lista ya filtrada

**Archivo: `docs/USER_GUIDE.md`**
- Actualizar sección de asesores pendientes indicando que solo se detectan para el mes en curso

---

### Resumen de archivos

| Archivo | Cambio |
|---------|--------|
| `src/components/informacion/CargarVentasTab.tsx` | Solo detectar mes vigente, normalizar códigos, cruzar por cédula |
| `src/hooks/usePendingAdvisors.ts` | Auto-resolución de falsos positivos al cargar lista |
| Migración SQL | Limpiar registros genéricos y de meses anteriores |
| `docs/USER_GUIDE.md` | Actualizar documentación |

**Total: 3 fases, resultado esperado: solo 3 asesores pendientes (CAMAYO, MONTILLA, ZORRILLA)**

