
-- =============================================
-- 1. Create evidencia_grupal table
-- =============================================
CREATE TABLE public.evidencia_grupal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  tipo_actividad text NOT NULL,
  municipio text NOT NULL,
  nombre_actividad text,
  hora_inicio time without time zone,
  hora_fin time without time zone,
  tipo_foto text NOT NULL,
  foto_url text NOT NULL,
  subido_por uuid NOT NULL,
  gps_latitud numeric,
  gps_longitud numeric,
  notas text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evidencia_grupal ENABLE ROW LEVEL SECURITY;

-- SELECT: colleagues in same activity + leadership
CREATE POLICY "Colleagues can view group evidence"
ON public.evidencia_grupal
FOR SELECT
TO authenticated
USING (
  is_colleague_in_activity(subido_por, fecha, tipo_actividad, municipio, hora_inicio, hora_fin, nombre_actividad)
  OR has_role(auth.uid(), 'jefe_ventas'::app_role)
  OR has_role(auth.uid(), 'lider_zona'::app_role)
  OR has_role(auth.uid(), 'coordinador_comercial'::app_role)
  OR has_role(auth.uid(), 'administrador'::app_role)
  OR auth.uid() = subido_por
);

-- INSERT: colleagues + leadership
CREATE POLICY "Colleagues can insert group evidence"
ON public.evidencia_grupal
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = subido_por
);

-- =============================================
-- 2. Create storage bucket for evidence photos
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidencia-fotos', 'evidencia-fotos', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload evidence photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'evidencia-fotos');

CREATE POLICY "Anyone can view evidence photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'evidencia-fotos');

-- =============================================
-- 3. Insert configuration parameters
-- =============================================
INSERT INTO public.permisos_roles (categoria, permiso, rol, habilitado) VALUES
  ('programacion_config', 'fotos_grupales_correria_cantidad', '3', true),
  ('programacion_config', 'etiquetas_fotos_correria', '["Inicio del viaje","Instalación en el punto","Cierre / Llegada al destino"]', true),
  ('programacion_config', 'foto_correria_inicio_desde', '05:00', true),
  ('programacion_config', 'foto_correria_inicio_hasta', '09:00', true),
  ('programacion_config', 'foto_correria_intermedio_desde', '05:00', true),
  ('programacion_config', 'foto_correria_intermedio_hasta', '19:00', true),
  ('programacion_config', 'foto_correria_cierre_desde', '16:00', true),
  ('programacion_config', 'foto_correria_cierre_hasta', '19:00', true),
  ('programacion_config', 'foto_punto_margen_minutos', '30', true),
  ('programacion_config', 'fotos_apertura_cierre_punto', 'true', true),
  ('programacion_config', 'consultas_hora_inicio', '12:00', true),
  ('programacion_config', 'consultas_hora_fin', '22:00', true);
