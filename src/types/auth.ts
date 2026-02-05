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
  regional_id?: string;
  codigo_asesor?: string;
  codigo_jefe?: string;
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

// Permisos actualizados según requerimientos
export const rolePermissions: Record<UserRole, string[]> = {
  asesor_comercial: [
    'view_own_dashboard',
    'register_activity',
    'view_schedule_readonly',
    'view_own_sales',
    'view_own_ranking',
  ],
  jefe_ventas: [
    'view_team_dashboard',
    'view_schedule_readonly',
    'view_reports',
    'view_team_incompliance',
  ],
  lider_zona: [
    'view_zone_dashboard',
    'create_schedule',
    'edit_schedule',
    'upload_sales',
    'upload_goals',
    'view_reports',
    'view_map',
    'view_information',
    'view_all_advisors',
    'view_incompliance',
  ],
  coordinador_comercial: [
    'view_regional_dashboard',
    'create_schedule',
    'edit_schedule',
    'upload_sales',
    'upload_goals',
    'view_reports',
    'export_reports',
    'view_map',
    'view_information',
    'view_all_advisors',
    'view_incompliance',
    'filter_by_regional',
  ],
  administrativo: [
    'view_admin_dashboard',
    'upload_sales',
    'view_reports',
    'export_reports',
  ],
  administrador: ['full_access'],
};

// Orden de menú por rol (consolidado sin reportes separado)
export const menuOrderByRole: Record<UserRole, string[]> = {
  asesor_comercial: ['dashboard', 'programacion', 'actividades', 'comparativo'],
  jefe_ventas: ['dashboard', 'programacion', 'actividades', 'comparativo'],
  lider_zona: ['dashboard', 'programacion', 'actividades', 'comparativo', 'mapa', 'informacion', 'usuarios'],
  coordinador_comercial: ['dashboard', 'programacion', 'actividades', 'comparativo', 'mapa', 'informacion', 'usuarios'],
  administrativo: ['dashboard', 'cargar-ventas'],
  administrador: ['dashboard', 'programacion', 'actividades', 'comparativo', 'mapa', 'informacion', 'usuarios', 'configuracion'],
};

// Helper function to get zona based on regional name
export const getZonaByRegional = (regionalNombre: string): 'norte' | 'sur' | null => {
  const nombre = regionalNombre?.toUpperCase() || '';
  const zonaNorte = ['POPAYAN', 'CALI', 'VALLE', 'SANTANDER', 'AMBIENTA', 'PUERTO TEJADA'];
  const zonaSur = ['BORDO', 'PASTO', 'TUQUERRES', 'HUILA'];
  
  if (zonaNorte.some(r => nombre.includes(r))) return 'norte';
  if (zonaSur.some(r => nombre.includes(r))) return 'sur';
  return null;
};
