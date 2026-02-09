import { supabase } from '@/integrations/supabase/client';
import type { IAuthService } from '../../auth.service';
import type {
  ServiceUser,
  ServiceSession,
  AuthSignUpProfileData,
  AuthStateChangeCallback,
  AuthEvent,
  UserProfileResult,
} from '../../types';
import type { UserRole, UserProfile } from '@/types/auth';

function mapUser(u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null): ServiceUser | null {
  if (!u) return null;
  return { id: u.id, email: u.email, user_metadata: u.user_metadata as Record<string, unknown> };
}

function mapSession(s: { access_token: string; refresh_token?: string; user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null): ServiceSession | null {
  if (!s) return null;
  return { access_token: s.access_token, refresh_token: s.refresh_token, user: mapUser(s.user)! };
}

export class SupabaseAuthProvider implements IAuthService {

  async signIn(identifier: string, password: string): Promise<{ error: Error | null }> {
    try {
      let email = identifier;

      const isCedula = /^\d+$/.test(identifier.trim());
      if (isCedula) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('correo, user_id')
          .eq('cedula', identifier.trim())
          .maybeSingle();

        if (profileData?.correo) {
          email = profileData.correo;
        } else {
          email = `${identifier.trim()}@electrocreditos.com`;
        }
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async signUp(email: string, password: string, profileData: AuthSignUpProfileData): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            cedula: profileData.cedula,
            nombre_completo: profileData.nombre_completo,
          },
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  async getSession(): Promise<{ session: ServiceSession | null; user: ServiceUser | null }> {
    const { data: { session } } = await supabase.auth.getSession();
    return { session: mapSession(session), user: mapUser(session?.user ?? null) };
  }

  async fetchUserProfile(userId: string): Promise<UserProfileResult> {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) console.error('Error fetching profile:', profileError);

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) console.error('Error fetching role:', roleError);

      let profile: UserProfile | null = null;

      if (profileData) {
        profile = {
          id: profileData.id,
          user_id: profileData.user_id,
          cedula: profileData.cedula,
          nombre_completo: profileData.nombre_completo,
          telefono: profileData.telefono,
          zona: profileData.zona,
          regional_id: profileData.regional_id,
          codigo_asesor: profileData.codigo_asesor,
          codigo_jefe: profileData.codigo_jefe,
          activo: profileData.activo ?? true,
          created_at: profileData.created_at,
          updated_at: profileData.updated_at,
        };
      } else {
        const user = (await supabase.auth.getUser()).data.user;
        profile = {
          id: userId,
          user_id: userId,
          cedula: user?.user_metadata?.cedula as string || '',
          nombre_completo: (user?.user_metadata?.nombre_completo as string) || user?.email || 'Usuario',
          activo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      const role: UserRole = roleData ? (roleData.role as UserRole) : 'asesor_comercial';

      return { profile, role };
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return { profile: null, role: null };
    }
  }

  onAuthStateChange(callback: AuthStateChangeCallback): { unsubscribe: () => void } {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        callback(event as AuthEvent, mapSession(session));
      }
    );
    return { unsubscribe: () => subscription.unsubscribe() };
  }
}
