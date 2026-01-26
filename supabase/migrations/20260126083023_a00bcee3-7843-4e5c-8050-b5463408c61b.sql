-- Add policy to allow service role and leaders to delete sales records for data replacement
CREATE POLICY "Leaders can delete sales for period replacement" 
ON public.ventas 
FOR DELETE 
USING (
  has_role(auth.uid(), 'lider_zona'::app_role) OR 
  has_role(auth.uid(), 'coordinador_comercial'::app_role) OR 
  has_role(auth.uid(), 'administrativo'::app_role) OR 
  has_role(auth.uid(), 'administrador'::app_role)
);