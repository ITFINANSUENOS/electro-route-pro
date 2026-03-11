-- Fix OBSEQUIOS CLIENTES: should be OTROS, not FINANSUENOS
UPDATE public.formas_pago 
SET tipo_venta = 'OTROS' 
WHERE LOWER(codigo) LIKE '%obsequio%' AND tipo_venta != 'OTROS';

-- Fix existing ventas records with obsequios mapped as FINANSUENOS
UPDATE public.ventas 
SET tipo_venta = 'OTROS' 
WHERE forma1_pago ILIKE '%obsequio%' AND tipo_venta IN ('FINANSUENOS', 'CREDITO', 'CREDICONTADO');

-- Log migration
INSERT INTO public.historial_migraciones (tabla_afectada, campo_afectado, valor_anterior, valor_nuevo, descripcion, registros_afectados)
VALUES 
  ('formas_pago', 'tipo_venta', 'FINANSUENOS', 'OTROS', 'Reclasificar OBSEQUIOS CLIENTES como OTROS (no es venta real)', 1),
  ('ventas', 'tipo_venta', 'FINANSUENOS/CREDITO/CREDICONTADO', 'OTROS', 'Corregir registros de obsequios que estaban clasificados como ventas', 0);