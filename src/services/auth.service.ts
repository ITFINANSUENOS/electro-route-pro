// IAuthService - Interface for authentication service
// Implementations live in src/services/providers/

import type { ServiceUser, ServiceSession, AuthSignUpProfileData, AuthStateChangeCallback, UserProfileResult } from './types';

export interface IAuthService {
  signIn(identifier: string, password: string): Promise<{ error: Error | null }>;
  signUp(email: string, password: string, profileData: AuthSignUpProfileData): Promise<{ error: Error | null }>;
  signOut(): Promise<void>;
  getSession(): Promise<{ session: ServiceSession | null; user: ServiceUser | null }>;
  fetchUserProfile(userId: string): Promise<UserProfileResult>;
  onAuthStateChange(callback: AuthStateChangeCallback): { unsubscribe: () => void };
}
