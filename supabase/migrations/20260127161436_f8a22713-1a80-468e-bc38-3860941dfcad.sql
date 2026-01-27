-- Add UPDATE policy to carga_archivos so the upload status can be updated
CREATE POLICY "Leaders can update uploads"
ON public.carga_archivos
FOR UPDATE
USING (
  has_role(auth.uid(), 'lider_zona'::app_role) OR 
  has_role(auth.uid(), 'coordinador_comercial'::app_role) OR 
  has_role(auth.uid(), 'administrativo'::app_role) OR 
  has_role(auth.uid(), 'administrador'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'lider_zona'::app_role) OR 
  has_role(auth.uid(), 'coordinador_comercial'::app_role) OR 
  has_role(auth.uid(), 'administrativo'::app_role) OR 
  has_role(auth.uid(), 'administrador'::app_role)
);