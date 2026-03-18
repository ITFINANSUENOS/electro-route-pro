

## Plan: Tab "Historico" - Informe Estrategico de Ventas Multi-Periodo

### Datos disponibles
7 meses con datos en `ventas`: Ene-Abr 2025, Ene-Mar 2026. Metas en tabla `metas` por `codigo_asesor`, `mes`, `anio`. Tipos de venta: CONTADO, FINANSUENOS, CREDITO, ALIADOS, CONVENIO, OTROS (CREDITO/CREDICONTADO se normalizan a FINANSUENOS, CONVENIO a ALIADOS).

### Filtrado por rol

| Rol | Scope |
|-----|-------|
| asesor_comercial | Solo su `codigo_asesor` |
| jefe_ventas | Asesores con su `codigo_jefe` |
| lider_zona | Asesores de su `regional_id` |
| coordinador/admin | Todo, con filtro regional opcional |

---

### Componentes

**1. KPI Cards (4 tarjetas con tooltips interactivos)**

- **Total Acumulado**: valor total historico. Tooltip: desglose valor + cantidad por tipo de venta.
- **Promedio Mensual**: promedio de ventas por mes. **Tooltip**: promedio en valor Y cantidad para cada tipo de venta (CONTADO, FINANSUENOS, ALIADOS).
- **Mejor Mes**: nombre del mes + valor. **Tooltip**: cuanto vendio ese mes en valor Y cantidad para cada tipo de venta.
- **Tendencia**: ultimo mes vs promedio, % crecimiento. Tooltip: variacion por tipo.

Se usa el componente `KpiCard` existente con `tooltipItems` ya soportado.

**2. Grafico de barras apiladas por tipo de venta (estilo RegionalesBarChart)**

- Eje X: meses (Ene 25, Feb 25, ..., Mar 26)
- Cada barra de ventas: segmentos apilados por tipo (CONTADO oscuro abajo, FINANSUENOS medio, ALIADOS claro arriba) - misma paleta azul del grafico de Regionales
- Barra de meta al lado: segmentos apilados verdes proporcionales
- **Filtro TipoVentaFilter** (reutilizar `TipoVentaFilter` existente): al filtrar, muestra solo los tipos seleccionados
- Cuando todos estan seleccionados, diferencia por colores cada tipo
- Tooltip custom mostrando valor total, meta, y desglose por tipo
- Leyenda lateral igual que RegionalesBarChart

**3. Grafico de lineas: Evolucion de cantidad (Q)**

- Linea de cantidad total de ventas por mes
- Opcionalmente desglosada por tipo de venta con toggle

**4. Tabla de detalle mensual**

- Filas = meses ordenados cronologicamente
- Columnas: Mes, Total ($), CONTADO, FINANSUENOS, ALIADOS, Q (cantidad), Meta, Cumplimiento %, Var. % vs mes anterior
- Fila de totales/promedios al final (como en RegionalesRankingTable)
- Colores de cumplimiento consistentes con el resto del sistema

**5. Ranking Comparativo por Regional/Jefe (solo roles globales)**

En lugar de un heatmap estatico, una **tabla interactiva de evolucion por regional** con:
- Filas: cada regional
- Columnas: cada mes disponible
- Celdas: valor de venta con color de fondo segun cumplimiento (verde >80%, amarillo 60-80%, rojo <60%)
- Click en celda: expande detalle de esa regional en ese mes (desglose por tipo)
- Fila de totales
- Filtro de tipo de venta aplicable

Para jefe_ventas: en vez de regionales, filas = asesores de su equipo.
Para lider_zona: filas = jefes de venta o asesores de su regional.

---

### Archivos a crear

| Archivo | Descripcion |
|---------|-------------|
| `src/hooks/useHistoricoData.ts` | Hook principal: consulta ventas y metas de TODOS los periodos disponibles en `periodos_ventas`, pagina con `fetchAllPaginated`, filtra por rol, agrupa por mes/tipo |
| `src/pages/Historico.tsx` | Pagina contenedora con header, filtros y componentes |
| `src/components/historico/HistoricoKPICards.tsx` | 4 KPI cards con tooltips de desglose por tipo |
| `src/components/historico/HistoricoBarChart.tsx` | Barras apiladas por tipo + meta, con TipoVentaFilter, basado en RegionalesBarChart |
| `src/components/historico/HistoricoCantidadChart.tsx` | Lineas de evolucion de cantidad |
| `src/components/historico/HistoricoTablaDetalle.tsx` | Tabla mensual con variaciones y totales |
| `src/components/historico/HistoricoRegionalGrid.tsx` | Tabla interactiva regionales x meses (roles globales) |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | Agregar ruta `/historico` |
| `src/components/layout/AppSidebar.tsx` | Agregar nav item `historico` con icono `History`, roles: todos |
| `src/types/auth.ts` | Agregar `'historico'` a `menuOrderByRole` para todos los roles (despues de `comparativo`) |

### Detalles tecnicos

- **Paginacion**: `fetchAllPaginated` para consultas >1000 registros (ventas historicas ~27K registros totales)
- **Normalizacion tipos**: CREDITO/CREDICONTADO → FINANSUENOS, CONVENIO → ALIADOS, filtrar OTROS
- **Queries**: una query por rango de fechas cubriendo todos los periodos disponibles, no una por mes
- **Paleta de colores**: reutilizar la misma de RegionalesBarChart (azules para ventas, verdes para metas)
- **Componente TipoVentaFilter**: mover de `src/components/regionales/` o importar directamente (ya es generico)

