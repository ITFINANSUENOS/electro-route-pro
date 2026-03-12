
-- Close ALL periods that are not the current month (March 2026) and are still 'abierto'
UPDATE public.periodos_ventas
SET estado = 'cerrado',
    fecha_cierre = COALESCE(fecha_cierre, now()),
    updated_at = now()
WHERE estado = 'abierto'
  AND NOT (anio = EXTRACT(YEAR FROM CURRENT_DATE)::int AND mes = EXTRACT(MONTH FROM CURRENT_DATE)::int);

-- Log the migration
INSERT INTO public.historial_migraciones (tabla_afectada, campo_afectado, valor_anterior, valor_nuevo, descripcion, registros_afectados)
VALUES ('periodos_ventas', 'estado', 'abierto', 'cerrado', 'Auto-cierre de todos los períodos pasados que estaban abiertos (solo el mes en curso debe estar activo)', 
  (SELECT COUNT(*) FROM public.periodos_ventas WHERE estado = 'abierto' AND NOT (anio = EXTRACT(YEAR FROM CURRENT_DATE)::int AND mes = EXTRACT(MONTH FROM CURRENT_DATE)::int)));
