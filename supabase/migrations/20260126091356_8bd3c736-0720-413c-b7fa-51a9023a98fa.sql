-- Add nombre field to programacion table for activity naming
ALTER TABLE public.programacion 
ADD COLUMN IF NOT EXISTS nombre TEXT;