
-- Phase 1a: Create historial_migraciones table for traceability
CREATE TABLE IF NOT EXISTS public.historial_migraciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla_afectada text NOT NULL,
  campo_afectado text NOT NULL,
  valor_anterior text,
  valor_nuevo text,
  registros_afectados integer DEFAULT 0,
  descripcion text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.historial_migraciones ENABLE ROW LEVEL SECURITY;

-- Only admins can insert and view
CREATE POLICY "Admins can manage historial_migraciones"
  ON public.historial_migraciones
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Leaders can view historial_migraciones"
  ON public.historial_migraciones
  FOR SELECT
  TO public
  USING (
    has_role(auth.uid(), 'lider_zona'::app_role) OR
    has_role(auth.uid(), 'coordinador_comercial'::app_role) OR
    has_role(auth.uid(), 'administrador'::app_role)
  );
