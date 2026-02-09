
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

## Resultado actual
- **0 archivos** fuera de `src/services/providers/` y `src/integrations/` importan supabase directamente
- La app funciona idéntica en Lovable
- Base lista para agregar `providers/aws/` en fases futuras

## Estructura de servicios

```text
src/services/
  types.ts                              (tipos abstractos)
  auth.service.ts                       (interfaz IAuthService)
  data.service.ts                       (interfaz IDataService)
  index.ts                              (factory + barrel)
  providers/
    supabase/
      auth.provider.ts                  (impl auth)
      data.provider.ts                  (impl data/CRUD)
```

## Próximos pasos posibles
- Paso 3: Crear servicios de dominio específicos (VentasService, MetasService, etc.)
- Paso 4: Migrar hooks que usan lógica de negocio compleja
- Paso 5: Preparar providers AWS (Cognito + DynamoDB)
