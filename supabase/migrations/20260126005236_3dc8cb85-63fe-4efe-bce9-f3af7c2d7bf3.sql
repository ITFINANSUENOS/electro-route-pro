-- Remove the check constraint to allow CORRETAJE as a valid tipo_asesor value
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_tipo_asesor_check;

-- Add new check constraint that includes CORRETAJE
ALTER TABLE profiles ADD CONSTRAINT profiles_tipo_asesor_check CHECK (tipo_asesor IN ('INTERNO', 'EXTERNO', 'CORRETAJE'));