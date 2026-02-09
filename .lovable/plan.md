
# Plan de Migración - Arquitectura Hexagonal (Service Layer)

## ✅ Paso 1: Auth Service (COMPLETADO)
- Creado `src/services/types.ts` - tipos abstractos (ServiceUser, ServiceSession)
- Creado `src/services/auth.service.ts` - interfaz IAuthService
- Creado `src/services/providers/supabase/auth.provider.ts` - implementación Supabase
- Creado `src/services/index.ts` - factory/barrel export
- Refactorizado `src/contexts/AuthContext.tsx` - usa authService, cero imports de Supabase

## ✅ Paso 2: Data Service (COMPLETADO)
- Creado `src/services/data.service.ts` - interfaz IDataService con IQueryBuilder genérico
- Creado `src/services/providers/supabase/data.provider.ts` - implementación Supabase
- Exportado `dataService` desde `src/services/index.ts`
- Migrados 7 archivos que importaban supabase directamente:
  - `src/components/configuracion/RegionalesConfig.tsx`
  - `src/components/configuracion/FormasPagoConfig.tsx`
  - `src/components/configuracion/HistorialCambios.tsx`
  - `src/components/configuracion/PermisosConfig.tsx`
  - `src/components/usuarios/UserEditDialog.tsx`
  - `src/pages/Usuarios.tsx`
  - `src/components/programacion/ProgramacionFilters.tsx`

## ✅ Resultado actual - MIGRACIÓN COMPLETADA
- **0 archivos** fuera de `src/services/providers/` y `src/integrations/` importan o usan supabase directamente
- **Arquitectura hexagonal completa** - todos los componentes usan `dataService` y `authService`
- **Pasos 3-4 completados** - migración masiva de ~20 hooks, utilities, y componentes
- La app funciona idéntica en Lovable
- Base lista para agregar `providers/aws/` (Paso 5) en el futuro

## ✅ Paso 3: Servicios de dominio (COMPLETADO)
- Expandido `IDataService` con métodos avanzados: `gte`, `lte`, `not`, `is`, `rpc`, `upsert`, `range`
- Migradas todas las utilities de negocio: `calculateMetaQuantity`, `importMetasCSV`, `exportMetasDetailExcel`

## ✅ Paso 4: Migración de hooks y lógica de negocio (COMPLETADO)
- Migrados TODOS los hooks: `useSalesPeriod`, `useActivityCompliance`, `useSchedulingConfig`, etc.
- Migrados dashboards complejos: `DashboardLider`, `DashboardJefe`, `DashboardAsesor`
- Migradas páginas principales: `Programacion.tsx`, `Actividades.tsx`, `MetasConfig.tsx`
