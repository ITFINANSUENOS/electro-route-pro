
-- Update check constraint to include FINANSUENOS
ALTER TABLE public.config_metas_promedio DROP CONSTRAINT config_metas_promedio_tipo_venta_check;
ALTER TABLE public.config_metas_promedio ADD CONSTRAINT config_metas_promedio_tipo_venta_check 
  CHECK (tipo_venta = ANY (ARRAY['CONTADO'::text, 'FINANSUENOS'::text, 'ALIADOS'::text, 'CREDICONTADO'::text, 'CREDITO'::text]));
