-- Add subcategoria column to formas_pago
ALTER TABLE public.formas_pago ADD COLUMN IF NOT EXISTS subcategoria text;