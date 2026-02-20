

# Plan: Implementar IStorageService y corregir violacion arquitectonica

## Problema

El archivo `src/hooks/useGroupEvidence.ts` importa directamente `supabase` desde `@/integrations/supabase/client` para operaciones de storage (`upload` y `getPublicUrl`). Esto viola la arquitectura hexagonal donde solo los providers dentro de `src/services/providers/` deben importar el cliente directo.

## Solucion

Crear la interfaz `IStorageService` que faltaba del plan original, implementar el provider de Supabase, el placeholder de AWS, exportarlo desde el factory, y migrar el hook.

## Archivos a modificar/crear

### 1. Crear `src/services/storage.service.ts` (interfaz)

Definir la interfaz abstracta con los metodos usados en la app:

- `from(bucket: string)` retorna un objeto con:
  - `upload(path, file, options?)` - sube un archivo
  - `getPublicUrl(path)` - obtiene URL publica
  - `createSignedUrl(path, expiresIn)` - genera URL firmada (para bucket privado)
  - `remove(paths)` - elimina archivos
  - `download(path)` - descarga un archivo

### 2. Crear `src/services/providers/supabase/storage.provider.ts`

Implementacion que delega al cliente Supabase real. Este es el unico archivo de storage que importa `@/integrations/supabase/client`. Dado que el bucket `evidencia-fotos` ahora es privado, se usara `createSignedUrl` en lugar de `getPublicUrl`.

### 3. Modificar `src/services/providers/aws/data.provider.ts`

Agregar un export `AwsStorageProvider` (placeholder) que lanza errores "not implemented" para todos los metodos, siguiendo el mismo patron existente del `AwsDataProvider`.

### 4. Modificar `src/services/index.ts`

Agregar `storageService` al factory con el switch de providers, y exportarlo.

### 5. Modificar `src/hooks/useGroupEvidence.ts`

- Eliminar `import { supabase } from '@/integrations/supabase/client'`
- Importar `storageService` desde `@/services`
- Reemplazar `supabase.storage.from(...)` por `storageService.from(...)`
- Usar `createSignedUrl` en lugar de `getPublicUrl` ya que el bucket es privado

## Detalle tecnico

### Interfaz IStorageService

```typescript
interface IStorageBucket {
  upload(path: string, file: File, options?: { contentType?: string }): 
    Promise<{ data: { path: string } | null; error: Error | null }>;
  getPublicUrl(path: string): { data: { publicUrl: string } };
  createSignedUrl(path: string, expiresIn: number): 
    Promise<{ data: { signedUrl: string } | null; error: Error | null }>;
  remove(paths: string[]): 
    Promise<{ error: Error | null }>;
  download(path: string): 
    Promise<{ data: Blob | null; error: Error | null }>;
}

interface IStorageService {
  from(bucket: string): IStorageBucket;
}
```

### Cambio clave en useGroupEvidence

Dado que el bucket `evidencia-fotos` se convirtio a privado en la migracion de seguridad reciente, el flujo cambia de `getPublicUrl` a `createSignedUrl`:

```typescript
// ANTES (violacion + bucket publico)
import { supabase } from '@/integrations/supabase/client';
const { data: uploadData } = await supabase.storage.from('evidencia-fotos').upload(...);
const { data: { publicUrl } } = supabase.storage.from('evidencia-fotos').getPublicUrl(uploadData.path);

// DESPUES (service layer + bucket privado)
import { storageService } from '@/services';
const { data: uploadData } = await storageService.from('evidencia-fotos').upload(...);
const { data: signedData } = await storageService.from('evidencia-fotos').createSignedUrl(uploadData.path, 3600);
const photoUrl = signedData?.signedUrl;
```

### Verificacion final

Buscar `from '@/integrations/supabase/client'` en `src/` excluyendo `src/services/providers/` debe dar 0 resultados.

