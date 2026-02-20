
-- Tabla de mapeo de regionales: permite consolidar regionales sin modificar datos originales
CREATE TABLE public.regional_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_cod_region integer NOT NULL,
  target_cod_region integer NOT NULL,
  source_regional_id uuid NOT NULL REFERENCES public.regionales(id),
  target_regional_id uuid NOT NULL REFERENCES public.regionales(id),
  fecha_efectiva date NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin date NULL,
  activo boolean NOT NULL DEFAULT true,
  notas text NULL,
  creado_por uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT different_regionals CHECK (source_regional_id != target_regional_id),
  CONSTRAINT valid_date_range CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_efectiva)
);

-- Índices para consultas rápidas
CREATE INDEX idx_regional_mappings_source ON public.regional_mappings(source_cod_region) WHERE activo = true;
CREATE INDEX idx_regional_mappings_active ON public.regional_mappings(activo, fecha_efectiva);

-- Enable RLS
ALTER TABLE public.regional_mappings ENABLE ROW LEVEL SECURITY;

-- Solo admins y coordinadores pueden gestionar mapeos
CREATE POLICY "Admins can manage regional_mappings"
  ON public.regional_mappings FOR ALL
  USING (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Coordinators can manage regional_mappings"
  ON public.regional_mappings FOR ALL
  USING (has_role(auth.uid(), 'coordinador_comercial'::app_role));

-- Todos los autenticados pueden ver los mapeos (necesario para dashboards)
CREATE POLICY "Authenticated can view regional_mappings"
  ON public.regional_mappings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Función helper: dado un cod_region, retorna el cod_region consolidado
CREATE OR REPLACE FUNCTION public.get_effective_cod_region(p_cod_region integer, p_fecha date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT target_cod_region 
     FROM public.regional_mappings 
     WHERE source_cod_region = p_cod_region 
       AND activo = true
       AND fecha_efectiva <= p_fecha
       AND (fecha_fin IS NULL OR fecha_fin >= p_fecha)
     ORDER BY fecha_efectiva DESC
     LIMIT 1),
    p_cod_region
  );
$$;

-- Función helper: dado un regional_id, retorna el regional_id consolidado
CREATE OR REPLACE FUNCTION public.get_effective_regional_id(p_regional_id uuid, p_fecha date DEFAULT CURRENT_DATE)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT target_regional_id 
     FROM public.regional_mappings 
     WHERE source_regional_id = p_regional_id 
       AND activo = true
       AND fecha_efectiva <= p_fecha
       AND (fecha_fin IS NULL OR fecha_fin >= p_fecha)
     ORDER BY fecha_efectiva DESC
     LIMIT 1),
    p_regional_id
  );
$$;
