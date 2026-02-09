

# Paso 1: Service Layer - Auth Service + Refactorizacion AuthContext

## Objetivo
Crear la estructura base de la Service Layer con arquitectura hexagonal. Al finalizar, `AuthContext.tsx` no importara nada de Supabase directamente.

---

## Archivos a crear (4 nuevos)

### 1. `src/services/types.ts`
Tipos propios de la Service Layer que abstraen los tipos de Supabase:
- `ServiceUser` (id, email, user_metadata) - reemplaza `User` de Supabase
- `ServiceSession` (access_token, user) - reemplaza `Session` de Supabase
- `AuthStateChangeCallback` - tipo para el listener de sesion
- `AuthSignUpProfileData` - datos de perfil para registro
- Re-exportacion de `UserRole` y `UserProfile` desde `src/types/auth.ts`

### 2. `src/services/auth.service.ts`
Interfaz `IAuthService` con los metodos:
- `signIn(identifier, password)` - login por cedula o email
- `signUp(email, password, profileData)` - registro
- `signOut()` - cierre de sesion
- `getSession()` - sesion actual
- `fetchUserProfile(userId)` - obtener perfil + rol
- `onAuthStateChange(callback)` - listener de estado de auth

### 3. `src/services/providers/supabase/auth.provider.ts`
Implementacion concreta de `IAuthService` usando el cliente Supabase. Este archivo:
- Es el UNICO que importa `supabase` de `@/integrations/supabase/client`
- Contiene toda la logica de auth que hoy vive en AuthContext (lookup cedula, fetch profile, fetch role, fallback de metadata)
- Encapsula las llamadas a `supabase.auth.*` y `supabase.from('profiles')` / `supabase.from('user_roles')`

### 4. `src/services/index.ts`
Barrel export que instancia el provider activo:
- Lee `VITE_BACKEND_PROVIDER` (default: `'supabase'`)
- Exporta `authService` como singleton
- En el futuro se agregara el case `'aws'` para el provider de Cognito

---

## Archivo a refactorizar (1 existente)

### 5. `src/contexts/AuthContext.tsx`
- **Eliminar**: imports de `supabase` client y tipos `User`/`Session` de `@supabase/supabase-js`
- **Agregar**: import de `authService` desde `@/services` y tipos `ServiceUser`/`ServiceSession` desde `@/services/types`
- **Delegar**: toda la logica de `signIn`, `signUp`, `signOut`, `fetchUserProfile`, `onAuthStateChange`, `getSession` al `authService`
- **Mantener**: `hasPermission()` sin cambios (es logica de UI pura)
- Los tipos de estado internos cambian de `User` a `ServiceUser` y de `Session` a `ServiceSession`

---

## Resultado

```text
src/services/
  types.ts                              (nuevo)
  auth.service.ts                       (nuevo - interfaz)
  index.ts                              (nuevo - factory)
  providers/
    supabase/
      auth.provider.ts                  (nuevo - implementacion)

src/contexts/
  AuthContext.tsx                        (refactorizado)
```

- La app sigue funcionando identica en Lovable y en el link publicado
- AuthContext ya no conoce Supabase, solo conoce IAuthService
- Base lista para agregar providers/aws/auth.provider.ts en fases futuras

