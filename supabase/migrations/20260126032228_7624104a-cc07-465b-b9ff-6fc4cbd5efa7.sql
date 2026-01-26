-- Create table for role permissions
CREATE TABLE public.permisos_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rol text NOT NULL,
  permiso text NOT NULL,
  habilitado boolean NOT NULL DEFAULT true,
  categoria text NOT NULL DEFAULT 'general',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(rol, permiso)
);

-- Enable RLS
ALTER TABLE public.permisos_roles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage permisos"
ON public.permisos_roles
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Authenticated can view permisos"
ON public.permisos_roles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Insert default permissions for all roles
INSERT INTO public.permisos_roles (rol, permiso, habilitado, categoria) VALUES
-- Asesor Comercial
('asesor_comercial', 'ver_dashboard_propio', true, 'Dashboard'),
('asesor_comercial', 'ver_programacion', true, 'Programación'),
('asesor_comercial', 'editar_programacion', false, 'Programación'),
('asesor_comercial', 'registrar_actividad', true, 'Actividades'),
('asesor_comercial', 'ver_ventas_propias', true, 'Ventas'),
('asesor_comercial', 'cargar_ventas', false, 'Información'),
('asesor_comercial', 'ver_mapa', false, 'Mapa'),
('asesor_comercial', 'ver_usuarios', false, 'Usuarios'),
('asesor_comercial', 'editar_usuarios', false, 'Usuarios'),
('asesor_comercial', 'crear_usuarios', false, 'Usuarios'),
('asesor_comercial', 'activar_desactivar_usuarios', false, 'Usuarios'),
('asesor_comercial', 'ver_configuracion', false, 'Configuración'),

-- Jefe de Ventas
('jefe_ventas', 'ver_dashboard_propio', true, 'Dashboard'),
('jefe_ventas', 'ver_dashboard_equipo', true, 'Dashboard'),
('jefe_ventas', 'ver_programacion', true, 'Programación'),
('jefe_ventas', 'editar_programacion', false, 'Programación'),
('jefe_ventas', 'registrar_actividad', false, 'Actividades'),
('jefe_ventas', 'ver_ventas_propias', true, 'Ventas'),
('jefe_ventas', 'ver_ventas_equipo', true, 'Ventas'),
('jefe_ventas', 'cargar_ventas', false, 'Información'),
('jefe_ventas', 'ver_mapa', true, 'Mapa'),
('jefe_ventas', 'ver_ubicacion_asesores', true, 'Mapa'),
('jefe_ventas', 'ver_evidencias_asesores', true, 'Mapa'),
('jefe_ventas', 'ver_usuarios', false, 'Usuarios'),
('jefe_ventas', 'editar_usuarios', false, 'Usuarios'),
('jefe_ventas', 'crear_usuarios', false, 'Usuarios'),
('jefe_ventas', 'activar_desactivar_usuarios', false, 'Usuarios'),
('jefe_ventas', 'ver_configuracion', false, 'Configuración'),

-- Líder de Zona
('lider_zona', 'ver_dashboard_propio', true, 'Dashboard'),
('lider_zona', 'ver_dashboard_equipo', true, 'Dashboard'),
('lider_zona', 'ver_dashboard_zona', true, 'Dashboard'),
('lider_zona', 'ver_programacion', true, 'Programación'),
('lider_zona', 'editar_programacion', true, 'Programación'),
('lider_zona', 'crear_programacion', true, 'Programación'),
('lider_zona', 'registrar_actividad', false, 'Actividades'),
('lider_zona', 'ver_ventas_propias', true, 'Ventas'),
('lider_zona', 'ver_ventas_equipo', true, 'Ventas'),
('lider_zona', 'ver_ventas_zona', true, 'Ventas'),
('lider_zona', 'cargar_ventas', true, 'Información'),
('lider_zona', 'cargar_metas', true, 'Información'),
('lider_zona', 'ver_mapa', true, 'Mapa'),
('lider_zona', 'ver_ubicacion_asesores', true, 'Mapa'),
('lider_zona', 'ver_evidencias_asesores', true, 'Mapa'),
('lider_zona', 'ver_usuarios', true, 'Usuarios'),
('lider_zona', 'editar_usuarios', true, 'Usuarios'),
('lider_zona', 'crear_usuarios', false, 'Usuarios'),
('lider_zona', 'activar_desactivar_usuarios', false, 'Usuarios'),
('lider_zona', 'ver_configuracion', false, 'Configuración'),

