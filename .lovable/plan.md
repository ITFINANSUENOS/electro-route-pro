

## Plan: Consolidar CREDITO + CREDICONTADO → FinanSueños + Fix Carga Feb + Lógica FNZ + QA

### Resumen

6 fases de implementacion para consolidar 4 tipos de venta en 3 (CONTADO, FINANSUENOS, ALIADOS), corregir el error de carga del CSV de febrero, ajustar la logica de DV00 y FNZ, y ejecutar QA completo.

---

### Fase 1: Migracion de base de datos (4 migraciones)

**1a. Crear tabla `historial_migraciones`** para trazabilidad:
- Columnas: `id`, `tabla_afectada`, `campo_afectado`, `valor_anterior`, `valor_nuevo`, `registros_afectados`, `descripcion`, `created_at`
- RLS: Solo admins pueden insertar y ver

**1b. Migrar `formas_pago`**: UPDATE `tipo_venta` de CREDITO/CREDICONTADO → FINANSUENOS. INSERT nuevos registros para FS10 (`PLAN FINANSUEÑOS CORTO PLAZO`) y FS12 (`PLAN FINANSUEÑOS LARGO PLAZO`) con `tipo_venta = 'FINANSUENOS'`. Registrar cambio en `historial_migraciones`.

**1c. Migrar `ventas`**: UPDATE `tipo_venta` de CREDITO/CREDICONTADO → FINANSUENOS en todos los registros existentes. Registrar cantidad y valores en historial.

**1d. Migrar `metas`**: UPDATE `tipo_meta` de 'credito'/'credicontado' → 'finansuenos'. Si hay duplicados por asesor/mes/anio, consolidar sumando `valor_meta` en un solo registro. Registrar en historial.

**1e. Migrar `config_metas_promedio`**: Para cada regional y tipo_asesor:
- Tomar valores de CREDITO y CREDICONTADO
- Si CREDICONTADO >= CREDITO: nuevo valor = (CREDICONTADO × 0.80) + (CREDITO × 0.20)
- Si CREDITO > CREDICONTADO: nuevo valor = CREDITO
- Crear registro FINANSUENOS con el resultado, eliminar los de CREDITO y CREDICONTADO
- Registrar valores anteriores en historial

Valores calculados (verificados de la BD):
- CORRETAJE: (1,536,675 × 0.8) + (953,412 × 0.2) = **1,420,022**
- EXTERNO: (1,485,845 × 0.8) + (930,763 × 0.2) = **1,374,829**
- INTERNO: (1,399,145 × 0.8) + (951,867 × 0.2) = **1,309,690**

---

### Fase 2: Fix carga CSV Febrero

**Archivo**: `src/components/informacion/CargarVentasTab.tsx`

**Problema**: `countRowsInMonth` (linea 241) valida contra `targetPeriod` que se auto-detecta como marzo (mes actual). El CSV de febrero falla porque <50% de registros son de marzo.

**Fix**: Agregar auto-deteccion del periodo dominante del CSV antes de la validacion:
1. Parsear las primeras N fechas del CSV para determinar el mes/anio dominante
2. Si difiere del `targetPeriod` actual y no esta en modo historico, ajustar automaticamente `targetPeriod` al periodo detectado
3. Mostrar banner informativo: "Se detecto que el archivo corresponde a Febrero 2026"

---

### Fase 3: Edge Function `load-sales`

**Archivo**: `supabase/functions/load-sales/index.ts`

**3a. Agregar lookup por `cod_forma`**: En `buildPaymentTypeLookup()` (linea 169), ademas de buscar por `codigo` (FORMA1PAGO), agregar un segundo mapa con `cod_forma` (COD_FORMA_) → `tipo_venta`. Esto permite matchear FS10/FS12 directamente.

**3b. Actualizar `deriveTipoVenta()`** (linea 199): Agregar parametro `codForma` y probar primero por FORMA1PAGO, luego por COD_FORMA_. Actualizar fallbacks:
- `CREDICONTADO` → `FINANSUENOS`
- `CREDITO` → `FINANSUENOS`
- `CONVENIO` → `ALIADOS`

---

### Fase 4: Corregir logica DV00 en conteo de ventas

**Archivos**: `src/hooks/useSalesCount.ts`, `src/hooks/useSalesCountByAdvisor.ts`

**Problema actual**: `isCreditDocument()` trata DV00 como "documento de credito" y los agrupa con FV00. Pero DV00 son devoluciones de CUALQUIER tipo de venta.

**Correccion**:
- Eliminar `isCreditDocument()` y `isSaleDocument()` 
- Simplificar agrupacion: solo agrupar registros con mismo IDENTIFICA + fecha cercana (±7 dias) + mismo MCNCLASE
- DV00 con valor negativo restan del total de su tipo de venta pero no se agrupan con FV00 como "una sola venta"
- Normalizar tipos: CREDITO/CREDICONTADO → FINANSUENOS, CONVENIO → ALIADOS

---

### Fase 5: Logica FNZ en comparaciones historicas

**Archivo principal**: `src/hooks/useComparativeData.ts`

**Cambio**: Agregar `tipo_docum` al `selectCols` (linea 142). En el procesamiento de datos (linea 248+):
- Si el periodo actual (selectedMonth/selectedYear) es >= marzo 2026 Y el periodo comparado es < marzo 2026: excluir registros con `tipo_docum = 'FNZ'` del periodo anterior
- Si ambos periodos < marzo 2026: incluir FNZ en ambos (comparacion justa)
- Si ambos periodos >= marzo 2026: no hay FNZ (no hay filtro necesario)

