

# Plan: Carga Historica de Ventas y Reasignacion de Regionales

## Resumen

Dos funcionalidades nuevas:

1. **Carga de ventas historicas**: Permitir a administradores y coordinadores comerciales seleccionar manualmente el mes/anio destino (incluyendo meses del 2025) al subir archivos CSV de ventas.
2. **Reasignacion de regionales**: Desde la configuracion de regionales, poder desactivar una regional y reasignar sus datos historicos de ventas a otra regional activa.

---

## Parte 1: Carga de Ventas Historicas

### Cambios en la interfaz (CargarVentasTab.tsx)

- Agregar un selector de "Periodo destino" con dos dropdowns: **Mes** (Enero-Diciembre) y **Anio** (2025, 2026).
- Solo visible para roles `administrador` y `coordinador_comercial`.
- Por defecto, sigue usando el periodo automatico actual (logica existente de `useSalesPeriod`).
- Si el usuario selecciona un periodo manual, se pasa ese mes/anio al edge function `load-sales` en lugar del automatico.
- Se elimina la restriccion de "periodo cerrado" cuando se usa modo historico (los meses del 2025 pueden no tener periodo creado, se crea automaticamente).
- Se muestra una alerta amarilla indicando: "Modo historico: cargando datos para [Mes] [Anio]".

### Cambios en el edge function (load-sales)

- Ya soporta `targetMonth` y `targetYear` como parametros opcionales. No requiere cambios en el backend.

### Logica de validacion

- Se mantiene la validacion del 50% de fechas dentro del rango.
- El anio seleccionable sera 2025 y 2026 (configurable).

---

## Parte 2: Reasignacion de Regionales

### Nuevo concepto: "Migrar Regional"

Cuando una regional como PUERTO TEJADA (codigo 106) se absorbe en otra (ej: SANTANDER, codigo 103):

1. El admin abre la regional PUERTO TEJADA en configuracion.
2. Ve un boton "Migrar a otra regional".
3. Selecciona la regional destino (SANTANDER).
4. El sistema actualiza en la tabla `ventas` todos los registros donde `cod_region = 106`, cambiando a `cod_region = 103`.
5. Tambien actualiza los `profiles` que tenian `regional_id` de PUERTO TEJADA, asignandolos a SANTANDER.
6. Desactiva la regional PUERTO TEJADA (`activo = false`).
7. Todo queda registrado en `historial_ediciones`.

### Cambios en la interfaz (RegionalesConfig.tsx)

- Agregar un boton "Migrar" (icono ArrowRightLeft) en cada fila de la tabla de regionales activas.
- Al hacer clic, abre un dialog con:
  - Nombre de la regional origen (ej: PUERTO TEJADA - 106)
  - Dropdown para seleccionar regional destino (solo regionales activas, excluyendo la actual)
  - Checkbox: "Desactivar regional origen despues de migrar"
  - Resumen de impacto: cuantos registros de ventas y perfiles seran afectados (consulta previa)
  - Boton "Confirmar Migracion" con confirmacion adicional

### Nueva edge function: migrate-regional

Se necesita una edge function con `service_role` para:
1. Contar registros afectados (ventas con `cod_region` origen, profiles con `regional_id` origen)
2. Actualizar masivamente `ventas.cod_region` del codigo origen al destino
3. Actualizar `profiles.regional_id` del origen al destino
4. Opcionalmente desactivar la regional origen
5. Registrar en `historial_ediciones`

Esto requiere service role porque las politicas RLS de ventas no permiten UPDATE a ningun rol.

### Parametros del dialog de migracion

- Regional origen (automatico, la seleccionada)
- Regional destino (selector)
- Filtro opcional de periodo: "Solo migrar ventas de [Mes/Anio]" o "Todas las ventas"
  - Esto permite migrar solo los datos de un mes especifico sin afectar otros periodos

---

## Detalle Tecnico

### Archivos modificados

1. **`src/components/informacion/CargarVentasTab.tsx`**
   - Agregar estado `historicMode` con `selectedMonth` y `selectedYear`
   - Agregar selectores de mes/anio cuando el rol es admin/coordinador
   - Pasar el periodo seleccionado manualmente al `processUploadViaEdgeFunction`
   - Saltar validacion de periodo cerrado en modo historico

2. **`src/components/configuracion/RegionalesConfig.tsx`**
   - Agregar boton "Migrar" por fila
   - Agregar dialog de migracion con selector de destino
   - Consulta previa de impacto (conteo de ventas y profiles)
   - Llamada a edge function `migrate-regional`
   - Registro en historial

### Archivos nuevos

3. **`supabase/functions/migrate-regional/index.ts`**
   - Edge function con service_role
   - Recibe: `sourceRegionalId`, `targetRegionalId`, `sourceCodRegion`, `targetCodRegion`, `deactivateSource`, `filterMonth`, `filterYear`
   - Ejecuta updates masivos en ventas y profiles
   - Retorna conteo de registros migrados
   - Solo accesible por admin/coordinador_comercial

### Configuracion necesaria

4. **`supabase/config.toml`** - Agregar entrada para `migrate-regional` con `verify_jwt = false`

### Base de datos

- No se requieren cambios de esquema. Se usan las columnas existentes:
  - `ventas.cod_region` (integer)
  - `profiles.regional_id` (uuid)
  - `regionales.activo` (boolean)

### Orden de implementacion

1. Modificar `CargarVentasTab.tsx` para modo historico
2. Crear edge function `migrate-regional`
3. Modificar `RegionalesConfig.tsx` para agregar migracion

