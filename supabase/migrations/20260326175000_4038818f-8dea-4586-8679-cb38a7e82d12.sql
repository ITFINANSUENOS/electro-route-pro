
-- Create asesores_pendientes table
CREATE TABLE public.asesores_pendientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_asesor text NOT NULL UNIQUE,
  cedula text,
  nombre_completo text,
  cod_region integer,
  regional_id uuid REFERENCES public.regionales(id),
  num_ventas integer DEFAULT 0,
  mes_deteccion integer,
  anio_deteccion integer,
  estado text NOT NULL DEFAULT 'pendiente',
  email text,
  telefono text,
  tipo_asesor text,
  codigo_jefe text,
  resuelto_por uuid,
  resuelto_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asesores_pendientes ENABLE ROW LEVEL SECURITY;

-- RLS: Leadership can SELECT
CREATE POLICY "Leadership can view asesores_pendientes"
ON public.asesores_pendientes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'coordinador_comercial'::app_role)
  OR has_role(auth.uid(), 'lider_zona'::app_role)
);

-- RLS: Leadership can INSERT
CREATE POLICY "Leadership can insert asesores_pendientes"
ON public.asesores_pendientes
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'coordinador_comercial'::app_role)
  OR has_role(auth.uid(), 'lider_zona'::app_role)
  OR has_role(auth.uid(), 'administrativo'::app_role)
);

-- RLS: Leadership can UPDATE
CREATE POLICY "Leadership can update asesores_pendientes"
ON public.asesores_pendientes
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'coordinador_comercial'::app_role)
  OR has_role(auth.uid(), 'lider_zona'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'coordinador_comercial'::app_role)
  OR has_role(auth.uid(), 'lider_zona'::app_role)
);
