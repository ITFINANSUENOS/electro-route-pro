
# Plan de Migración - Arquitectura Hexagonal (Service Layer)

## ✅ Fase 1: Auth Service (COMPLETADO)
- Creado `src/services/types.ts` - tipos abstractos (ServiceUser, ServiceSession)
- Creado `src/services/auth.service.ts` - interfaz IAuthService
- Creado `src/services/providers/supabase/auth.provider.ts` - implementación Supabase
- Creado `src/services/index.ts` - factory/barrel export
- Refactorizado `src/contexts/AuthContext.tsx` - usa authService, cero imports de Supabase

## ✅ Fase 2: Data Service (COMPLETADO)
- Creado `src/services/data.service.ts` - interfaz IDataService con IQueryBuilder genérico
- Creado `src/services/providers/supabase/data.provider.ts` - implementación Supabase
- Exportado `dataService` desde `src/services/index.ts`
- Migrados TODOS los archivos que importaban supabase directamente

## ✅ Fase 3: Servicios de dominio (COMPLETADO)
- Expandido `IDataService` con métodos avanzados: `gte`, `lte`, `not`, `is`, `rpc`, `upsert`, `range`
- Migradas todas las utilities de negocio: `calculateMetaQuantity`, `importMetasCSV`, `exportMetasDetailExcel`, `exportPromediosTemplate`, `importPromediosTemplate`

## ✅ Fase 4: Migración de hooks y lógica de negocio (COMPLETADO)
- Migrados TODOS los hooks: `useSalesPeriod`, `useActivityCompliance`, `useSchedulingConfig`, `useTodayActivity`, `useActivityNotification`, `usePeriodSelector`, `useActivityEvidenceStatus`, `useMapLocations`, `useComparativeData`
- Migrados dashboards complejos: `DashboardLider`, `DashboardJefe`, `DashboardAsesor`
- Migradas páginas principales: `Programacion.tsx`, `Actividades.tsx`, `MetasConfig.tsx`, `MetasTab.tsx`
- Migrados componentes: `ActivityDetailDialog`, `ActividadesViewer`, `ComparativeFilters`, `MapFilters`, `RegionalesConfig`, `FormasPagoConfig`, `HistorialCambios`, `PermisosConfig`, `UserEditDialog`, `ProgramacionFilters`
- Migrada página `Usuarios.tsx`

## ✅ Fase 5: AWS Providers (COMPLETADO)
- Creado `src/services/providers/aws/auth.provider.ts` - placeholder Cognito (IAuthService)
- Creado `src/services/providers/aws/data.provider.ts` - placeholder AppSync/Aurora/Lambda (IDataService)
- Actualizado `src/services/index.ts` - factory soporta `VITE_BACKEND_PROVIDER=aws`
- Para activar AWS: establecer `VITE_BACKEND_PROVIDER=aws` en `.env`

## ✅ Resultado final - MIGRACIÓN 100% COMPLETADA
- **0 archivos** fuera de `src/services/providers/supabase/` importan el cliente supabase
- **Arquitectura hexagonal completa** - todos los componentes usan `dataService` y `authService`
- **2 providers disponibles**: Supabase (activo) y AWS (placeholder listo para implementar)
- **Cambio de backend**: Solo requiere `VITE_BACKEND_PROVIDER=aws` + implementar métodos en providers/aws/
- La app funciona idéntica en Lovable con Supabase como provider activo
