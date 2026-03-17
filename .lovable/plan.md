

## Plan: Flujo de cierre de mes y validación de cargas históricas

### Resumen del cambio

Ajustar el flujo de carga de ventas para que:
- El periodo de gracia sea de **2 días** (no 5)
- Durante días 1-2 del mes siguiente, **cada carga pregunte** si es el informe final del mes anterior
- Una vez cerrado el mes (por respuesta "Sí" o al llegar día 3), las cargas se asignen automáticamente al mes en curso
- En **modo histórico**, mostrar un badge con el estado de la última carga exitosa del periodo seleccionado

---

### Cambios técnicos

**1. Migración BD — Agregar periodo a `carga_archivos`**

```sql
ALTER TABLE carga_archivos 
  ADD COLUMN periodo_mes INTEGER,
  ADD COLUMN periodo_anio INTEGER;
```

Permite filtrar historial por periodo específico.

**2. `src/hooks/useSalesPeriod.ts`**

- Cambiar `isGracePeriod`: de `day <= 5` a `day <= 2`
- Cambiar `getTargetMonth`: de `day <= 5` a `day <= 2`
- Actualizar comentarios

**3. `src/components/informacion/CargarVentasTab.tsx`**

Flujo de carga ajustado:

```text
Usuario sube CSV
  │
  ├─ Modo Histórico activo? → Cargar al periodo seleccionado (sin preguntas)
  │
  ├─ Estamos en día 1-2 del mes Y periodo anterior NO cerrado?
  │     │
  │     └─ Auto-detectar periodo del CSV
  │          ├─ CSV es del mes anterior → Cargar + Preguntar "¿Es el informe final de [mes anterior]?"
  │          │     ├─ SÍ → Cerrar periodo anterior. Siguientes cargas van al mes actual.
  │          │     └─ NO → Periodo sigue abierto. Próxima carga vuelve a preguntar.
  │          └─ CSV es del mes actual → Cargar al mes actual normalmente
  │
  ├─ Día >= 3 O periodo anterior ya cerrado?
  │     └─ Cargar al mes actual automáticamente
  │
  └─ Guardar periodo_mes/periodo_anio en carga_archivos
```

Cambios específicos:
- Al finalizar una carga exitosa durante periodo de gracia: mostrar `MonthCloseDialog` con la pregunta "¿Es este el informe final de ventas del mes de [Marzo]?"
- Si responde NO: la carga se completa normalmente, periodo sigue abierto
- Si responde SÍ: cerrar periodo, toast de confirmación
- Guardar `periodo_mes` y `periodo_anio` en cada insert a `carga_archivos`

**4. Badge de estado en modo histórico**

Cuando se activa modo histórico y se selecciona un periodo:
- Query a `carga_archivos` filtrando por `periodo_mes`, `periodo_anio`, `estado = 'completado'`, ordenado por `created_at DESC`, limit 1
- Query a `ventas` contando registros del periodo
- Si hay datos: Mostrar badge verde "✓ Datos cargados — [nombre_archivo] — [fecha] — [X registros]"
- Si no hay datos: Mostrar badge naranja "⚠ Sin datos cargados para este periodo"

**5. Historial filtrado**

- Cuando está en modo histórico: filtrar historial por `periodo_mes` y `periodo_anio`
- Cuando NO está en modo histórico: mostrar las últimas 15 cargas globales (subir de 10)

---

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Migración SQL | Agregar `periodo_mes`, `periodo_anio` a `carga_archivos` |
| `useSalesPeriod.ts` | Grace period de 5→2 días |
| `CargarVentasTab.tsx` | Flujo de pregunta post-carga, guardar periodo, badge histórico, historial filtrado |
| `MonthCloseDialog.tsx` | Sin cambios (ya tiene la estructura necesaria) |

