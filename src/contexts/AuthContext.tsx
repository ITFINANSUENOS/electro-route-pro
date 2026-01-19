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
        }
        setLoading(false);
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
      // For now, we'll set a default role since tables don't exist yet
      // This will be updated once the database is set up
      setProfile({
        id: userId,
        user_id: userId,
        cedula: '',
        nombre_completo: user?.email || 'Usuario',
        activo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setRole('asesor_comercial');
    } catch (error) {
      console.error('Error fetching user profile:', error);
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
