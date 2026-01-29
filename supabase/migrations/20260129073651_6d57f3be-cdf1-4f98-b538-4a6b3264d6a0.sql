
-- Drop the existing view
DROP VIEW IF EXISTS public.profiles_with_roles;

-- Recreate the view with security_invoker = on so it respects RLS on base tables
CREATE VIEW public.profiles_with_roles
WITH (security_invoker=on) AS
SELECT 
    p.id,
    p.user_id,
    p.cedula,
    p.nombre_completo,
    p.telefono,
    p.zona,
    p.regional_id,
    p.codigo_asesor,
    p.codigo_jefe,
    p.tipo_asesor,
    p.ccosto_asesor,
    p.correo,
    p.activo,
    p.created_at,
    p.updated_at,
    ur.role,
    r.nombre AS regional_nombre,
    r.codigo AS regional_codigo
FROM profiles p
LEFT JOIN user_roles ur ON p.user_id = ur.user_id
LEFT JOIN regionales r ON p.regional_id = r.id;

-- Add policy to user_roles to allow leaders to view roles of their team
DROP POLICY IF EXISTS "Leaders can view team roles" ON public.user_roles;
CREATE POLICY "Leaders can view team roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'jefe_ventas'::app_role) OR
  has_role(auth.uid(), 'lider_zona'::app_role) OR
  has_role(auth.uid(), 'coordinador_comercial'::app_role) OR
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Also allow leaders to update profiles within their regional
DROP POLICY IF EXISTS "Leaders can update team profiles" ON public.profiles;
CREATE POLICY "Leaders can update team profiles"
ON public.profiles
FOR UPDATE
USING (
  (has_role(auth.uid(), 'lider_zona'::app_role) OR has_role(auth.uid(), 'coordinador_comercial'::app_role))
  AND regional_id = (SELECT p2.regional_id FROM public.profiles p2 WHERE p2.user_id = auth.uid())
);
