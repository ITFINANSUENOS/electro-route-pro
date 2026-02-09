// Service Layer types - abstract backend-specific types
// These types replace direct dependencies on @supabase/supabase-js

export { type UserRole, type UserProfile, rolePermissions, roleLabels, menuOrderByRole, getZonaByRegional } from '@/types/auth';

export interface ServiceUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface ServiceSession {
  access_token: string;
  refresh_token?: string;
  user: ServiceUser;
}

export interface AuthSignUpProfileData {
  cedula: string;
  nombre_completo: string;
  telefono?: string;
}

export interface UserProfileResult {
  profile: import('@/types/auth').UserProfile | null;
  role: import('@/types/auth').UserRole | null;
}

export type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'INITIAL_SESSION';

export type AuthStateChangeCallback = (
  event: AuthEvent,
  session: ServiceSession | null
) => void;
