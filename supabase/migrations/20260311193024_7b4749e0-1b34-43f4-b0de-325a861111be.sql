UPDATE public.periodos_ventas 
SET estado = 'cerrado', 
    fecha_cierre = now(), 
    registros_totales = 3555, 
    monto_total = 3960844606.84
WHERE mes = 2 AND anio = 2026 AND estado = 'abierto';