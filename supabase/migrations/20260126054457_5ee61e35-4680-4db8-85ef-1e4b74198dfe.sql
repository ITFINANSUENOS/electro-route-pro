-- Update count_regional_advisors to exclude GERENCIA (code 00001) from advisor count
CREATE OR REPLACE FUNCTION public.count_regional_advisors(p_regional_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::integer
  FROM public.profiles
  WHERE regional_id = p_regional_id
    AND activo = true
    AND codigo_asesor != '00001'
$function$;

-- Update get_top_regional_sales to exclude GERENCIA from top advisor calculation
-- (GERENCIA sales count toward totals but shouldn't be "top advisor")
CREATE OR REPLACE FUNCTION public.get_top_regional_sales(p_regional_id uuid, p_start_date date, p_end_date date)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(MAX(advisor_total), 0)
  FROM (
    SELECT v.codigo_asesor, SUM(ABS(v.vtas_ant_i)) as advisor_total
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

-- Update get_advisor_regional_position to exclude GERENCIA from ranking
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
      SELECT v.codigo_asesor, SUM(ABS(v.vtas_ant_i)) as total_sales
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