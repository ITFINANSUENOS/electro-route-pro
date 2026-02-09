// Service Layer - Factory / Barrel export
// Reads VITE_BACKEND_PROVIDER to decide which provider to use (default: 'supabase')

import type { IAuthService } from './auth.service';
import { SupabaseAuthProvider } from './providers/supabase/auth.provider';

const provider = import.meta.env.VITE_BACKEND_PROVIDER || 'supabase';

function createAuthService(): IAuthService {
  switch (provider) {
    case 'supabase':
      return new SupabaseAuthProvider();
    // Future: case 'aws': return new AwsCognitoAuthProvider();
    default:
      return new SupabaseAuthProvider();
  }
}

export const authService: IAuthService = createAuthService();

// Re-export types for convenience
export type { IAuthService } from './auth.service';
export type { ServiceUser, ServiceSession, AuthSignUpProfileData, UserProfileResult } from './types';
