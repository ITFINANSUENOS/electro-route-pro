
# Plan: Evidencia Grupal, Horarios de Fotos, y Planillas Interactivas

## Resumen

Este plan implementa tres grandes bloques:
1. **Evidencia fotografica grupal** con ventanas de tiempo especificas por tipo de actividad
2. **Horario ampliado de consultas** (12pm-10pm) con parametros dinamicos
3. **Nuevo tab "Ver Planillas"** con calendario interactivo, sub-vistas de listado/actividad, columnas expandibles y exportacion Excel

---

## Bloque 1: Evidencia Fotografica Grupal con Ventanas de Tiempo

### Reglas de fotos por tipo de actividad

**Correria - 3 fotos grupales (1 por grupo):**
- **Inicio**: ventana de 5:00 AM a 9:00 AM
- **Instalacion (intermedio)**: ventana de 5:00 AM a 7:00 PM (sin restriccion estricta dentro del dia)
- **Cierre**: ventana de 4:00 PM a 7:00 PM
- Si pasa la ventana, queda sin reportar (no se puede subir)
- Mensaje: "Asegurate de que todos los integrantes sean visibles en la foto"

**Punto Fijo - 2 fotos grupales (1 por grupo):**
- **Apertura**: margen de 30 minutos antes y 30 minutos despues de la hora de inicio programada (ej: si abre a las 8, puede subir de 7:30 a 8:30)
- **Cierre**: margen de 30 minutos antes y 30 minutos despues de la hora de fin programada
- Foto desde adentro del almacen, por seguridad

**Ubicacion GPS - igual para todos:**
- Solo durante el horario programado de la actividad

### Parametros configurables (Configuracion > Programacion)

Todos estos valores se guardan en `permisos_roles` (categoria: `programacion_config`) y son editables por el administrador:

| Parametro | Default | Descripcion |
|-----------|---------|-------------|
| `fotos_grupales_correria_cantidad` | 3 | Fotos obligatorias en correria |
| `etiquetas_fotos_correria` | JSON con 3 etiquetas | Nombres de cada foto |
| `foto_correria_inicio_desde` | 05:00 | Hora inicio ventana foto inicio |
| `foto_correria_inicio_hasta` | 09:00 | Hora fin ventana foto inicio |
| `foto_correria_intermedio_desde` | 05:00 | Hora inicio ventana instalacion |
| `foto_correria_intermedio_hasta` | 19:00 | Hora fin ventana instalacion |
| `foto_correria_cierre_desde` | 16:00 | Hora inicio ventana foto cierre |
| `foto_correria_cierre_hasta` | 19:00 | Hora fin ventana foto cierre |
| `foto_punto_margen_minutos` | 30 | Margen en minutos para fotos punto fijo |
| `fotos_apertura_cierre_punto` | true | Requiere fotos en punto fijo |
| `consultas_hora_inicio` | 12:00 | Hora inicio consultas |
| `consultas_hora_fin` | 22:00 | Hora fin consultas |

---

## Bloque 2: Base de Datos

### Nueva tabla `evidencia_grupal`

```text
id                uuid PK default gen_random_uuid()
fecha             date NOT NULL
tipo_actividad    text NOT NULL  -- 'correria' | 'punto'
municipio         text NOT NULL
nombre_actividad  text
hora_inicio       time  -- del horario programado
hora_fin          time  -- del horario programado
tipo_foto         text NOT NULL
                  -- correria: 'inicio_correria', 'instalacion_correria', 'cierre_correria'
                  -- punto: 'apertura_punto', 'cierre_punto'
foto_url          text NOT NULL
subido_por        uuid NOT NULL references auth.users(id)
gps_latitud       numeric
gps_longitud      numeric
notas             text
created_at        timestamptz default now()
```

**RLS:**
- SELECT: integrantes del mismo grupo (via `is_colleague_in_activity`) + jefe_ventas, lider_zona, coordinador, admin
- INSERT: integrantes del mismo grupo + lideres+
- Sin UPDATE ni DELETE (fotos inmutables)

### Nuevo bucket de Storage: `evidencia-fotos`

Para almacenar archivos reales en vez de base64.

### Nuevos registros en `permisos_roles`

Se insertan los parametros listados arriba con sus valores por defecto.

---

## Bloque 3: Horario de Consultas Ampliado

- Cambiar hardcoded 16:00-21:00 a valores dinamicos leidos desde configuracion
- Default: 12:00 a 22:00
- Afecta: `useActivityTimeRestrictions.ts`, `useActivityNotification.ts`, `ConsultasSection.tsx`

---

## Bloque 4: Tab "Ver Planillas" con Calendario Interactivo

### Estructura del tab

Dentro de Actividades, para roles con permiso (jefe_ventas, lider_zona, coordinador, admin), se agrega un tercer tab: **"Ver Planillas"**.

Dentro de "Ver Planillas", hay un selector de sub-vista:
- **Ver Listado**: planilla de asistencia GPS (calendario semanal, chulito/rojo)
- **Ver Actividad**: planilla de fotos por tipo de actividad

### Sub-vista: Ver Listado (Asistencia GPS)

**Estructura visual:**
- Filas = asesores
- Columnas = dias del mes (1 al 28/29/30/31), agrupados dom-sab
- Selector de mes/anio para navegar
- Filtros jerarquicos: regional (coordinador/admin), jefe (lider+), todos segun rol

**Colores por celda:**
- Azul sombreado + chulito negro: programado Y registro GPS ese dia
- Rojo sombreado: programado Y NO registro GPS
- Rojo con borde: no estaba programado en nada
- Sin sombreado: dia futuro o no aplica

