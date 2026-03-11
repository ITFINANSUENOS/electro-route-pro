

## Plan: Corregir lógica de conteo de ventas únicas

### Problema identificado

El conteo actual agrupa ventas por **cliente (IDENTIFICA) + MCNCLASE + proximidad de fecha (7 días)**, lo cual es incorrecto. Los datos reales muestran que:

1. Una venta puede tener múltiples filas (productos), y la llave correcta para agruparlas es: **`tipo_documento` + `numero_doc` + `fecha`** (en la BD: CSV `TIPO_DOCUM` → DB `tipo_documento`, ej: FEPO, FECA, FEPL)
2. El registro "OBSEQUIOS CLIENTES" (valor $1,319,327.73, numero_doc 6.984, tipo_documento FECA) está mapeado como FINANSUENOS en `formas_pago`, pero debería ser **OTROS** (no es una venta real)

**Resultado esperado para Marzo 2026:**
- FinanSueños: 2 ventas = $3,890,756.31 (no 4 ventas / $5,210,084)
- Aliados: 32 ventas = $61,500,134 (correcto)
- Contado: incluye DV00 = $545,568,499 (correcto)

---

### Cambios requeridos

**1. Migración BD: Corregir "OBSEQUIOS CLIENTES"**
- UPDATE `formas_pago` SET `tipo_venta` = 'OTROS' WHERE `codigo` = 'OBSEQUIOS CLIENTES'
- UPDATE `ventas` SET `tipo_venta` = 'OTROS' WHERE `forma1_pago` ILIKE '%obsequio%' AND `tipo_venta` = 'FINANSUENOS'
- Registrar en `historial_migraciones`

**2. Refactorizar `useSalesCount.ts`**
- Cambiar la interfaz `SaleRecord` para incluir `tipo_documento` y `numero_doc`
- Cambiar la lógica de agrupación: agrupar por **`tipo_documento` + `numero_doc` + `fecha`** en vez de `identifica` + `mcn_clase` + proximidad de fecha
- Cada grupo = 1 venta única, sumar todos los `vtas_ant_i` del grupo
- Solo contar como venta si el total neto > 0
- El `tipo_venta` y `forma1_pago` se toman del primer registro del grupo
- Eliminar la constante `MAX_DAYS_DIFFERENCE` y las funciones `parseDate`/`daysDifference` (ya no se necesitan)
- Actualizar `transformVentasForCounting` para pasar `tipo_documento` y `numero_doc`

**3. Refactorizar `useSalesCountByAdvisor.ts`**
- Misma lógica: agrupar por `tipo_documento` + `numero_doc` + `fecha`
- Agregar `tipo_documento` y `numero_doc` a la interfaz `SaleRecord`

**4. Actualizar llamadas en dashboards**
- `DashboardLider.tsx` (líneas 870-877, 898-906): Pasar `tipo_documento` y `numero_doc` en el transform y en el map manual
- `DashboardJefe.tsx` (líneas 374-382): Mismo ajuste en `transformVentasForCounting`
- `DashboardAsesor.tsx` (línea 259): Mismo ajuste

---

### Lógica de agrupación nueva (pseudocódigo)

```text
Para cada registro de ventas:
  key = `${tipo_documento}|${numero_doc}|${fecha}`
  Agrupar todos los registros con la misma key
  
Para cada grupo:
  totalValue = SUM(vtas_ant_i) de todos los registros del grupo
  Si totalValue > 0 → contar como 1 venta
  tipo_venta = normalizar(primer registro del grupo)
  codigo_asesor = primer registro del grupo
```

Esto garantiza que:
- FEPO 10.563 (filas 121-122 del CSV) = 1 venta = $2,079,831.94
- FEPO 10.564 (fila 25 del CSV) = 1 venta = $1,810,924.37
- FECA 6.984 (obsequio) = excluido por tipo_venta = OTROS

