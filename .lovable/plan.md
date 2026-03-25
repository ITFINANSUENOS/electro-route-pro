

## Plan: Corregir datos del Historico + mejoras visuales

### Causa raiz del error de datos

La query de ventas en `useHistoricoData.ts` usa `fetchAllPaginated` con `.range()` **sin `.order()`**. Sin orden estable, PostgreSQL puede retornar filas duplicadas entre paginas cuando pagina 62,488 registros (63 paginas de 1000). Esto causa que registros aparezcan en multiples paginas, inflando los totales (ej. Nov 2025 muestra ~$8B en vez de $5.1B).

**El Dashboard NO tiene este problema** porque consulta un solo mes (~4-5K filas, 5 paginas) donde la probabilidad de duplicacion es menor.

### Cambios

#### 1. Fix critico: Agregar `.order('id')` a queries paginadas
**Archivo: `src/hooks/useHistoricoData.ts`**
- En la query de ventas (linea 121-127): agregar `.order('id')` antes de `.range()`
- En la query de metas (linea 146-151): agregar `.order('id')` antes de `.range()`
- Esto garantiza ordenamiento estable y elimina duplicacion entre paginas

#### 2. Toggle "Modo comparable" (sin FNZ complements)
- Agregar estado `comparableMode` (boolean toggle) en `Historico.tsx`
- Cuando activo: agregar `.neq('mcn_clase', '.')` a la query de ventas
- Cuando inactivo: mostrar valores identicos al Dashboard (incluye FNZ)
- Default: desactivado (igual a Dashboard)
- Pasar como parametro al hook

#### 3. Cambiar icono
- `AppSidebar.tsx` y `Historico.tsx`: reemplazar `History` por `ChartLine` de lucide-react

#### 4. Agregar linea de cumplimiento % al grafico de barras
**Archivo: `src/components/historico/HistoricoBarChart.tsx`**
- Importar `ComposedChart`, `Line`, segundo `YAxis` de recharts (reemplazar `BarChart` por `ComposedChart`)
- Agregar eje Y derecho con escala porcentual
- Agregar `Line` con `dataKey="cumplimiento"` en color naranja/dorado
- Usar `null` para meses donde `meta === 0` para que la linea no caiga a 0% (solo conectar meses con presupuesto)
- Actualizar tooltip para incluir el %

#### 5. Toggle Meta Comercial / Nacional
**Archivo: `src/pages/Historico.tsx`**
- Importar y renderizar `MetaTypeToggle` en el header
- Estado `metaType: 'comercial' | 'nacional'`
- Pasar al hook para filtrar metas por `tipo_meta_categoria`

**Archivo: `src/hooks/useHistoricoData.ts`**
- Recibir `metaType` como parametro
- Aplicar `.eq('tipo_meta_categoria', metaType)` en la query de metas

#### 6. Crear componente de filtros avanzados
**Nuevo archivo: `src/components/historico/HistoricoFilters.tsx`**
- Filtro de regional (multi-select, solo admin/coordinador)
- Filtro de jefe de ventas (select, visible para lider_zona+)
- Filtro de asesor (multi-select, visible para jefe_ventas+)
- Selector de rango de meses (mes/anio inicio y fin)
- Pasar todos los filtros al hook

**Archivo: `src/hooks/useHistoricoData.ts`**
- Recibir filtros adicionales: `codigoJefe`, `codigosAsesor`, `monthRange`
- Aplicar filtros en query y/o procesamiento

#### 7. Agregar columna "Asesores" a tabla detalle
**Archivo: `src/hooks/useHistoricoData.ts`**
- Agregar `asesoresUnicos: number` a `MonthData` contando `codigo_asesor` distintos por mes

**Archivo: `src/components/historico/HistoricoTablaDetalle.tsx`**
- Agregar columna "Asesores" mostrando el conteo

#### 8. Mejorar performance
- Agregar `staleTime: 5 * 60 * 1000` y `retry: 2` a las queries del hook
- Agregar `keepPreviousData: true` para transiciones suaves al cambiar filtros

### Valores esperados post-fix (Noviembre 2025)

| Modo | Valor |
|------|-------|
| Normal (como Dashboard) | $5.106.670.397 |
| Comparable (sin FNZ) | $4.547.563.197 |

### Archivos a modificar
- `src/hooks/useHistoricoData.ts` - fix paginacion, metaType, filtros, asesoresUnicos
- `src/pages/Historico.tsx` - icono, toggle meta, toggle comparable, filtros
- `src/components/historico/HistoricoBarChart.tsx` - linea cumplimiento %
- `src/components/historico/HistoricoTablaDetalle.tsx` - columna asesores
- `src/components/layout/AppSidebar.tsx` - icono ChartLine

### Archivo a crear
- `src/components/historico/HistoricoFilters.tsx`

