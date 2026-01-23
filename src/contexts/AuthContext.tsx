import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole, UserProfile } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, profileData: { cedula: string; nombre_completo: string; telefono?: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetch to avoid blocking
          setTimeout(async () => {
            await fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching role:', roleError);
      }

      if (profileData) {
        setProfile({
          id: profileData.id,
          user_id: profileData.user_id,
          cedula: profileData.cedula,
          nombre_completo: profileData.nombre_completo,
          telefono: profileData.telefono,
          zona: profileData.zona,
          regional_id: profileData.regional_id,
          codigo_asesor: profileData.codigo_asesor,
          codigo_jefe: profileData.codigo_jefe,
          activo: profileData.activo,
          created_at: profileData.created_at,
          updated_at: profileData.updated_at,
        });
      } else {
        // Fallback profile from user metadata
        const user = (await supabase.auth.getUser()).data.user;
        setProfile({
          id: userId,
          user_id: userId,
          cedula: user?.user_metadata?.cedula || '',
          nombre_completo: user?.user_metadata?.nombre_completo || user?.email || 'Usuario',
          activo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      if (roleData) {
        setRole(roleData.role as UserRole);
      } else {
        setRole('asesor_comercial'); // Default role
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    profileData: { cedula: string; nombre_completo: string; telefono?: string }
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            cedula: profileData.cedula,
            nombre_completo: profileData.nombre_completo,
          }
        }
      });

      if (error) return { error };

      // Profile will be created by admin or trigger
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!role) return false;
    if (role === 'administrador') return true;
    
    const rolePerms: Record<UserRole, string[]> = {
      asesor_comercial: ['view_own_dashboard', 'register_activity', 'view_schedule'],
      jefe_ventas: ['view_team_dashboard', 'view_schedule', 'view_reports'],
      lider_zona: ['view_zone_dashboard', 'create_schedule', 'edit_schedule', 'upload_sales', 'upload_goals', 'view_reports'],
      coordinador_comercial: ['view_regional_dashboard', 'create_schedule', 'edit_schedule', 'upload_sales', 'upload_goals', 'view_reports', 'export_reports'],
      administrativo: ['view_admin_dashboard', 'upload_sales', 'view_reports', 'export_reports'],
      administrador: ['full_access'],
    };
    
    return rolePerms[role]?.includes(permission) ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        signIn,
        signUp,
        signOut,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
