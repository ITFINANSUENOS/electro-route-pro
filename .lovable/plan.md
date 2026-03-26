

## Plan: Proceso de Creación de Asesores Pendientes

### Resumen

Proceso automatizado que detecta asesores en informes de ventas sin perfil en el sistema, los registra como pendientes y permite crearlos desde el tab Usuarios con un wizard por fichas.

### Datos extraidos del CSV (automaticos)
- `codigo_asesor` - del CSV
- `cedula` (cedula_asesor) - del CSV  
- `nombre_completo` (asesor_nombre) - del CSV
- `cod_region` - del CSV (se mapea a regional_id)
- `num_ventas` - conteo calculado

### Datos que se dejan vacios (diligenciar manual)
- `codigo_jefe` - CSV no es confiable
- `tipo_asesor` - INTERNO/EXTERNO/CORRETAJE manual
- `email` - manual
- `password` - manual
- `telefono` - manual

---

## FASE 1: Base de datos y deteccion (backend)

**Objetivo**: Crear tabla `asesores_pendientes` y logica de deteccion post-carga.

### 1.1 Migracion SQL
- Crear tabla `asesores_pendientes` con columnas: id, codigo_asesor (unique), cedula, nombre_completo, cod_region, regional_id, num_ventas, mes_deteccion, anio_deteccion, estado ('pendiente'|'creado'|'descartado'), email, telefono, tipo_asesor, codigo_jefe, password_temp, resuelto_por, resuelto_at, created_at
- RLS: solo admin, coordinador, lider pueden SELECT/INSERT/UPDATE
- Poblar con asesores existentes en ventas sin perfil (>3 ventas, cedula valida)

### 1.2 Hook `usePendingAdvisors.ts`
- Query a `asesores_pendientes` donde estado='pendiente'
- Retorna: `pendingList`, `pendingCount`, `refetch`
- `markAsCreated(codigoAsesor, resolvedBy)` - actualiza estado
- `markAsDiscarded(codigoAsesor, resolvedBy)` - descarta

### 1.3 Deteccion post-carga en `CargarVentasTab.tsx`
- Despues de `processUploadViaEdgeFunction` exitoso:
  - Query ventas del periodo cargado agrupando por codigo_asesor
  - LEFT JOIN contra profiles y asesores_pendientes
  - Los que tengan >3 ventas, no esten en profiles ni en pendientes → INSERT en asesores_pendientes
  - Si se insertaron nuevos, mostrar `NewAdvisorsDetectedDialog`

---

## FASE 2: Dialogs y alertas (UI notificaciones)

**Objetivo**: Notificar al usuario sobre asesores pendientes.

### 2.1 `NewAdvisorsDetectedDialog.tsx`
- Se muestra post-carga cuando hay nuevos asesores detectados
- Mensaje: "Se detectaron X asesores nuevos sin registro en el sistema"
- Lista resumida: nombre, cedula, codigo, ventas del mes
- Botones: "Crear Ahora" (navega a Usuarios) | "Continuar Después"

### 2.2 Badge en `AppSidebar.tsx`
- Badge naranja en item "Usuarios" cuando `pendingCount > 0`
- Usa `usePendingAdvisors` para obtener conteo

### 2.3 Interceptacion en `Usuarios.tsx`
- Badge naranja en boton "+ Nuevo Usuario" si hay pendientes
- Al click con pendientes: dialog "Existen X asesores pendientes. ¿Desea completar la creación?"
  - "Continuar" → abre wizard
  - "Continuar Después" → abre formulario normal de nuevo usuario

---

## FASE 3: Wizard de creacion por fichas

**Objetivo**: Componente carousel para crear asesores pendientes uno a uno.

### 3.1 `PendingAdvisorsWizard.tsx`
- Header: "Asesor 2/4 pendientes" con navegacion izq/der
- Ficha con:
  - **Readonly** (del CSV): nombre, cedula, codigo_asesor, regional (mapeada de cod_region)
  - **Editables** (obligatorios): email, password, tipo_asesor
  - **Editables** (opcionales): telefono, codigo_jefe (select de jefes filtrado por regional)
- Boton "Guardar y Crear" → llama `create-user` edge function, luego actualiza profile con codigo_asesor/regional_id/codigo_jefe, marca como 'creado' en asesores_pendientes
- Boton "Saltar" → pasa al siguiente sin crear
- Boton "Descartar" → marca como descartado (con confirmacion)
- Al crear: el contador se actualiza y se remueve de la lista

### 3.2 Cruce automatico en creacion manual
- En `handleSubmit` de Usuarios.tsx: si la cedula del nuevo usuario coincide con un pendiente, marcarlo como 'creado' automaticamente

---

## FASE 4: Pruebas y ajustes

**Objetivo**: Verificar flujo completo end-to-end.

### 4.1 Pruebas
- Verificar que la poblacion inicial detecta los ~30 asesores existentes
- Cargar un CSV y verificar que detecta nuevos asesores
- Crear un asesor desde el wizard y verificar perfil completo (profile + role + user)
- Verificar que el badge desaparece cuando no hay pendientes
- Verificar cruce automatico al crear manualmente un usuario que coincida
- Verificar que "Descartar" funciona y no reaparece el asesor
- Verificar que al cargar otro CSV del mismo mes no duplica pendientes (UNIQUE en codigo_asesor)

---

### Resumen de fases

| Fase | Alcance | Archivos |
|------|---------|----------|
| **1** | BD + hook + deteccion | Migracion SQL, `usePendingAdvisors.ts`, `CargarVentasTab.tsx` |
| **2** | Dialogs + badges | `NewAdvisorsDetectedDialog.tsx`, `AppSidebar.tsx`, `Usuarios.tsx` |
| **3** | Wizard carousel | `PendingAdvisorsWizard.tsx`, `Usuarios.tsx`, `create-user` (sin cambios) |
| **4** | Testing E2E | Verificacion de todo el flujo |

**Total: 4 fases**

### Archivos a crear
- `src/hooks/usePendingAdvisors.ts`
- `src/components/usuarios/NewAdvisorsDetectedDialog.tsx`
- `src/components/usuarios/PendingAdvisorsWizard.tsx`

### Archivos a modificar
- `src/components/informacion/CargarVentasTab.tsx` - deteccion post-carga
- `src/pages/Usuarios.tsx` - badge, interceptacion, cruce automatico
- `src/components/layout/AppSidebar.tsx` - badge naranja

