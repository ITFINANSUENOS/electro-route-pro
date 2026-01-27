-- Remove the problematic recursive policy on programacion
DROP POLICY IF EXISTS "Users can view colleagues in same activities" ON public.programacion;

-- Create a SECURITY DEFINER function to check if user is in same activity
CREATE OR REPLACE FUNCTION public.is_colleague_in_activity(
  p_user_id uuid,
  p_fecha date,
  p_tipo_actividad text,
  p_municipio text,
  p_hora_inicio time,
  p_hora_fin time,
  p_nombre text
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.programacion
    WHERE user_id = auth.uid()
      AND fecha = p_fecha
      AND tipo_actividad::text = p_tipo_actividad
      AND municipio = p_municipio
      AND COALESCE(hora_inicio::text, '') = COALESCE(p_hora_inicio::text, '')
      AND COALESCE(hora_fin::text, '') = COALESCE(p_hora_fin::text, '')
      AND COALESCE(nombre, '') = COALESCE(p_nombre, '')
  )
$$;

-- Create non-recursive policy using the security definer function
CREATE POLICY "Users can view colleagues in same activities"
ON public.programacion
FOR SELECT
USING (
  -- User's own activities
  auth.uid() = user_id
  OR
  -- Colleagues in the same activity (using security definer to avoid recursion)
  public.is_colleague_in_activity(
    user_id,
    fecha,
    tipo_actividad::text,
    municipio,
    hora_inicio,
    hora_fin,
    nombre
  )
);