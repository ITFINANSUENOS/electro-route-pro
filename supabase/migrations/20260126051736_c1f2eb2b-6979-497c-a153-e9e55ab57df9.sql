-- Add indexes to optimize the multi-key RLS policy
CREATE INDEX IF NOT EXISTS idx_ventas_codigo_asesor ON public.ventas(codigo_asesor);
CREATE INDEX IF NOT EXISTS idx_ventas_cedula_asesor ON public.ventas(cedula_asesor);
CREATE INDEX IF NOT EXISTS idx_ventas_asesor_nombre ON public.ventas(asesor_nombre);

-- Create a more efficient RLS policy using simpler matching
DROP POLICY IF EXISTS "Asesores can view their own sales by multi-key" ON public.ventas;

-- Use a security definer function for efficient matching
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
    AND (
      (p.codigo_asesor IS NOT NULL AND p.codigo_asesor = sale_codigo_asesor)
      OR (p.cedula IS NOT NULL AND p.cedula = sale_cedula_asesor)
      OR (p.nombre_completo IS NOT NULL AND UPPER(TRIM(p.nombre_completo)) = UPPER(TRIM(sale_asesor_nombre)))
    )
  )
$$;

-- Create the optimized policy
CREATE POLICY "Asesores can view their own sales by multi-key" 
ON public.ventas 
FOR SELECT 
USING (
  public.advisor_can_view_sale(codigo_asesor, cedula_asesor, asesor_nombre)
);