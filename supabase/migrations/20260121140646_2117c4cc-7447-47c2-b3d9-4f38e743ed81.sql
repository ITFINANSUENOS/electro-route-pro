-- Eliminar constraint restrictivo de mcn_clase para permitir más valores
ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS ventas_mcn_clase_check;

-- Eliminar constraint de tipo_venta para permitir más valores
ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS ventas_tipo_venta_check;