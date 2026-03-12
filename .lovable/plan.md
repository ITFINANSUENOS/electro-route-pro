

## Plan: Subcategorización FinanSueños (Largo/Corto Plazo) + Fix encoding Ñ

### Problema actual
1. **Encoding corrupto**: Los valores `forma1_pago` con "Ñ" se almacenaron como `FINANSUE�OS` (U+FFFD) en la BD. Esto se ve en el pantallazo y afecta el matching con la tabla `formas_pago`.
2. **Sin subcategorización**: Al desglosar FinanSueños se muestran 13+ items sin agrupar. El usuario necesita una capa intermedia: **Largo Plazo** y **Corto Plazo**.

### Cambios propuestos

**1. Migración BD: Fix encoding + agregar columna `subcategoria`**

- Corregir todos los `forma1_pago` en `ventas` que contienen el carácter corrupto `U+FFFD` reemplazándolo por `Ñ`
- Agregar columna `subcategoria` (nullable, text) a la tabla `formas_pago` con valores:
  - `LARGO_PLAZO`: PLAN FINANSUEÑOS 15 MESES, Crédito Arpesod, PLAN FINANSUEÑOS 18 MESES, PLAN FINANSUEÑOS 12 MESES, PLAN FINANSUEÑOS 10 MESES, Crédito Retanqueo, PLAN FINANSUEÑOS 7 MESES, PLAN FINANSUEÑOS LARGO PLAZO
  - `CORTO_PLAZO`: 2 Cuotas, 3 Cuotas, 4 Cuotas, 5 Cuotas, 6 Cuotas (todos los de cuotas + incremento), PLAN FINANSUEÑOS CORTO PLAZO
  - `NULL` para las demás formas de pago (CONTADO, ALIADOS, OTROS)

**2. Actualizar `FormasPagoConfig.tsx`**
- Agregar campo "Subcategoría" al formulario de edición/creación (Select con opciones: Largo Plazo, Corto Plazo, N/A)
- Mostrar columna subcategoría en la tabla con badges
- Filtro por subcategoría

**3. Actualizar `ComparativePieCharts.tsx` + `useComparativeData.ts`**
- Al hacer drill-down en FinanSueños, mostrar primero 2 segmentos: "Largo Plazo" y "Corto Plazo" (nivel intermedio)
- Al hacer clic en uno de esos segmentos, mostrar el desglose individual por forma de pago
- Fetch de `subcategoria` junto con `formas_pago` en el query existente
- Construir un `subcategoriaMap` (codigo → subcategoria) para agrupar en el nivel intermedio

**4. Fix encoding en `load-sales/index.ts`**
- Antes de guardar `forma1_pago`, reemplazar el carácter corrupto `\uFFFD` por `Ñ` para que futuros cargues no tengan el problema
- Alternativa: normalizar la lectura del CSV con encoding Latin-1/Windows-1252 fallback

### Flujo de drill-down propuesto

```text
Nivel 1: Contado | FinanSueños | Aliados
           ↓ clic en FinanSueños
Nivel 2: Largo Plazo (X ventas, $Y) | Corto Plazo (Z ventas, $W)
           ↓ clic en Largo Plazo
Nivel 3: Plan FinanSueños 15 Meses | Crédito Arpesod | Plan 18M | Plan 12M | ...
```

### Configuración en "Formas Pago"
- La columna `subcategoria` será editable desde el tab de Configuración → Formas Pago
- El admin puede reclasificar cualquier forma de pago entre Largo Plazo y Corto Plazo
- Los cambios se registran en `historial_ediciones`

### Archivos a modificar
- **Nueva migración SQL**: ALTER TABLE + UPDATE datos + fix encoding
- `supabase/functions/load-sales/index.ts`: fix encoding Ñ
- `src/components/configuracion/FormasPagoConfig.tsx`: campo subcategoria
- `src/hooks/useComparativeData.ts`: fetch subcategoria, agrupar nivel intermedio
- `src/components/comparativo/ComparativePieCharts.tsx`: 3 niveles de drill-down
- `src/components/dashboard/PaymentBreakdown.tsx`: misma lógica si aplica

