# Referencia de APIs - Sistema E-COM

## 🔌 Edge Functions

Base URL: `https://flafgqrxmrtfibydeuog.supabase.co/functions/v1/`

### Autenticación

Todas las Edge Functions requieren:
```
Authorization: Bearer <jwt_token>
```

---

## `load-sales`

Procesa y carga archivos CSV de ventas.

### Request

```http
POST /functions/v1/load-sales
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Form Data:**
- `file`: Archivo CSV

### Response

```json
{
  "success": true,
  "records_processed": 2205,
  "carga_id": "uuid"
}
```

### Errores

| Código | Descripción |
|--------|-------------|
| 401 | No autorizado |
| 403 | Rol insuficiente (requiere lider_zona+) |
| 400 | Archivo inválido o vacío |
| 500 | Error de procesamiento |

---

## `sync-passwords`

Sincroniza contraseñas de usuarios desde CSV.

### Request

```http
POST /functions/v1/sync-passwords
Content-Type: application/json
Authorization: Bearer <token>
```

**Body:**
```json
{
  "users": [
    {
      "cedula": "12345678",
      "email": "user@domain.com",
      "password": "newpassword",
      "name": "Usuario Ejemplo",
      "role": "asesor_comercial"
    }
  ]
}
```

### Response

```json
{
  "success": true,
  "updated": 150,
  "errors": []
}
```

---

## `create-user`

Crea un nuevo usuario con perfil y rol.

### Request

```http
POST /functions/v1/create-user
Content-Type: application/json
Authorization: Bearer <token>
```

**Body:**
```json
{
  "email": "nuevo@domain.com",
  "password": "securepassword",
  "profile": {
    "cedula": "12345678",
    "nombre_completo": "Nuevo Usuario",
    "codigo_asesor": "99999",
    "codigo_jefe": "69334",
    "regional_id": "uuid",
    "tipo_asesor": "EXTERNO"
  },
  "role": "asesor_comercial"
}
```

---

## 📊 Database Functions (RPC)

Funciones SQL llamables via Supabase Client.

### `has_role`

Verifica si un usuario tiene un rol específico.

```typescript
const { data, error } = await supabase
  .rpc('has_role', { 
    _user_id: userId, 
    _role: 'lider_zona' 
  });
// Returns: boolean
```

### `get_advisor_regional_position`

Obtiene la posición de un asesor en el ranking regional.

```typescript
const { data, error } = await supabase
  .rpc('get_advisor_regional_position', {
    p_codigo_asesor: '12345',
    p_regional_id: regionalUuid,
    p_start_date: '2026-01-01',
    p_end_date: '2026-01-31'
  });
// Returns: integer (1-based position)
```

### `count_regional_advisors`

Cuenta el número de asesores activos en una regional.

```typescript
const { data, error } = await supabase
  .rpc('count_regional_advisors', {
    p_regional_id: regionalUuid
  });
// Returns: integer
```

### `get_top_regional_sales`

Obtiene el valor de ventas más alto en la regional.

```typescript
const { data, error } = await supabase
  .rpc('get_top_regional_sales', {
    p_regional_id: regionalUuid,
    p_start_date: '2026-01-01',
    p_end_date: '2026-01-31'
  });
// Returns: numeric
```

### `count_group_advisors`

Cuenta asesores en un grupo (por código de jefe).

```typescript
const { data, error } = await supabase
  .rpc('count_group_advisors', {
    p_codigo_jefe: '69334'
  });
// Returns: integer
```

### `get_advisor_group_position`

Posición del asesor dentro de su grupo de ventas.

```typescript
const { data, error } = await supabase
  .rpc('get_advisor_group_position', {
    p_codigo_asesor: '12345',
    p_codigo_jefe: '69334',
    p_start_date: '2026-01-01',
    p_end_date: '2026-01-31'
  });
// Returns: integer
```

---

## 📦 Supabase Client Usage

### Inicialización

```typescript
import { supabase } from '@/integrations/supabase/client';
```

### Consultas Comunes

#### Obtener ventas del mes

```typescript
const { data, error } = await supabase
  .from('ventas')
  .select('*')
  .gte('fecha', '2026-01-01')
  .lte('fecha', '2026-01-31');
```

#### Obtener programación de un usuario

```typescript
const { data, error } = await supabase
  .from('programacion')
  .select('*')
  .eq('user_id', userId)
  .gte('fecha', startDate)
  .lte('fecha', endDate);
```

#### Insertar reporte diario

```typescript
const { data, error } = await supabase
  .from('reportes_diarios')
  .upsert({
    user_id: userId,
    fecha: today,
    foto_url: photoUrl,
    gps_latitud: lat,
    gps_longitud: lng,
    consultas: 5,
    solicitudes: 2
  }, {
    onConflict: 'user_id,fecha'
  });
```

---

## 🔒 Row Level Security

### Políticas de `ventas`

| Policy | Operation | Condition |
|--------|-----------|-----------|
| Asesores can view own | SELECT | `advisor_can_view_sale(...)` |
| Leaders can view all | SELECT | `has_role('jefe_ventas'+)` |
| Leaders can insert | INSERT | `has_role('lider_zona'+)` |
| Leaders can delete | DELETE | `has_role('lider_zona'+)` |

### Políticas de `programacion`

| Policy | Operation | Condition |
|--------|-----------|-----------|
| Users view own | SELECT | `auth.uid() = user_id` |
| Users view colleagues | SELECT | `is_colleague_in_activity(...)` |
| Leaders manage | ALL | `has_role('lider_zona'+)` |

---

## 📈 Paginación

Supabase tiene un límite default de 1000 registros. Para datasets grandes:

```typescript
const pageSize = 1000;
let page = 0;
let allData = [];
let hasMore = true;

while (hasMore) {
  const { data, error } = await supabase
    .from('ventas')
    .select('*')
    .range(page * pageSize, (page + 1) * pageSize - 1);
  
  if (data?.length > 0) {
    allData.push(...data);
    hasMore = data.length === pageSize;
    page++;
  } else {
    hasMore = false;
  }
}
```

---

## 🔄 Realtime (Opcional)

Para suscripciones en tiempo real:

```typescript
const channel = supabase
  .channel('reportes-changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'reportes_diarios'
    },
    (payload) => {
      console.log('Nuevo reporte:', payload.new);
    }
  )
  .subscribe();

// Cleanup
channel.unsubscribe();
```
