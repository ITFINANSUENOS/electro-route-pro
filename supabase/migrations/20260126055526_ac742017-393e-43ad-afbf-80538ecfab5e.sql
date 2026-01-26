
-- Fix: Remove ABS() - sales already have correct sign (negative for returns)
-- Also create group ranking functions

-- Fix get_top_regional_sales - remove ABS
CREATE OR REPLACE FUNCTION public.get_top_regional_sales(p_regional_id uuid, p_start_date date, p_end_date date)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(MAX(advisor_total), 0)
  FROM (
    SELECT v.codigo_asesor, SUM(v.vtas_ant_i) as advisor_total
    FROM public.ventas v
    INNER JOIN public.profiles p ON p.codigo_asesor = v.codigo_asesor
    WHERE p.regional_id = p_regional_id
      AND p.activo = true
      AND p.codigo_asesor != '00001'
      AND v.fecha >= p_start_date
      AND v.fecha <= p_end_date
      AND v.tipo_venta != 'OTROS'
    GROUP BY v.codigo_asesor
  ) as sales_by_advisor
$function$;

-- Fix get_advisor_regional_position - remove ABS
CREATE OR REPLACE FUNCTION public.get_advisor_regional_position(p_codigo_asesor text, p_regional_id uuid, p_start_date date, p_end_date date)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(position, 0)::integer
  FROM (
    SELECT 
      codigo_asesor,
      ROW_NUMBER() OVER (ORDER BY total_sales DESC) as position
    FROM (
      SELECT v.codigo_asesor, SUM(v.vtas_ant_i) as total_sales
      FROM public.ventas v
      INNER JOIN public.profiles p ON p.codigo_asesor = v.codigo_asesor
      WHERE p.regional_id = p_regional_id
        AND p.activo = true
        AND p.codigo_asesor != '00001'
        AND v.fecha >= p_start_date
        AND v.fecha <= p_end_date
        AND v.tipo_venta != 'OTROS'
      GROUP BY v.codigo_asesor
    ) as sales
  ) as ranked
  WHERE codigo_asesor = p_codigo_asesor
$function$;

-- NEW: Count advisors in a sales group (by codigo_jefe)
CREATE OR REPLACE FUNCTION public.count_group_advisors(p_codigo_jefe text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::integer
  FROM public.profiles
  WHERE codigo_jefe = p_codigo_jefe
    AND activo = true
    AND codigo_asesor IS NOT NULL
    AND codigo_asesor != '00001'
$function$;

-- NEW: Get advisor's position within their sales group
CREATE OR REPLACE FUNCTION public.get_advisor_group_position(p_codigo_asesor text, p_codigo_jefe text, p_start_date date, p_end_date date)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(position, 0)::integer
  FROM (
    SELECT 
      codigo_asesor,
      ROW_NUMBER() OVER (ORDER BY total_sales DESC) as position
    FROM (
      SELECT p.codigo_asesor, COALESCE(SUM(v.vtas_ant_i), 0) as total_sales
      FROM public.profiles p
      LEFT JOIN public.ventas v ON p.codigo_asesor = v.codigo_asesor
        AND v.fecha >= p_start_date
        AND v.fecha <= p_end_date
        AND v.tipo_venta != 'OTROS'
      WHERE p.codigo_jefe = p_codigo_jefe
        AND p.activo = true
        AND p.codigo_asesor IS NOT NULL
        AND p.codigo_asesor != '00001'
      GROUP BY p.codigo_asesor
    ) as sales
  ) as ranked
  WHERE codigo_asesor = p_codigo_asesor
$function$;
