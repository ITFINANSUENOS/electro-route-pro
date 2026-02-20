import { supabase } from '@/integrations/supabase/client';
import type { IStorageService, IStorageBucket } from '../../storage.service';

/**
 * Supabase implementation of IStorageService.
 * This is the ONLY file that imports the supabase client for storage operations.
 */
export class SupabaseStorageProvider implements IStorageService {
  from(bucket: string): IStorageBucket {
    const bucketRef = supabase.storage.from(bucket);

    return {
      async upload(path, file, options) {
        const { data, error } = await bucketRef.upload(path, file, options ? { contentType: options.contentType } : undefined);
        return {
          data: data ? { path: data.path } : null,
          error: error ? new Error(error.message) : null,
        };
      },

      getPublicUrl(path) {
        const { data } = bucketRef.getPublicUrl(path);
        return { data: { publicUrl: data.publicUrl } };
      },

      async createSignedUrl(path, expiresIn) {
        const { data, error } = await bucketRef.createSignedUrl(path, expiresIn);
        return {
          data: data ? { signedUrl: data.signedUrl } : null,
          error: error ? new Error(error.message) : null,
        };
      },

      async remove(paths) {
        const { error } = await bucketRef.remove(paths);
        return { error: error ? new Error(error.message) : null };
      },

      async download(path) {
        const { data, error } = await bucketRef.download(path);
        return {
          data: data as Blob | null,
          error: error ? new Error(error.message) : null,
        };
      },
    };
  }
}
