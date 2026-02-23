-- Drop the existing check constraint and replace with one that includes 'cancelado'
ALTER TABLE public.carga_archivos DROP CONSTRAINT IF EXISTS carga_archivos_estado_check;
ALTER TABLE public.carga_archivos ADD CONSTRAINT carga_archivos_estado_check CHECK (estado IN ('procesando', 'completado', 'error', 'cancelado'));