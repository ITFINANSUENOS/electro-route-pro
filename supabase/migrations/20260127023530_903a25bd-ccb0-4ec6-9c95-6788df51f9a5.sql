-- Allow advisors to see colleagues assigned to the same activities
-- This enables team coordination for shared activities

CREATE POLICY "Users can view colleagues in same activities"
ON public.programacion
FOR SELECT
USING (
  -- Check if there's any activity for the current user with matching parameters
  EXISTS (
    SELECT 1 
    FROM public.programacion my_activity
    WHERE my_activity.user_id = auth.uid()
      AND my_activity.fecha = programacion.fecha
      AND my_activity.tipo_actividad = programacion.tipo_actividad
      AND my_activity.municipio = programacion.municipio
      AND COALESCE(my_activity.hora_inicio::text, '') = COALESCE(programacion.hora_inicio::text, '')
      AND COALESCE(my_activity.hora_fin::text, '') = COALESCE(programacion.hora_fin::text, '')
      AND COALESCE(my_activity.nombre, '') = COALESCE(programacion.nombre, '')
  )
);