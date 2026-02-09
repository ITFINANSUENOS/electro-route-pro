/**
 * AWS Cognito Auth Provider (Placeholder)
 * 
 * This provider will implement IAuthService using Amazon Cognito.
 * Currently a placeholder — swap in real Cognito SDK calls when ready.
 * 
 * Required AWS SDK packages (install when implementing):
 *   @aws-sdk/client-cognito-identity-provider
 *   amazon-cognito-identity-js
 */

import type { IAuthService } from '../../auth.service';
import type {
  ServiceUser,
  ServiceSession,
  AuthSignUpProfileData,
  AuthStateChangeCallback,
  UserProfileResult,
} from '../../types';

export class AwsAuthProvider implements IAuthService {

  async signIn(_identifier: string, _password: string): Promise<{ error: Error | null }> {
    // TODO: Implement Cognito InitiateAuth (USER_PASSWORD_AUTH flow)
    return { error: new Error('AWS Cognito auth provider not yet implemented') };
  }

  async signUp(
    _email: string,
    _password: string,
    _profileData: AuthSignUpProfileData,
  ): Promise<{ error: Error | null }> {
    // TODO: Implement Cognito SignUp + store profile in DynamoDB/Aurora
    return { error: new Error('AWS Cognito auth provider not yet implemented') };
  }

  async signOut(): Promise<void> {
    // TODO: Implement Cognito GlobalSignOut
    console.warn('AWS Cognito signOut not yet implemented');
  }

  async getSession(): Promise<{ session: ServiceSession | null; user: ServiceUser | null }> {
    // TODO: Retrieve current Cognito session / tokens
    return { session: null, user: null };
  }

  async fetchUserProfile(_userId: string): Promise<UserProfileResult> {
    // TODO: Query Aurora Serverless v2 or DynamoDB for user profile
    return { profile: null, role: null };
  }

  onAuthStateChange(_callback: AuthStateChangeCallback): { unsubscribe: () => void } {
    // TODO: Subscribe to Cognito Hub events (amplify) or implement polling
    console.warn('AWS Cognito onAuthStateChange not yet implemented');
    return { unsubscribe: () => {} };
  }
}
