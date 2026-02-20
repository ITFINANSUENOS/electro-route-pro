

# Plan: Dashboard Comparativo de Regionales

## Resumen

Crear una nueva pagina **"Regionales"** accesible desde el menu lateral (debajo de Dashboard) para roles `lider_zona`, `coordinador_comercial` y `administrador`. Esta pagina presenta un dashboard comparativo global de todas las regionales con multiples vistas: cumplimiento de metas, desglose por tipo de venta, y comparativo historico mes a mes.

---

## Estructura Visual

### Header
- Icono de TrendingUp con flecha subiendo + titulo "Regionales"
- Selector de periodo (mes/anio) reutilizando `PeriodSelector`
- Toggle para alternar entre Meta Comercial y Meta Nacional

### Seccion 1: Ranking de Regionales por Cumplimiento de Meta

Una tabla/cards mostrando cada regional con:
- Nombre de la regional
- Venta total del periodo
- Meta asignada (comercial o nacional segun toggle)
- % de cumplimiento (barra de progreso)
- Cantidad de ventas (Q)
- Ordenadas de mayor a menor cumplimiento

### Seccion 2: Grafica Comparativa de Barras por Regional

Un BarChart horizontal o vertical con:
- Una barra por regional mostrando venta actual vs meta
- Colores diferenciados: verde si supera meta, amarillo si esta entre 70-100%, rojo si esta debajo de 70%
- Tooltip con detalle de valores

### Seccion 3: Desglose por Tipo de Venta

Una tabla o grafico apilado que muestre, por cada regional:
- Ventas en Contado (valor + cantidad)
- Ventas en Credito / Finansuenos (valor + cantidad)
- Ventas en Aliados/Convenio (valor + cantidad)
- Ventas en CrediContado (valor + cantidad)
- Total

### Seccion 4: Comparativo Historico (mes actual vs mes anterior)

Similar al modulo Comparativo existente pero agrupado por regional:
- Barras agrupadas mostrando mes actual vs mes anterior por regional
- KPIs de variacion porcentual por regional
- Lineas de tendencia opcionales

---

## Detalle Tecnico

### Archivos nuevos

1. **`src/pages/Regionales.tsx`**
   - Pagina principal que orquesta las secciones
   - Usa `PeriodSelector` y `MetaTypeToggle` existentes
   - Controla estado de filtros y periodo seleccionado

2. **`src/hooks/useRegionalesData.ts`**
   - Hook principal que consulta:
     - `regionales` (lista de regionales activas)
     - `ventas` (ventas del periodo, con paginacion)
     - `metas` (metas por codigo_asesor, cruzadas con profiles para agrupar por regional)
     - `profiles` (para mapear codigo_asesor a regional_id)
   - Agrupa ventas por regional_id calculando: total_valor, total_cantidad, desglose por tipo_venta
   - Agrupa metas por regional sumando las metas individuales
   - Calcula % cumplimiento por regional
   - Para el historico: trae tambien el mes anterior y calcula variaciones

3. **`src/components/regionales/RegionalesRankingTable.tsx`**
   - Tabla con ranking de regionales ordenadas por cumplimiento
   - Barra de progreso visual con colores segun umbral
   - Columnas: posicion, nombre, ventas, meta, %, cantidad

4. **`src/components/regionales/RegionalesBarChart.tsx`**
   - Grafico de barras (Recharts) comparando ventas vs meta por regional
   - Barras coloreadas segun nivel de cumplimiento
   - Doble barra: actual vs meta

5. **`src/components/regionales/RegionalesTipoVentaTable.tsx`**
   - Tabla con desglose por tipo de venta para cada regional
   - Sub-columnas: Contado, Credito, Aliados, CrediContado
   - Cada celda muestra valor ($) y cantidad (Q)

6. **`src/components/regionales/RegionalesHistoricoChart.tsx`**
   - Grafico de barras agrupadas: mes actual vs mes anterior por regional
   - KPIs de variacion al pie o encima del grafico
   - Reutiliza patrones del ComparativeChart existente

### Archivos modificados

1. **`src/components/layout/AppSidebar.tsx`**
   - Agregar item de navegacion "Regionales" con icono `TrendingUp`
   - Roles: `lider_zona`, `coordinador_comercial`, `administrador`
   - Posicion: justo debajo de "Dashboard"

2. **`src/types/auth.ts`**
   - Agregar `'regionales'` al `menuOrderByRole` para los 3 roles, despues de `'dashboard'`

3. **`src/App.tsx`**
   - Agregar ruta `/regionales` apuntando al nuevo componente

### Datos utilizados

- **`regionales`**: lista de regionales (id, nombre, codigo)
- **`ventas`**: datos de ventas con paginacion (fecha, vtas_ant_i, codigo_asesor, tipo_venta)
- **`metas`**: metas por codigo_asesor (valor_meta, tipo_meta_categoria)
- **`profiles`**: mapeo codigo_asesor a regional_id
- No se requieren cambios en la base de datos

### Logica de paginacion

Se reutiliza el patron de paginacion existente en `useComparativeData` (fetch en bloques de 1000 registros) para garantizar datos completos.

### Logica de metas

- Se suman las metas individuales de los asesores de cada regional para obtener la meta regional
- Se filtra por `tipo_meta_categoria` segun el toggle (comercial/nacional)
- Se usa el periodo seleccionado (mes/anio) para filtrar metas

---

## Orden de Implementacion

1. Crear `useRegionalesData.ts` con toda la logica de consulta y agregacion
2. Crear los 4 componentes visuales (Ranking, BarChart, TipoVenta, Historico)
3. Crear `Regionales.tsx` integrando todo
4. Modificar `AppSidebar.tsx`, `auth.ts` y `App.tsx` para agregar navegacion y ruta

