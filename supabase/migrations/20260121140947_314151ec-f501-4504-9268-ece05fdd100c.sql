-- Add unique constraints for upsert operations
ALTER TABLE public.jefes_ventas ADD CONSTRAINT jefes_ventas_cedula_unique UNIQUE (cedula);
ALTER TABLE public.lideres_zona ADD CONSTRAINT lideres_zona_cedula_unique UNIQUE (cedula);
ALTER TABLE public.coordinadores ADD CONSTRAINT coordinadores_cedula_unique UNIQUE (cedula);