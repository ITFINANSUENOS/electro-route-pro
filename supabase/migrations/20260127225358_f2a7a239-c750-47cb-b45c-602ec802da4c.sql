-- Fix: Restrict historial_ediciones INSERT to leadership roles only
-- This prevents any authenticated user from manipulating the audit trail

DROP POLICY IF EXISTS "Authenticated users can insert history" ON public.historial_ediciones;

CREATE POLICY "Only leadership can insert history" 
ON public.historial_ediciones 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'lider_zona'::app_role) OR 
  has_role(auth.uid(), 'coordinador_comercial'::app_role) OR 
  has_role(auth.uid(), 'administrativo'::app_role) OR 
  has_role(auth.uid(), 'administrador'::app_role)
);