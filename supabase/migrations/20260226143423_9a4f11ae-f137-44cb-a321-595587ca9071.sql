-- Fix unique constraint: include tipo_meta_categoria to allow both comercial and nacional metas
-- for the same advisor+type+period
ALTER TABLE public.metas DROP CONSTRAINT metas_codigo_asesor_mes_anio_tipo_meta_key;
CREATE UNIQUE INDEX metas_codigo_asesor_mes_anio_tipo_meta_categoria_key 
ON public.metas (codigo_asesor, mes, anio, tipo_meta, tipo_meta_categoria);