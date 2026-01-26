-- Eliminar el CHECK constraint que está bloqueando 'OTROS'
ALTER TABLE formas_pago DROP CONSTRAINT IF EXISTS formas_pago_tipo_venta_check;

-- Limpiar la tabla
DELETE FROM formas_pago;

-- Re-poblar según el CSV TIPOS_DE_VENTA.csv
INSERT INTO formas_pago (codigo, nombre, tipo_venta, activo) VALUES
-- CONTADO (según CSV)
('CONTADO 10', 'Contado 10 días', 'CONTADO', true),
('CONTADO 12', 'Contado 12 días', 'CONTADO', true),
('CONTADO 14', 'Contado 14 días', 'CONTADO', true),
('CONTADO 16', 'Contado 16 días', 'CONTADO', true),
('CREDITO ENTIDADES', 'Crédito Entidades', 'CONTADO', true),

-- CREDICONTADO (según CSV: ADDI, BRILLA, SISTECREDITO, cuotas con incrementos, obsequios)
('PLAN ADDI', 'Ventas ADDI', 'CREDICONTADO', true),
('PLAN BRILLA', 'Ventas Brilla', 'CREDICONTADO', true),
('PLAN SISTECREDITO', 'Ventas Sistecredito', 'CREDICONTADO', true),
('A 2 CUOTAS + INCREMENTO 5%', '2 Cuotas + 5% Incremento', 'CREDICONTADO', true),
('A 3 CUOTAS + INCREMENTO 10%', '3 Cuotas + 10% Incremento', 'CREDICONTADO', true),
('A 4 CUOTAS + INCREMENTO 15%', '4 Cuotas + 15% Incremento', 'CREDICONTADO', true),
('A 5 CUOTAS + INCREMENTO 20%', '5 Cuotas + 20% Incremento', 'CREDICONTADO', true),
('A 6 CUOTAS + INCREMENTO 25% - BASE CONTADO', '6 Cuotas + 25% Incremento Base Contado', 'CREDICONTADO', true),
('A 6 CUOTAS IGUALES 30% INCREMENTO - BASE CREDITO', '6 Cuotas Iguales 30% Incremento Base Crédito', 'CREDICONTADO', true),
('OBSEQUIOS CLIENTES', 'Obsequios Clientes', 'CREDICONTADO', true),

-- CREDITO (según CSV: FINANSUEÑOS 10,12,15,18 meses, ARPESOD, RETANQUEO)
('PLAN FINANSUEÑOS 10 MESES', 'Finansueños 10 Meses', 'CREDITO', true),
('PLAN FINANSUEÑOS 12 MESES', 'Finansueños 12 Meses', 'CREDITO', true),
('PLAN FINANSUEÑOS 15 MESES', 'Finansueños 15 Meses', 'CREDITO', true),
('PLAN FINANSUEÑOS 18 MESES', 'Finansueños 18 Meses', 'CREDITO', true),
('CREDITO ARPESOD', 'Crédito Arpesod', 'CREDITO', true),
('CREDITO RETANQUEO', 'Crédito Retanqueo', 'CREDITO', true),

-- NO APLICA/OTROS (según CSV: REBATE, ARRENDAMIENTOS, ACTIVOS FIJOS)
('REBATE PROVEEDORES', 'Rebate Proveedores', 'OTROS', true),
('ARRENDAMIENTOS', 'Arrendamientos', 'OTROS', true),
('CREDITO ACTIVOS FIJOS', 'Crédito Activos Fijos', 'OTROS', true);