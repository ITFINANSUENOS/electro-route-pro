/**
 * AWS Storage Provider (Placeholder)
 * 
 * This provider will implement IStorageService using:
 *   - AWS S3 for file storage
 *   - CloudFront for signed URLs
 * 
 * Required AWS SDK packages (install when implementing):
 *   @aws-sdk/client-s3
 *   @aws-sdk/s3-request-presigner
 */

import type { IStorageService, IStorageBucket } from '../../storage.service';

function createPlaceholderBucket(): IStorageBucket {
  const notImplemented = new Error('AWS S3 storage provider not yet implemented');
  return {
    async upload() { return { data: null, error: notImplemented }; },
    getPublicUrl() { return { data: { publicUrl: '' } }; },
    async createSignedUrl() { return { data: null, error: notImplemented }; },
    async remove() { return { error: notImplemented }; },
    async download() { return { data: null, error: notImplemented }; },
  };
}

export class AwsStorageProvider implements IStorageService {
  from(_bucket: string): IStorageBucket {
    return createPlaceholderBucket();
  }
}
