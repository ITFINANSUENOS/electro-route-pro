-- Drop the previous policy and create an improved one with 3-key matching
DROP POLICY IF EXISTS "Asesores can view their own sales by codigo" ON public.ventas;

-- Create new policy with 3-key matching (cedula, codigo_asesor, or nombre)
CREATE POLICY "Asesores can view their own sales by multi-key" 
ON public.ventas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND (
      -- Match by codigo_asesor
      (p.codigo_asesor IS NOT NULL AND p.codigo_asesor = ventas.codigo_asesor)
      -- Match by cedula
      OR (p.cedula IS NOT NULL AND p.cedula = ventas.cedula_asesor)
      -- Match by nombre (case-insensitive)
      OR (p.nombre_completo IS NOT NULL AND UPPER(TRIM(p.nombre_completo)) = UPPER(TRIM(ventas.asesor_nombre)))
    )
  )
);