-- Drop the existing policy that doesn't include jefe_ventas
DROP POLICY IF EXISTS "Leaders can view all schedules" ON public.programacion;

-- Create updated policy that includes jefe_ventas role
CREATE POLICY "Leaders can view all schedules" 
ON public.programacion 
FOR SELECT 
USING (
  has_role(auth.uid(), 'jefe_ventas'::app_role) OR
  has_role(auth.uid(), 'lider_zona'::app_role) OR 
  has_role(auth.uid(), 'coordinador_comercial'::app_role) OR 
  has_role(auth.uid(), 'administrador'::app_role)
);