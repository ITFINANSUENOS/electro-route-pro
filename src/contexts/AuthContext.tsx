import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '@/services';
import type { ServiceUser, ServiceSession } from '@/services/types';
import { UserRole, UserProfile } from '@/types/auth';

interface AuthContextType {
  user: ServiceUser | null;
  session: ServiceSession | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, profileData: { cedula: string; nombre_completo: string; telefono?: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ServiceUser | null>(null);
  const [session, setSession] = useState<ServiceSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { unsubscribe } = authService.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    });

    authService.getSession().then(({ session, user }) => {
      setSession(session);
      setUser(user);
      if (user) {
        loadProfile(user.id);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { profile, role } = await authService.fetchUserProfile(userId);
      setProfile(profile);
      setRole(role);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (identifier: string, password: string) => {
    return authService.signIn(identifier, password);
  };

  const signUp = async (
    email: string,
    password: string,
    profileData: { cedula: string; nombre_completo: string; telefono?: string }
  ) => {
    return authService.signUp(email, password, profileData);
  };

  const signOut = async () => {
    // Immediately clear all state to trigger redirect
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    // Then sign out from the backend
    await authService.signOut();
  };

  /**
   * SECURITY NOTE: This is a UI-ONLY permission check for showing/hiding UI elements.
   * It does NOT provide security enforcement - that is handled by:
   * - Row Level Security (RLS) policies on database tables
   * - Edge function role checks using has_role() function
   * - SECURITY DEFINER functions that verify user_roles
   */
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
      value={{ user, session, profile, role, loading, signIn, signUp, signOut, hasPermission }}
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
