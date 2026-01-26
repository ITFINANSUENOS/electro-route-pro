-- Fix: advisor_can_view_sale function - Remove name-based matching and add activo check
CREATE OR REPLACE FUNCTION public.advisor_can_view_sale(
  sale_codigo_asesor TEXT,
  sale_cedula_asesor TEXT,
  sale_asesor_nombre TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.activo = true
    AND (
      (p.codigo_asesor IS NOT NULL AND p.codigo_asesor = sale_codigo_asesor)
      OR (p.cedula IS NOT NULL AND p.cedula = sale_cedula_asesor)
    )
  )
$$;

-- Add RLS policy to profiles_with_roles view to restrict access
-- First, check if this is a view - if so, we need to handle differently
-- Views don't support RLS directly, so we need to ensure it's only accessible via proper permissions
DROP VIEW IF EXISTS public.profiles_with_roles;

CREATE VIEW public.profiles_with_roles
WITH (security_invoker = on)
AS
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
  r.nombre as regional_nombre,
  r.codigo as regional_codigo
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
LEFT JOIN public.regionales r ON p.regional_id = r.id;

-- Restrict coordinadores table access to only admins and coordinators themselves
DROP POLICY IF EXISTS "Authenticated can view coordinadores" ON public.coordinadores;

CREATE POLICY "Only admins and self can view coordinadores"
ON public.coordinadores
FOR SELECT
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'coordinador_comercial'::app_role)
  OR (user_id IS NOT NULL AND auth.uid() = user_id)
);

-- Restrict lideres_zona table access to admins, coordinators, and leaders themselves  
DROP POLICY IF EXISTS "Authenticated can view lideres" ON public.lideres_zona;

CREATE POLICY "Only admins coordinators and self can view lideres"
ON public.lideres_zona
FOR SELECT
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'coordinador_comercial'::app_role)
  OR has_role(auth.uid(), 'lider_zona'::app_role)
  OR (user_id IS NOT NULL AND auth.uid() = user_id)
);

-- Restrict jefes_ventas table access to admins, coordinators, leaders, and managers themselves
DROP POLICY IF EXISTS "Authenticated can view jefes" ON public.jefes_ventas;

CREATE POLICY "Only leadership can view jefes"
ON public.jefes_ventas
FOR SELECT
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'coordinador_comercial'::app_role)
  OR has_role(auth.uid(), 'lider_zona'::app_role)
  OR has_role(auth.uid(), 'jefe_ventas'::app_role)
);