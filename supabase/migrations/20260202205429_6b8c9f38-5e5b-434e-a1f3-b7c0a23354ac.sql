-- Crear tabla historial_metas para registrar cambios en metas
CREATE TABLE public.historial_metas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes INTEGER NOT NULL,
  anio INTEGER NOT NULL,
  accion TEXT NOT NULL DEFAULT 'carga_masiva',
  registros_afectados INTEGER NOT NULL DEFAULT 0,
  monto_total_anterior NUMERIC DEFAULT 0,
  monto_total_nuevo NUMERIC DEFAULT 0,
  modificado_por UUID REFERENCES auth.users(id),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.historial_metas ENABLE ROW LEVEL SECURITY;

-- Solo administrador puede insertar registros de historial
CREATE POLICY "Only admins can insert historial_metas"
ON public.historial_metas
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- Liderazgo puede ver el historial
CREATE POLICY "Leaders can view historial_metas"
ON public.historial_metas
FOR SELECT
USING (
  has_role(auth.uid(), 'lider_zona'::app_role) OR
  has_role(auth.uid(), 'coordinador_comercial'::app_role) OR
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Crear índice para búsquedas por período
CREATE INDEX idx_historial_metas_periodo ON public.historial_metas(anio, mes);

-- Comentario descriptivo
COMMENT ON TABLE public.historial_metas IS 'Registro de cambios en metas para auditoría';