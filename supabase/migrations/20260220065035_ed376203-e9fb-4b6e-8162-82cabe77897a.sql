
-- Agregar columna cod_forma (referencia informativa del COD_FORMA_ del CSV)
ALTER TABLE public.formas_pago ADD COLUMN cod_forma TEXT;

-- Insertar nuevos codigos de pago
INSERT INTO public.formas_pago (codigo, nombre, tipo_venta, cod_forma, activo)
VALUES 
  ('PLAN BRILLA / ALIADOS 01', 'Brilla Aliados 01', 'ALIADOS', 'PB01', true),
  ('PLAN SISTECREDITO / ALIADOS 01', 'Sistecredito Aliados 01', 'ALIADOS', 'PS01', true);

-- Poblar cod_forma en registros existentes (referencia informativa)
UPDATE public.formas_pago SET cod_forma = '01' WHERE codigo = 'CONTADO 10';
UPDATE public.formas_pago SET cod_forma = '02' WHERE codigo = 'CONTADO 12';
UPDATE public.formas_pago SET cod_forma = '03' WHERE codigo = 'CREDITO RETANQUEO';
UPDATE public.formas_pago SET cod_forma = 'FS10' WHERE codigo = 'PLAN FINANSUEÑOS 10 MESES';
UPDATE public.formas_pago SET cod_forma = 'FS12' WHERE codigo = 'PLAN FINANSUEÑOS 12 MESES';
UPDATE public.formas_pago SET cod_forma = 'FS15' WHERE codigo = 'PLAN FINANSUEÑOS 15 MESES';
UPDATE public.formas_pago SET cod_forma = 'FS18' WHERE codigo = 'PLAN FINANSUEÑOS 18 MESES';
UPDATE public.formas_pago SET cod_forma = 'PN110' WHERE codigo = 'A 6 CUOTAS IGUALES 30% INCREMENTO - BASE CREDITO';
UPDATE public.formas_pago SET cod_forma = 'PN115' WHERE codigo = 'A 4 CUOTAS + INCREMENTO 15%';
UPDATE public.formas_pago SET cod_forma = 'PN117' WHERE codigo = 'A 5 CUOTAS + INCREMENTO 20%';
UPDATE public.formas_pago SET cod_forma = 'PE01' WHERE codigo = 'CREDITO ENTIDADES';
UPDATE public.formas_pago SET cod_forma = '01' WHERE codigo = 'CREDITO ARPESOD';