**Exportacion Excel:**
- Boton "Descargar Reporte"
- Filas: asesores (nombre, codigo)
- Columnas: dias
- Valores: `1` (actividad + GPS), `0` (actividad + sin GPS), vacio (sin programacion)

### Sub-vista: Ver Actividad (Fotos Grupales)

**Estructura visual:**
- Selector de tipo: Correria o Punto Fijo
- Cuando se elige Correria, subfiltros: Inicio, Instalacion, Cierre (o ver las 3)
- Cuando se elige Punto Fijo: Apertura, Cierre

**Calendario interactivo:**
- Filas = asesores/grupos
- Columnas = dias del mes
- Cada columna es delgada, mostrando solo color:
  - Verde/azul: todas las fotos requeridas estan completas
  - Rojo sombreado: le faltan fotos (ej: 2 de 3 en correria, 1 de 2 en punto fijo)
  - Sin color: no tenia actividad ese dia

**Columnas expandibles (interaccion clave):**
- Al hacer clic en una columna (dia), se expande y muestra las horas de cada foto:
  - Hora de inicio, hora de instalacion, hora de cierre (para correria)
  - Hora de apertura, hora de cierre (para punto fijo)
  - Si no tiene la foto, muestra "00:00" o "--:--"
- Se puede hacer clic de nuevo para cerrar la columna
- Se pueden tener multiples columnas abiertas simultaneamente

**Exportacion Excel:**
- Similar al listado: filas = asesores, columnas = dias
- Valores: hora de cada foto o "00:00" si no la tiene
- Separado por tipo de foto en pestanas del Excel

---

## Detalle Tecnico: Componentes y Hooks

### Nuevos archivos

1. **`src/hooks/useGroupEvidence.ts`** - Hook para consultar y subir fotos grupales. Identifica el grupo por (fecha + tipo_actividad + municipio + nombre + hora_inicio + hora_fin). Usa Storage para subir archivos al bucket `evidencia-fotos`.

2. **`src/hooks/useConsultasConfig.ts`** - Hook para leer `consultas_hora_inicio` y `consultas_hora_fin` desde `permisos_roles`. Retorna los valores para uso dinamico.

3. **`src/hooks/usePhotoTimeWindows.ts`** - Hook que lee los parametros de ventanas de tiempo para fotos desde configuracion y calcula si la ventana actual esta abierta para cada tipo de foto.

4. **`src/components/actividades/GroupEvidenceSection.tsx`** - Componente con cards para cada foto grupal. Muestra estado completado/pendiente. Indica la ventana de tiempo disponible. Mensaje de "todos visibles en la foto".

5. **`src/components/actividades/PlanillasViewer.tsx`** - Componente principal del tab "Ver Planillas". Contiene el selector de sub-vista (Listado / Actividad) y filtros jerarquicos.

6. **`src/components/actividades/AttendanceGrid.tsx`** - Cuadricula de asistencia GPS. Filas de asesores, columnas de dias con colores.

7. **`src/components/actividades/ActivityPhotosGrid.tsx`** - Cuadricula de fotos por actividad con columnas expandibles. Implementa la interaccion de clic para abrir/cerrar columnas y ver horas.

8. **`src/utils/exportPlanillaExcel.ts`** - Genera archivo Excel para el listado de asistencia GPS.

9. **`src/utils/exportFotosExcel.ts`** - Genera archivo Excel para el reporte de fotos por actividad.

### Archivos modificados

1. **`src/hooks/useActivityTimeRestrictions.ts`** - Recibir parametros dinamicos de horario de consultas. Separar logica de fotos (ventanas propias) vs GPS (horario programado).

2. **`src/hooks/useActivityNotification.ts`** - Cambiar ventana de notificacion de 16-21 a valores dinamicos.

3. **`src/hooks/useTodayActivity.ts`** - Agregar query para `evidencia_grupal` del grupo de hoy. Agregar mutacion para subir foto grupal.

4. **`src/components/actividades/EvidenceSection.tsx`** - Integrar `GroupEvidenceSection`. La foto individual ya no es obligatoria para todos; la evidencia grupal la reemplaza. GPS sigue restringido al horario.

5. **`src/components/actividades/ConsultasSection.tsx`** - Actualizar mensajes para reflejar el horario dinamico en vez de hardcoded "9:00 PM".

6. **`src/pages/Actividades.tsx`** - Agregar tercer tab "Ver Planillas". Mostrar progreso de fotos grupales (ej: 2/3 completadas).

7. **`src/components/configuracion/ProgramacionConfig.tsx`** - Agregar seccion "Fotos Grupales" con los nuevos parametros: ventanas de tiempo para correria, margen para punto fijo, cantidad de fotos, etiquetas, horario de consultas.

8. **`src/components/actividades/ActividadesViewer.tsx`** - Mostrar fotos grupales en el detalle de actividad cuando se abre una.

---

## Orden de Implementacion

1. Migracion de BD: tabla `evidencia_grupal` con RLS + bucket `evidencia-fotos` + parametros en `permisos_roles`
2. Hooks: `useGroupEvidence`, `useConsultasConfig`, `usePhotoTimeWindows`
3. Actualizar `useActivityTimeRestrictions` y `useActivityNotification` con parametros dinamicos
4. Componente `GroupEvidenceSection` con logica de ventanas de tiempo por tipo
5. Actualizar `EvidenceSection`, `ConsultasSection`, `Actividades.tsx`
6. Ampliar `ProgramacionConfig.tsx` con todos los nuevos parametros
7. Crear `PlanillasViewer`, `AttendanceGrid`, `ActivityPhotosGrid`
8. Crear utilidades de exportacion Excel: `exportPlanillaExcel`, `exportFotosExcel`
9. Integrar tab "Ver Planillas" en `Actividades.tsx`
10. Actualizar `ActividadesViewer` para mostrar fotos grupales en detalle
