-- Add tipo_meta_categoria column to historial_metas to track which category was modified
ALTER TABLE public.historial_metas 
ADD COLUMN tipo_meta_categoria text NOT NULL DEFAULT 'comercial';