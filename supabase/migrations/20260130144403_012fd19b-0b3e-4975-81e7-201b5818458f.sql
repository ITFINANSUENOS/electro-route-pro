
-- First drop the old check constraint
ALTER TABLE config_metas_promedio DROP CONSTRAINT IF EXISTS config_metas_promedio_tipo_venta_check;

-- Update existing data from CONVENIO to ALIADOS
UPDATE config_metas_promedio SET tipo_venta = 'ALIADOS' WHERE tipo_venta = 'CONVENIO';

-- Add new check constraint with ALIADOS instead of CONVENIO
ALTER TABLE config_metas_promedio ADD CONSTRAINT config_metas_promedio_tipo_venta_check 
  CHECK (tipo_venta IN ('CONTADO', 'CREDICONTADO', 'CREDITO', 'ALIADOS'));