-- Coordinador Comercial
('coordinador_comercial', 'ver_dashboard_propio', true, 'Dashboard'),
('coordinador_comercial', 'ver_dashboard_equipo', true, 'Dashboard'),
('coordinador_comercial', 'ver_dashboard_zona', true, 'Dashboard'),
('coordinador_comercial', 'ver_dashboard_regional', true, 'Dashboard'),
('coordinador_comercial', 'ver_programacion', true, 'Programación'),
('coordinador_comercial', 'editar_programacion', true, 'Programación'),
('coordinador_comercial', 'crear_programacion', true, 'Programación'),
('coordinador_comercial', 'registrar_actividad', false, 'Actividades'),
('coordinador_comercial', 'ver_ventas_propias', true, 'Ventas'),
('coordinador_comercial', 'ver_ventas_equipo', true, 'Ventas'),
('coordinador_comercial', 'ver_ventas_zona', true, 'Ventas'),
('coordinador_comercial', 'ver_ventas_regional', true, 'Ventas'),
('coordinador_comercial', 'cargar_ventas', true, 'Información'),
('coordinador_comercial', 'cargar_metas', true, 'Información'),
('coordinador_comercial', 'exportar_reportes', true, 'Reportes'),
('coordinador_comercial', 'ver_mapa', true, 'Mapa'),
('coordinador_comercial', 'ver_ubicacion_asesores', true, 'Mapa'),
('coordinador_comercial', 'ver_evidencias_asesores', true, 'Mapa'),
('coordinador_comercial', 'ver_usuarios', true, 'Usuarios'),
('coordinador_comercial', 'editar_usuarios', true, 'Usuarios'),
('coordinador_comercial', 'crear_usuarios', true, 'Usuarios'),
('coordinador_comercial', 'activar_desactivar_usuarios', true, 'Usuarios'),
('coordinador_comercial', 'ver_configuracion', false, 'Configuración'),

-- Administrativo
('administrativo', 'ver_dashboard_propio', true, 'Dashboard'),
('administrativo', 'ver_programacion', false, 'Programación'),
('administrativo', 'editar_programacion', false, 'Programación'),
('administrativo', 'registrar_actividad', false, 'Actividades'),
('administrativo', 'ver_ventas_propias', true, 'Ventas'),
('administrativo', 'cargar_ventas', true, 'Información'),
('administrativo', 'exportar_reportes', true, 'Reportes'),
('administrativo', 'ver_mapa', false, 'Mapa'),
('administrativo', 'ver_usuarios', false, 'Usuarios'),
('administrativo', 'editar_usuarios', false, 'Usuarios'),
('administrativo', 'crear_usuarios', false, 'Usuarios'),
('administrativo', 'activar_desactivar_usuarios', false, 'Usuarios'),
('administrativo', 'ver_configuracion', false, 'Configuración'),

-- Administrador
('administrador', 'ver_dashboard_propio', true, 'Dashboard'),
('administrador', 'ver_dashboard_equipo', true, 'Dashboard'),
('administrador', 'ver_dashboard_zona', true, 'Dashboard'),
('administrador', 'ver_dashboard_regional', true, 'Dashboard'),
('administrador', 'ver_dashboard_global', true, 'Dashboard'),
('administrador', 'ver_programacion', true, 'Programación'),
('administrador', 'editar_programacion', true, 'Programación'),
('administrador', 'crear_programacion', true, 'Programación'),
('administrador', 'registrar_actividad', true, 'Actividades'),
('administrador', 'ver_ventas_propias', true, 'Ventas'),
('administrador', 'ver_ventas_equipo', true, 'Ventas'),
('administrador', 'ver_ventas_zona', true, 'Ventas'),
('administrador', 'ver_ventas_regional', true, 'Ventas'),
('administrador', 'ver_ventas_global', true, 'Ventas'),
('administrador', 'cargar_ventas', true, 'Información'),
('administrador', 'cargar_metas', true, 'Información'),
('administrador', 'exportar_reportes', true, 'Reportes'),
('administrador', 'ver_mapa', true, 'Mapa'),
('administrador', 'ver_ubicacion_asesores', true, 'Mapa'),
('administrador', 'ver_evidencias_asesores', true, 'Mapa'),
('administrador', 'ver_usuarios', true, 'Usuarios'),
('administrador', 'editar_usuarios', true, 'Usuarios'),
('administrador', 'crear_usuarios', true, 'Usuarios'),
('administrador', 'activar_desactivar_usuarios', true, 'Usuarios'),
('administrador', 'ver_configuracion', true, 'Configuración'),
('administrador', 'editar_configuracion', true, 'Configuración');