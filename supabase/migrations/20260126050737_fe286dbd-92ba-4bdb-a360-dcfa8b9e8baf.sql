-- Add RLS policy for advisors to view their own sales by codigo_asesor
CREATE POLICY "Asesores can view their own sales by codigo" 
ON public.ventas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.codigo_asesor = ventas.codigo_asesor
  )
);