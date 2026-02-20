/**
 * Storage Service Interface
 * 
 * Abstracts file storage operations (upload, download, signed URLs, etc.)
 * so that no file outside src/services/providers/ imports the storage client directly.
 */

export interface IStorageBucket {
  upload(
    path: string,
    file: File,
    options?: { contentType?: string },
  ): Promise<{ data: { path: string } | null; error: Error | null }>;

  getPublicUrl(path: string): { data: { publicUrl: string } };

  createSignedUrl(
    path: string,
    expiresIn: number,
  ): Promise<{ data: { signedUrl: string } | null; error: Error | null }>;

  remove(
    paths: string[],
  ): Promise<{ error: Error | null }>;

  download(
    path: string,
  ): Promise<{ data: Blob | null; error: Error | null }>;
}

export interface IStorageService {
  from(bucket: string): IStorageBucket;
}
