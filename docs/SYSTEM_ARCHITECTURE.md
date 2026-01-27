# Sistema E-COM - Arquitectura del Sistema

## 📋 Índice
1. [Visión General](#visión-general)
2. [Arquitectura Técnica](#arquitectura-técnica)
3. [Estructura de Módulos](#estructura-de-módulos)
4. [Roles y Permisos](#roles-y-permisos)
5. [Base de Datos](#base-de-datos)
6. [APIs y Edge Functions](#apis-y-edge-functions)
7. [Guía de Despliegue](#guía-de-despliegue)

---

## 📌 Visión General

**Sistema E-COM** (Organización Comercial para Electrocréditos del Cauca) es una plataforma web diseñada para digitalizar el flujo de trabajo del equipo comercial, incluyendo:

- Gestión jerárquica de equipos de ventas
- Programación y seguimiento de actividades
- Reportes de cumplimiento con evidencia geolocalizada
- Dashboards analíticos por rol
- Carga y procesamiento de datos de ventas

### Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **UI Components** | shadcn/ui, Radix UI, Framer Motion |
| **State Management** | TanStack Query (React Query) |
| **Backend** | Lovable Cloud (Supabase/PostgreSQL) |
| **Edge Functions** | Deno Runtime |
| **Maps** | Google Maps API |
| **Charts** | Recharts |

---

## 🏗️ Arquitectura Técnica

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vite)                     │
├─────────────────────────────────────────────────────────────┤
│  Pages          │  Components      │  Hooks                  │
│  ├─ Dashboard   │  ├─ ui/          │  ├─ useAuth            │
│  ├─ Programacion│  ├─ dashboard/   │  ├─ useSalesCount      │
│  ├─ Actividades │  ├─ programacion/│  ├─ useActivityCompliance│
│  ├─ Informacion │  ├─ actividades/ │  └─ useSchedulingConfig │
│  ├─ Usuarios    │  └─ configuracion│                        │
│  └─ Configuracion                                            │
├─────────────────────────────────────────────────────────────┤
│                    AUTH CONTEXT                              │
│  AuthProvider → Session, Profile, Role, Permissions         │
├─────────────────────────────────────────────────────────────┤
│                    SUPABASE CLIENT                           │
│  @supabase/supabase-js → RLS → PostgreSQL                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Lovable Cloud)                     │
├─────────────────────────────────────────────────────────────┤
│  Edge Functions          │  Database Functions              │
│  ├─ load-sales           │  ├─ has_role()                   │
│  ├─ sync-passwords       │  ├─ advisor_can_view_sale()      │
│  ├─ create-user          │  ├─ get_advisor_regional_position()│
│  └─ import-team          │  └─ count_regional_advisors()    │
├─────────────────────────────────────────────────────────────┤
│  Row Level Security (RLS)                                    │
│  └─ Políticas por tabla según rol de usuario                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Estructura de Módulos

### `/src/pages/` - Páginas Principales

| Página | Descripción | Roles Permitidos |
|--------|-------------|------------------|
| `Dashboard.tsx` | Panel principal con KPIs y rankings | Todos |
| `Programacion.tsx` | Calendario y gestión de actividades | Todos (CRUD solo líderes+) |
| `Actividades.tsx` | Registro de evidencia diaria | Asesores |
| `Informacion.tsx` | Carga de ventas y metas | Líderes+ |
| `Usuarios.tsx` | Gestión de usuarios | Administrador |
| `Configuracion.tsx` | Parámetros del sistema | Administrador |
| `Mapa.tsx` | Visualización geográfica | Jefes+ |

### `/src/components/` - Componentes

```
components/
├── ui/                    # Componentes base (shadcn/ui)
├── layout/                # AppLayout, AppSidebar
├── dashboard/             # DashboardLider, DashboardAsesor, DashboardJefe
├── programacion/          # ActivityDetailDialog, GroupedActivityCard
├── actividades/           # EvidenceSection, ConsultasSection
├── informacion/           # CargarVentasTab, MetasTab
├── configuracion/         # FormasPagoConfig, PermisosConfig
└── usuarios/              # UserEditDialog
```

### `/src/hooks/` - Custom Hooks

| Hook | Propósito |
|------|-----------|
| `useAuth` | Contexto de autenticación y permisos |
| `useSalesCount` | Conteo de ventas únicas con agrupación |
| `useSalesCountByAdvisor` | Métricas por asesor |
| `useActivityCompliance` | Tracking de cumplimiento de evidencia |
| `useTodayActivity` | Actividad programada del día actual |
| `useSchedulingConfig` | Configuración de programación |

---

## 👥 Roles y Permisos

### Jerarquía de Roles

```
ADMINISTRADOR
    └── COORDINADOR_COMERCIAL (Norte/Sur)
            └── LIDER_ZONA
                    └── JEFE_VENTAS
                            └── ASESOR_COMERCIAL
```

### Matriz de Permisos

| Funcionalidad | Asesor | Jefe | Líder | Coordinador | Admin |
|--------------|--------|------|-------|-------------|-------|
| Ver dashboard propio | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver dashboard equipo | ❌ | ✅ | ✅ | ✅ | ✅ |
| Ver dashboard regional | ❌ | ❌ | ✅ | ✅ | ✅ |
| Registrar evidencia | ✅ | ✅* | ✅* | ❌ | ❌ |
| Ver programación | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear programación | ❌ | ❌ | ✅ | ✅ | ✅ |
| Cargar ventas | ❌ | ❌ | ✅ | ✅ | ✅ |
| Gestionar usuarios | ❌ | ❌ | ❌ | ❌ | ✅ |
| Configurar sistema | ❌ | ❌ | ❌ | ❌ | ✅ |

*Solo si tienen actividad asignada

---

## 🗄️ Base de Datos

### Tablas Principales

#### `profiles` - Perfiles de Usuario
```sql
- user_id: UUID (FK auth.users)
- cedula: TEXT (único)
- nombre_completo: TEXT
- codigo_asesor: TEXT (5 dígitos LPAD)
- codigo_jefe: TEXT (referencia a jefes_ventas)
- regional_id: UUID (FK regionales)
- tipo_asesor: TEXT ('INTERNO', 'EXTERNO', 'CORRETAJE')
- activo: BOOLEAN
```

#### `ventas` - Registros de Ventas
```sql
- fecha: DATE
- codigo_asesor: TEXT
- tipo_venta: TEXT ('CONTADO', 'CREDICONTADO', 'CREDITO', 'CONVENIO', 'OTROS')
- vtas_ant_i: NUMERIC (valor neto, puede ser negativo para devoluciones)
- cod_region: INTEGER
```

#### `programacion` - Actividades Programadas
```sql
- user_id: UUID
- fecha: DATE
- tipo_actividad: ENUM ('punto', 'correria', 'libre')
- municipio: TEXT
- nombre: TEXT
- hora_inicio/hora_fin: TIME
- latitud/longitud: NUMERIC
```

#### `reportes_diarios` - Evidencia de Cumplimiento
```sql
- user_id: UUID
- fecha: DATE
- foto_url: TEXT
- gps_latitud/gps_longitud: NUMERIC
- consultas/solicitudes: INTEGER
- evidencia_completa: BOOLEAN
```

### Funciones de Seguridad (SECURITY DEFINER)

```sql
-- Verificar rol de usuario
has_role(user_id, role) → BOOLEAN

-- Verificar acceso a ventas
advisor_can_view_sale(codigo, cedula, nombre) → BOOLEAN

-- Ranking regional
get_advisor_regional_position(codigo, regional_id, start, end) → INTEGER
count_regional_advisors(regional_id) → INTEGER
get_top_regional_sales(regional_id, start, end) → NUMERIC
```

---

## ⚡ APIs y Edge Functions

### `load-sales`
**Propósito:** Procesar CSV de ventas  
**Método:** POST  
**Headers:** Authorization (Bearer token)  
**Body:** FormData con archivo CSV

```typescript
// Lógica principal:
1. Validar rol del usuario (lider_zona+)
2. Parsear CSV (delimitador ';')
3. Mapear columnas al esquema
4. Clasificar tipo_venta según formas_pago
5. Eliminar registros del mes existente
6. Insertar nuevos registros
7. Actualizar estado en carga_archivos
```

### `sync-passwords`
**Propósito:** Sincronización masiva de contraseñas  
**Método:** POST  
**Uso:** Administrador desde /usuarios

### `create-user`
**Propósito:** Crear nuevo usuario con perfil y rol  
**Método:** POST

---

## 🚀 Guía de Despliegue

### Requisitos Previos

1. Proyecto Lovable Cloud configurado
2. Variables de entorno establecidas:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

### Pasos de Despliegue

1. **Verificar migraciones pendientes**
   - Revisar `/supabase/migrations/`
   - Aplicar en orden cronológico

2. **Verificar Edge Functions**
   - `supabase/functions/load-sales/`
   - `supabase/functions/sync-passwords/`
   - `supabase/functions/create-user/`

3. **Build de producción**
   ```bash
   npm run build
   ```

4. **Publicar en Lovable**
   - Click en "Publish" → "Update"

### Variables de Configuración

| Tabla | Campo | Descripción |
|-------|-------|-------------|
| `permisos_roles` | * | Matriz de permisos por rol |
| `config_metas_promedio` | valor_promedio | Ticket promedio por regional/tipo |
| `config_metas_porcentajes` | porcentaje_* | Incrementos de meta |

---

## 📊 Métricas y Monitoreo

### KPIs del Dashboard

1. **Ventas del Mes** - Suma neta de vtas_ant_i
2. **Q Ventas** - Conteo único por cliente/fecha/tipo
3. **Cumplimiento** - (Ejecutado / Meta) × 100
4. **Incumplimientos** - Actividades sin evidencia completa

### Logs y Debugging

- Console logs en desarrollo
- Supabase Analytics para queries lentas
- Edge Function logs en Cloud View

---

## 🔐 Seguridad

### Row Level Security (RLS)

Todas las tablas tienen RLS habilitado con políticas específicas:

- `profiles` - Solo admins ven todos, usuarios ven su perfil
- `ventas` - Líderes+ ven todo, asesores solo sus ventas
- `programacion` - Visibilidad jerárquica + compañeros de actividad
- `reportes_diarios` - CRUD propio, SELECT para líderes+

### Mejores Prácticas

1. Nunca almacenar contraseñas en código
2. Usar funciones SECURITY DEFINER para lógica sensible
3. Validar inputs en Edge Functions
4. Sanitizar datos CSV antes de inserción

---

## 📞 Soporte y Contacto

Para soporte técnico o modificaciones:
1. Revisar esta documentación
2. Consultar memoria del proyecto en Lovable
3. Contactar al equipo de desarrollo
