export type UserRole = 
  | 'asesor_comercial'
  | 'jefe_ventas'
  | 'lider_zona'
  | 'coordinador_comercial'
  | 'administrativo'
  | 'administrador';

export interface UserProfile {
  id: string;
  user_id: string;
  cedula: string;
  nombre_completo: string;
  telefono?: string;
  zona?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithRole extends UserProfile {
  role: UserRole;
}

export const roleLabels: Record<UserRole, string> = {
  asesor_comercial: 'Asesor Comercial',
  jefe_ventas: 'Jefe de Ventas',
  lider_zona: 'Líder de Zona',
  coordinador_comercial: 'Coordinador Comercial',
  administrativo: 'Administrativo',
  administrador: 'Administrador del Sistema',
};

export const rolePermissions: Record<UserRole, string[]> = {
  asesor_comercial: ['view_own_dashboard', 'register_activity', 'view_schedule'],
  jefe_ventas: ['view_team_dashboard', 'view_schedule', 'view_reports'],
  lider_zona: ['view_zone_dashboard', 'create_schedule', 'edit_schedule', 'upload_sales', 'upload_goals', 'view_reports'],
  coordinador_comercial: ['view_regional_dashboard', 'create_schedule', 'edit_schedule', 'upload_sales', 'upload_goals', 'view_reports', 'export_reports'],
  administrativo: ['view_admin_dashboard', 'upload_sales', 'view_reports', 'export_reports'],
  administrador: ['full_access'],
};
