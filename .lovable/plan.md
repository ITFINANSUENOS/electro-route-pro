

## Plan: Backfill de periodos y badge de estado por mes

### Problema
Todos los registros en `carga_archivos` tienen `periodo_mes` y `periodo_anio` en NULL porque las columnas se agregaron despues de que se hicieron las cargas. El badge historico y el historial filtrado no funcionan.

### Datos actuales

Los periodos con datos activos en `ventas` son:
- Ene 2025 → `VTS 012025.csv` (3,647 registros)
- Feb 2025 → `VTS 022025.csv` (4,134 registros)
- Mar 2025 → `VTS MARZO 2025.csv` (4,446 registros)
- Ene 2026 → `VTS ENERO 2026.csv` (4,040 registros)
- Feb 2026 → `VTS final 28 FEB '26.csv` (3,555 registros)
- Mar 2026 → `VTS 6PM 13-MAR.csv` (883 registros, en curso)

### Solucion en 2 pasos

**1. Migracion SQL: Backfill usando datos reales**

```sql
-- Paso 1: Registros con ventas activas vinculadas (los importantes)
UPDATE carga_archivos ca SET
  periodo_mes = sub.mes,
  periodo_anio = sub.anio
FROM (
  SELECT v.carga_id,
    EXTRACT(MONTH FROM MODE() WITHIN GROUP (ORDER BY v.fecha))::int AS mes,
    EXTRACT(YEAR FROM MODE() WITHIN GROUP (ORDER BY v.fecha))::int AS anio
  FROM ventas v WHERE v.carga_id IS NOT NULL
  GROUP BY v.carga_id
) sub
WHERE ca.id = sub.carga_id AND ca.periodo_mes IS NULL;

-- Paso 2: Registros huerfanos - inferir del created_at como heuristica
-- Para cargas diarias que fueron reemplazadas por archivos mas recientes
UPDATE carga_archivos SET
  periodo_mes = EXTRACT(MONTH FROM created_at)::int,
  periodo_anio = EXTRACT(YEAR FROM created_at)::int
WHERE periodo_mes IS NULL AND tipo = 'ventas';
```

Esto llenara correctamente los 6 archivos activos con su periodo real, y los ~14 archivos huerfanos (cargas diarias reemplazadas) usaran la fecha de creacion como aproximacion.

**2. Mejorar la query del badge en CargarVentasTab.tsx**

Agregar una query de fallback para el badge historico: si no encuentra registros en `carga_archivos` por `periodo_mes`/`periodo_anio`, buscar el `carga_id` activo en `ventas` para ese rango de fechas y cruzar con `carga_archivos`. Esto garantiza que incluso si el backfill del paso 2 asigno un periodo incorrecto a un registro huerfano, el badge siempre mostrara la informacion del archivo que REALMENTE tiene los datos activos.

Cambiar el orden del historial en modo historico a ascendente (mas antiguo primero) para ver la secuencia de cargas.

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Migracion SQL | Backfill periodo_mes/periodo_anio |
| `CargarVentasTab.tsx` | Fallback query via ventas.carga_id para badge; historial ascendente en modo historico |

