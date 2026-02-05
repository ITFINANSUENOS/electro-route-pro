-- Add column to distinguish between Meta Comercial and Meta Nacional
-- tipo_meta_categoria: 'comercial' (default) or 'nacional'

ALTER TABLE public.metas 
ADD COLUMN IF NOT EXISTS tipo_meta_categoria TEXT NOT NULL DEFAULT 'comercial';

-- Add constraint to ensure only valid values
ALTER TABLE public.metas 
ADD CONSTRAINT metas_tipo_meta_categoria_check 
CHECK (tipo_meta_categoria IN ('comercial', 'nacional'));

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_metas_tipo_meta_categoria 
ON public.metas(tipo_meta_categoria);

-- Update comment for clarity
COMMENT ON COLUMN public.metas.tipo_meta_categoria IS 'Tipo de meta: comercial (objetivo interno alto) o nacional (mínimo requerido). comercial >= nacional';
COMMENT ON COLUMN public.metas.tipo_meta IS 'Rubro de la meta: contado, credicontado, credito, aliados';