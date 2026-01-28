-- Fix: Allow advisors to view their own goals by matching codigo_asesor from profiles
DROP POLICY IF EXISTS "Users can view their own goals" ON public.metas;

CREATE POLICY "Users can view their own goals by codigo_asesor" 
ON public.metas FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.codigo_asesor = metas.codigo_asesor
  )
);