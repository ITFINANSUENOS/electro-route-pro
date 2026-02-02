

# Plan: Sistema de Gestión de Períodos Históricos

## Resumen del Cambio

Implementaremos un sistema completo que permita:
- Ver datos históricos de cualquier mes cerrado desde los dashboards
- Modificar metas de meses pasados (solo administrador)
- Registrar todos los cambios para trazabilidad

---

## Componente 1: Selector de Período en Dashboards

### Nuevo componente `PeriodSelector`
Crearemos un selector tipo dropdown que mostrará los períodos disponibles:
- Mostrará meses en formato "Enero 2026", "Febrero 2026"
- Incluirá indicador visual del estado: abierto (activo) o cerrado (completado)
- Por defecto mostrará el período actual o el más reciente

```text
+----------------------------------+
|  📅  Enero 2026  ▼               |
+----------------------------------+
|  ✓ Febrero 2026 (activo)         |
|  🔒 Enero 2026 (cerrado)          |
+----------------------------------+
```

### Dashboards afectados
- **DashboardLider** (administrador, coordinador, lider_zona)
- **DashboardJefe** (jefe_ventas)  
- **DashboardAsesor** (asesor_comercial)

### Cambios en cada dashboard
1. Agregar estado `selectedPeriod` (mes/año)
2. Reemplazar fechas hardcodeadas por fechas dinámicas basadas en el período seleccionado
3. Los queries de ventas, metas y cumplimiento usarán el período seleccionado

---

## Componente 2: Hook Centralizado `usePeriodSelector`

Nuevo hook que centralizará la lógica de períodos:

```text
usePeriodSelector()
├── availablePeriods: lista de períodos con datos
├── selectedPeriod: {mes, anio}
├── setSelectedPeriod: función para cambiar
├── dateRange: {startDate, endDate} calculado
├── isPeriodClosed: boolean
└── periodLabel: "Enero 2026"
```

**Lógica:**
- Busca períodos en `periodos_ventas`
- Agrega período actual si no existe
- Ordena del más reciente al más antiguo

---

## Componente 3: Modificación de Metas Históricas

### Cambios en MetasTab

Agregar selector de período para administradores:

```text
+------------------------------------------------+
|  📅 Período: [Enero 2026 ▼]                     |
|  ⚠️ Este período está cerrado. Las metas       |
|     cargadas reemplazarán las existentes.      |
|                                                 |
|  [Plantilla Metas] [Descargar $yQ] [Cargar CSV]|
+------------------------------------------------+
```

**Reglas de acceso:**
- `administrador`: puede seleccionar cualquier período y modificar metas
- Otros roles: solo pueden ver el período actual

### Modificación de `importMetasCSV`
La función ya implementa la lógica de reemplazo (delete + insert). Solo necesitamos asegurar que reciba el mes/año correcto.

---

## Componente 4: Historial de Cambios de Metas

### Nueva tabla `historial_metas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | Identificador único |
| mes | integer | Mes afectado |
| anio | integer | Año afectado |
| accion | text | 'carga_masiva', 'correccion' |
| registros_afectados | integer | Cantidad de metas modificadas |
| monto_total_anterior | numeric | Suma total antes del cambio |
| monto_total_nuevo | numeric | Suma total después del cambio |
| modificado_por | uuid | Usuario que realizó el cambio |
| notas | text | Comentario opcional |
| created_at | timestamp | Fecha/hora del cambio |

### Políticas RLS
- Solo `administrador` puede insertar registros
- `lider_zona`, `coordinador_comercial` y `administrador` pueden ver el historial

### Integración
- Antes de eliminar las metas existentes, guardar el total anterior
- Después de insertar, calcular el nuevo total
- Registrar en `historial_metas`

---

## Secuencia de Implementación

```text
1. Base de datos
   └── Crear tabla historial_metas con RLS

2. Hook usePeriodSelector
   └── Lógica centralizada de períodos

3. Componente PeriodSelector
   └── UI del dropdown

4. DashboardLider
   ├── Integrar PeriodSelector
   └── Usar fechas dinámicas

5. DashboardJefe
   ├── Integrar PeriodSelector
   └── Usar fechas dinámicas

6. DashboardAsesor
   ├── Integrar PeriodSelector
   └── Usar fechas dinámicas

7. MetasTab
   ├── Agregar selector de período (solo admin)
   ├── Mostrar advertencia en períodos cerrados
   └── Integrar registro en historial_metas

8. Utilidad importMetasCSV
   └── Agregar registro de historial
```

---

## Detalles Tecnicos

### Cálculo de rango de fechas

```typescript
// Dado un período {mes: 1, anio: 2026}
const startDate = new Date(anio, mes - 1, 1);  // 2026-01-01
const endDate = new Date(anio, mes, 0);         // 2026-01-31 (último día)
```

### Queries de ventas adaptados

```typescript
// Antes (hardcodeado)
const startDateStr = '2026-01-01';
const endDateStr = '2026-01-31';

// Después (dinámico)
const { startDate, endDate } = usePeriodSelector();
// startDate y endDate calculados según período seleccionado
```

### Validación de permisos para modificar metas

```typescript
// Solo admin puede cambiar períodos cerrados
const canModifyPeriod = role === 'administrador' || !isPeriodClosed;
```

---

## Visualización del Historial

En la pestaña de Metas, agregar sección expandible:

```text
+------------------------------------------------+
| 📋 Historial de Cambios                    [▼] |
+------------------------------------------------+
| 02/02/2026 10:15 - Admin User                  |
| Carga masiva: 444 metas reemplazadas           |
| Total anterior: $5,833M → Nuevo: $5,833M       |
+------------------------------------------------+
| 25/01/2026 14:30 - Admin User                  |
| Carga inicial: 444 metas                       |
| Total: $5,833M                                 |
+------------------------------------------------+
```

---

## Archivos a Crear/Modificar

### Nuevos archivos:
1. `src/hooks/usePeriodSelector.ts` - Hook centralizado
2. `src/components/dashboard/PeriodSelector.tsx` - Componente UI

### Archivos a modificar:
1. `src/components/dashboard/DashboardLider.tsx` - Agregar selector y fechas dinámicas
2. `src/components/dashboard/DashboardJefe.tsx` - Agregar selector y fechas dinámicas
3. `src/components/dashboard/DashboardAsesor.tsx` - Agregar selector y fechas dinámicas
4. `src/components/informacion/MetasTab.tsx` - Selector para admin + historial
5. `src/utils/importMetasCSV.ts` - Registro de historial

### Migración de base de datos:
1. Crear tabla `historial_metas`
2. Políticas RLS correspondientes

---

## Resultado Final

Después de implementar estos cambios:

1. **Dashboard para todos los roles**: Podrán seleccionar "Enero 2026" o "Febrero 2026" y ver los datos correspondientes a ese período
2. **Administrador en Metas**: Podrá seleccionar un mes pasado (Enero), cargar un CSV corregido, y el sistema:
   - Borrará las metas anteriores de ese mes
   - Insertará las nuevas metas
   - Registrará quién hizo el cambio y cuándo
3. **Trazabilidad**: Cualquier modificación quedará registrada para auditoría

