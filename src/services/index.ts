// Service Layer - Factory / Barrel export
// Reads VITE_BACKEND_PROVIDER to decide which provider to use (default: 'supabase')

import type { IAuthService } from './auth.service';
import type { IDataService } from './data.service';
import { SupabaseAuthProvider } from './providers/supabase/auth.provider';
import { SupabaseDataProvider } from './providers/supabase/data.provider';
import { AwsAuthProvider } from './providers/aws/auth.provider';
import { AwsDataProvider } from './providers/aws/data.provider';

const provider = import.meta.env.VITE_BACKEND_PROVIDER || 'supabase';

function createAuthService(): IAuthService {
  switch (provider) {
    case 'aws':
      return new AwsAuthProvider();
    case 'supabase':
    default:
      return new SupabaseAuthProvider();
  }
}

function createDataService(): IDataService {
  switch (provider) {
    case 'aws':
      return new AwsDataProvider();
    case 'supabase':
    default:
      return new SupabaseDataProvider();
  }
}

export const authService: IAuthService = createAuthService();
export const dataService: IDataService = createDataService();

// Re-export types for convenience
export type { IAuthService } from './auth.service';
export type { IDataService } from './data.service';
export type { ServiceUser, ServiceSession, AuthSignUpProfileData, UserProfileResult } from './types';
