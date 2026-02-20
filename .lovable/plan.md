

## Plan: Preparacion Completa para Carga de Ventas Historicas 2025

### Resumen
Implementar todos los cambios necesarios en base de datos, edge function y UI para cargar exitosamente los CSVs de enero y febrero 2025, manejando correctamente codigos de pago nuevos, encoding corrupto, devoluciones, asesores inactivos y datos de producto.

---

### Hallazgos Clave de los CSVs

**Enero 2025**: ~3,648 registros | **Febrero 2025**: ~4,135 registros

**Codigos de pago**:
- Todos los FORMA1PAGO de enero 2025 ya existen en la tabla `formas_pago`
- Febrero 2025 tiene un codigo nuevo: **PLAN BRILLA / ALIADOS 01** (COD_FORMA_: PB01) - clasificar como **ALIADOS**
- "CREDITO ENTIDADES" (PE01) ya existe clasificado como CONTADO

**Encoding corrupto**: Ambos CSVs tienen "FINANSUEÐOS" en vez de "FINANSUEÑOS" (la ñ esta corrupta como caracter Ð). Sin normalizacion, el lookup no matcheara estos codigos.

**Devoluciones**: Febrero 2025 contiene registros de devolucion (tipo documento DV00, valores negativos en VTAS_ANT_I, CANTIDAD=-1, MOTIVODEV=CM061). El sistema ya maneja negativos algebraicamente segun las reglas de negocio existentes.

**Asesores no registrados**: Los CSVs de 2025 contienen asesores que probablemente ya no estan activos en el sistema. Para los graficos y rankings necesitan existir como referencia pero no como usuarios activos.

**Datos de producto**: Los CSVs incluyen MARCA, CODMARCA, NOMBRE_LIN (linea), CODLINEA, CATEGORIA2, NOMBRE_PRO, REFERENCIA, NOMBRE_COR - estos campos ya se guardan en la tabla `ventas` y estan disponibles para analisis por marca/producto.

---

### Parte 1: Base de Datos

#### 1.1 Agregar columna `cod_forma` a `formas_pago`
Agregar campo informativo para guardar el COD_FORMA_ del CSV como referencia.

```text
ALTER TABLE formas_pago ADD COLUMN cod_forma TEXT;
```

#### 1.2 Insertar codigo nuevo PB01
```text
INSERT INTO formas_pago (codigo, nombre, tipo_venta, cod_forma, activo)
VALUES ('PLAN BRILLA / ALIADOS 01', 'Brilla Aliados 01', 'ALIADOS', 'PB01', true);
```

#### 1.3 Insertar codigo PS01 (para futuros cargues de 2026)
```text
INSERT INTO formas_pago (codigo, nombre, tipo_venta, cod_forma, activo)
VALUES ('PLAN SISTECREDITO / ALIADOS 01', 'Sistecredito Aliados 01', 'ALIADOS', 'PS01', true);
```

#### 1.4 Actualizar cod_forma en registros existentes
Poblar los codigos conocidos como referencia informativa en los registros actuales.

---

### Parte 2: Edge Function `load-sales` - 3 Mejoras

#### 2.1 Normalizacion de caracteres especiales
Funcion que normaliza texto removiendo acentos y caracteres no-ASCII antes de comparar en el lookup, para que "FINANSUEÐOS" matchee con "FINANSUEÑOS".

```text
normalizeForComparison("PLAN FINANSUEÐOS 15 MESES")
  -> "PLAN FINANSUENOS 15 MESES"
normalizeForComparison("PLAN FINANSUEÑOS 15 MESES")  
  -> "PLAN FINANSUENOS 15 MESES"
// Ambos producen la misma clave -> match exitoso
```

#### 2.2 Auto-creacion de codigos desconocidos
Cuando un FORMA1PAGO no se encuentre en el lookup:
1. Se crea automaticamente en `formas_pago` con `tipo_venta = 'OTROS'`
2. Se guarda el COD_FORMA_ como referencia
3. Se reportan los codigos nuevos creados en la respuesta
4. El usuario luego va a Configuracion > Formas de Pago y asigna el tipo correcto

#### 2.3 Guardar cod_forma_pago correctamente
Verificar que COD_FORMA_ del CSV se persista en `ventas.cod_forma_pago`.

---

### Parte 3: UI Configuracion - FormasPagoConfig

#### 3.1 Mostrar columna COD_FORMA_ en la tabla
Agregar columna visible en la tabla de formas de pago mostrando el codigo de referencia.

#### 3.2 Campo editable en dialog crear/editar
Agregar input "COD_FORMA_ (Referencia)" en el formulario de crear y editar forma de pago.

---

### Parte 4: Asesores Inactivos

Los CSVs de 2025 contienen asesores que ya no estan en el sistema. El enfoque sera:

- **No se crean usuarios nuevos**: Los asesores de 2025 no necesitan login ni acceso al sistema
- **Los datos de venta se cargan tal cual**: con `codigo_asesor`, `cedula_asesor`, `asesor_nombre` del CSV
- **Para graficos y rankings**: Las consultas ya funcionan con joins a `ventas` usando `codigo_asesor`, por lo que los asesores sin perfil activo simplemente apareceran en los informes historicos con su nombre del CSV
- **Sin cambios necesarios**: El sistema ya muestra `asesor_nombre` de la tabla `ventas` directamente en rankings y graficos, no requiere que exista un perfil activo

---

### Parte 5: Productos y Analisis

Los campos de producto ya existen en la tabla `ventas`:
- `marca`, `cod_marca` - Marca del producto
- `linea`, `cod_linea` - Linea de producto  
- `categoria` - Categoria
- `producto`, `referencia`, `nombre_corto` - Datos del producto

Estos datos se cargan desde el CSV y quedan almacenados. No se necesitan cambios de esquema. Un futuro analisis por marca/producto puede consultarlos directamente.

---

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| Migracion SQL | Agregar columna `cod_forma`, insertar PB01 y PS01, poblar cod_forma existentes |
| `supabase/functions/load-sales/index.ts` | Normalizacion de caracteres, auto-creacion de codigos, lookup mejorado |
| `src/components/configuracion/FormasPagoConfig.tsx` | Agregar columna y campo COD_FORMA_ |

### Orden de Ejecucion

1. Ejecutar migracion de base de datos
2. Actualizar y desplegar edge function `load-sales`
3. Actualizar UI de FormasPagoConfig
4. Listo para cargar los CSVs via modo historico (Enero 2025, luego Febrero 2025)