**Tambien aplica en**: `src/hooks/useRegionalesData.ts` — agregar `tipo_docum` al select de ventas y aplicar la misma logica temporal al comparar periodos.

---

### Fase 6: Consolidar UI a 3 tipos de venta

Cambio sistematico en ~23 archivos: reemplazar las 4 constantes de tipos (CONTADO, CREDICONTADO, CREDITO, ALIADOS) por 3 (CONTADO, FINANSUENOS, ALIADOS).

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `RankingTable.tsx` | `TipoVentaKey` = 'CONTADO' \| 'FINANSUENOS' \| 'ALIADOS', labels, short labels |
| 2 | `DashboardLider.tsx` | `tiposVentaColors`, `tiposVentaLabels` (importado de RankingTable), `selectedFilters` default, `budgetVsExecuted` array (linea 807), normalizacion en aggregation (linea 514-515) |
| 3 | `DashboardJefe.tsx` | `tiposVentaColors`, `selectedFilters` default (linea 79), `budgetVsExecuted` (linea 474), normalizacion en aggregation (linea 301-302, 329-330) |
| 4 | `DashboardAsesor.tsx` | `tiposVentaColors`, `tiposVentaLabels`, `budgetVsExecuted` (linea 371), `complianceByType` busqueda de meta |
| 5 | `InteractiveSalesChart.tsx` | `tiposVentaColors`, `tipoVentaBadgeColors`, `tipoVentaColorConfig` (linea 58-78) |
| 6 | `ComparativePieCharts.tsx` | `TYPE_COLORS`, `TYPE_LABELS` (linea 15-45) |
| 7 | `RegionalesTipoVentaTable.tsx` | `TIPOS`, `TIPO_LABELS` (linea 15-21) |
| 8 | `TipoVentaFilter.tsx` | `TIPOS_VENTA` array (linea 7-12) |
| 9 | `FormasPagoConfig.tsx` | `TIPOS_VENTA` (linea 46-51) |
| 10 | `MetasConfig.tsx` | `TIPOS_VENTA`, `tiposVentaLabels` (linea 17-24) |
| 11 | `MetasTab.tsx` | `tiposVenta` array (linea 53-58) |
| 12 | `useComparativeData.ts` | Normalizacion CREDITO/CREDICONTADO → FINANSUENOS + filtro FNZ + applyFilters mapping (linea 126) |
| 13 | `useRegionalesData.ts` | Normalizacion en procesamiento (linea 204-205, 233-234) |
| 14 | `useSalesCount.ts` | Normalizacion en `normalizeTipoVenta` |
| 15 | `useSalesCountByAdvisor.ts` | Misma normalizacion |
| 16 | `calculateMetaQuantity.ts` | Soporte FINANSUENOS en el comentario JSDoc |
| 17 | `exportMetasTemplate.ts` | Columnas: quitar CREDICONTADO/CREDITO, agregar FINANSUENOS (linea 69-78) |
| 18 | `exportMetasDetailExcel.ts` | `TIPOS_VENTA`, `TIPO_VENTA_LABELS` |
| 19 | `exportRankingExcel.ts` | Headers de columnas (linea 39-43, 51-55) |
| 20 | `exportAdvisorsExcel.ts` | `SALE_TYPES`, `SALE_TYPE_LABELS` (linea 23-30) |
| 21 | `exportPromediosTemplate.ts` | `TIPOS_VENTA`, `tiposVentaLabels` (linea 5-12) |
| 22 | `importMetasCSV.ts` | Mapear credito/credicontado → finansuenos al importar |
| 23 | `importPromediosTemplate.ts` | `TIPOS_VENTA_MAP` (linea 4-17) |
| 24 | `PaymentBreakdown.tsx` | Usa `tiposVentaLabels` de RankingTable — se actualiza automaticamente |
| 25 | `ComparativeFilters.tsx` | Si tiene selector de tipo de venta |

**Color para FINANSUENOS**: `hsl(var(--primary))` (purpura/azul, hereda del color de Credito que era el mas prominente).

---

### Fase 7: QA completo post-implementacion

Revision sistematica de todas las vistas del aplicativo:

1. **Dashboard Lider**: Verificar grafico de pastel (3 tipos), ranking con columnas correctas, grafico presupuesto vs ejecutado (3 barras), KPIs totales consistentes
2. **Dashboard Jefe**: Misma verificacion que Lider pero con scope de equipo
3. **Dashboard Asesor**: Compliance por tipo con FINANSUENOS, grafico presupuesto vs ejecutado
4. **Comparativo**: Graficos de pastel con 3 tipos, normalizacion CONVENIO → ALIADOS, CREDITO/CREDICONTADO → FINANSUENOS, logica FNZ aplicada
5. **Regionales**: Tabla de desglose por tipo de venta con 3 columnas, ranking bar chart
6. **Informacion > Metas**: Tabla con 3 tipos, importacion CSV mapeando credito/credicontado → finansuenos
7. **Informacion > Cargar Ventas**: Verificar que el CSV de febrero se cargue correctamente con auto-deteccion
8. **Configuracion > Formas de Pago**: Tipos actualizados a 3, nuevos codigos FS10/FS12 presentes
9. **Configuracion > Metas**: Promedios consolidados con valores correctos
10. **Exportaciones Excel**: Todas las plantillas y reportes con 3 columnas de tipo de venta
11. **Mapa**: Sin impacto directo (no usa tipos de venta)
12. **Funciones de BD**: `get_top_regional_sales`, `get_advisor_regional_position`, etc. filtran `tipo_venta != 'OTROS'` — FINANSUENOS pasa correctamente

