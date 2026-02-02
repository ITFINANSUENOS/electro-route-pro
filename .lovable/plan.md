# Plan: Sistema de Gestión de Períodos Históricos

## ✅ IMPLEMENTADO

Este sistema permite:
- Ver datos históricos de cualquier mes cerrado desde los dashboards
- Modificar metas de meses pasados (solo administrador)
- Registrar todos los cambios para trazabilidad

---

## Componentes Implementados

### 1. Hook `usePeriodSelector` 
📁 `src/hooks/usePeriodSelector.ts`

Centraliza la lógica de períodos:
- `selectedPeriod`: mes/año seleccionado
- `availablePeriods`: lista de períodos desde `periodos_ventas`
- `dateRange`: calcula startDate/endDate dinámicamente
- `isPeriodClosed`: boolean indicando si está cerrado

### 2. Componente `PeriodSelector`
📁 `src/components/dashboard/PeriodSelector.tsx`

Dropdown visual que muestra:
- Meses en formato "Enero 2026", "Febrero 2026"
- Indicador de estado: 🔒 cerrado / ✓ activo

### 3. Tabla `historial_metas`
Migración aplicada con:
- Registro de cada cambio en metas
- Campos: mes, anio, accion, registros_afectados, monto_total_anterior, monto_total_nuevo
- RLS: solo admin puede insertar, liderazgo puede ver

### 4. Dashboards Actualizados
- **DashboardLider**: Selector de período + fechas dinámicas
- **DashboardJefe**: Selector de período + fechas dinámicas  
- **DashboardAsesor**: Selector de período + fechas dinámicas

### 5. MetasTab Mejorado
- Selector de período (solo admin puede cambiar)
- Advertencia en períodos cerrados
- Sección colapsible de historial de cambios
- `importMetasCSV` registra automáticamente en historial

---

## Uso

### Dashboard
1. El selector de período aparece en la esquina superior derecha
2. Todos los roles pueden ver datos históricos
3. El período actual se muestra como "activo"

### Metas (solo Admin)
1. Ir a Información → Metas
2. Seleccionar período desde el dropdown
3. Si es período cerrado, aparece advertencia
4. Al cargar CSV, las metas se reemplazan
5. El historial de cambios se registra automáticamente
6. Ver historial en sección colapsible al final

---

## Archivos Modificados

### Nuevos:
- `src/hooks/usePeriodSelector.ts`
- `src/components/dashboard/PeriodSelector.tsx`

### Actualizados:
- `src/components/dashboard/DashboardLider.tsx`
- `src/components/dashboard/DashboardJefe.tsx`
- `src/components/dashboard/DashboardAsesor.tsx`
- `src/components/informacion/MetasTab.tsx`
- `src/utils/importMetasCSV.ts`

### Migración:
- Tabla `historial_metas` con RLS
