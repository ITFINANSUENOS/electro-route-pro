

## Plan: Excel de pendientes + mejor análisis regional + email opcional

### Problema actual
1. No hay forma de descargar Excel de asesores pendientes
2. La detección solo captura `cod_region` del CSV, pero hay asesores con `cod_region = NULL` cuando el CSV tiene datos en columnas `sede`, `regional` (nombre), `zona`
3. Email y contraseña son obligatorios en `create-user` edge function y en el wizard, pero no siempre se tienen estos datos

### Cambios por fases

---

### FASE 1: Mejor análisis de datos del CSV en detección

**Archivo: `src/components/informacion/CargarVentasTab.tsx`**
- En `detectNewAdvisors`, ampliar el select para traer también `sede`, `regional`, `zona`, `codigo_jefe`, `jefe_ventas`
- Al agrupar por `codigo_asesor`, guardar el valor más frecuente (moda) de `sede`, `regional`, `zona`
- Si `cod_region` es null pero `regional` (nombre texto) existe, buscar en tabla `regionales` por nombre para mapear
- Guardar `sede` en el insert a `asesores_pendientes`

**Migración SQL**: Agregar columna `sede` a tabla `asesores_pendientes`

**Archivo: `src/hooks/usePendingAdvisors.ts`**: Agregar `sede` al tipo `PendingAdvisor`

---

### FASE 2: Botón de descarga Excel en el wizard

**Archivo: `src/components/usuarios/PendingAdvisorsWizard.tsx`**
- Agregar botón de descarga Excel al lado del badge "X / Y" en el header del wizard
- El Excel incluirá columnas: Código Asesor, Cédula, Nombre, Regional, Sede, Cod Región, Ventas Detectadas, Estado
- Usar ExcelJS (ya importado en el proyecto) para generar el archivo
- Formato con headers estilizados, colores de marca

---

### FASE 3: Email y teléfono opcionales en toda la lógica

**Archivo: `supabase/functions/create-user/index.ts`**
- Hacer `email` opcional: si no se proporciona, generar un email placeholder usando la cédula (ej. `cedula@placeholder.internal`)
- Esto permite crear el auth user sin email real
- Mantener validación de email solo si se proporciona uno real

**Archivo: `src/components/usuarios/PendingAdvisorsWizard.tsx`**
- Quitar `*` de Email, hacerlo opcional
- Actualizar `canSave`: solo requerir `password` y `tipo_asesor`
- Si no hay email, enviar cedula como identificador al edge function

**Archivo: `src/pages/Usuarios.tsx`**
- En el formulario de creación manual: quitar `required` de email
- Actualizar `handleSubmit` para permitir email vacío

---

### FASE 4: Mostrar sede/regional en ficha del wizard

**Archivo: `src/components/usuarios/PendingAdvisorsWizard.tsx`**
- En la sección readonly, mostrar también la columna `sede` del CSV
- Si `regional_id` es null pero hay `sede` o `cod_region`, mostrar los datos disponibles para que el admin pueda identificar manualmente

---

### Resumen de archivos

| Archivo | Cambio |
|---------|--------|
| Migración SQL | Agregar columna `sede` a `asesores_pendientes` |
| `src/components/informacion/CargarVentasTab.tsx` | Capturar `sede`, `regional`, `zona` en detección |
| `src/hooks/usePendingAdvisors.ts` | Agregar `sede` al tipo |
| `src/components/usuarios/PendingAdvisorsWizard.tsx` | Botón Excel, email opcional, mostrar sede |
| `supabase/functions/create-user/index.ts` | Email opcional con placeholder |
| `src/pages/Usuarios.tsx` | Email opcional en formulario manual |

**Total: 4 fases**

