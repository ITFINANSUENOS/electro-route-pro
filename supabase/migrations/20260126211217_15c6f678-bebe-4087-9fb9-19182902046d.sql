-- Fix SECURITY DEFINER functions to include permission checks
-- This prevents cross-regional data access by unauthorized users

-- 1. Fix count_regional_advisors - add permission check
CREATE OR REPLACE FUNCTION public.count_regional_advisors(p_regional_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Leadership roles can access any regional data
    WHEN EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('lider_zona', 'coordinador_comercial', 'administrativo', 'administrador')
    ) THEN (
      SELECT COUNT(*)::integer
      FROM public.profiles
      WHERE regional_id = p_regional_id
        AND activo = true
        AND codigo_asesor != '00001'
    )
    -- Regular users can only access their own regional data
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND regional_id = p_regional_id
    ) THEN (
      SELECT COUNT(*)::integer
      FROM public.profiles
      WHERE regional_id = p_regional_id
        AND activo = true
        AND codigo_asesor != '00001'
    )
    ELSE 0
  END;
$$;

-- 2. Fix get_top_regional_sales - add permission check
CREATE OR REPLACE FUNCTION public.get_top_regional_sales(p_regional_id uuid, p_start_date date, p_end_date date)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Leadership roles can access any regional data
    WHEN EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('lider_zona', 'coordinador_comercial', 'administrativo', 'administrador')
    ) THEN (
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
    )
    -- Regular users can only access their own regional data
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND regional_id = p_regional_id
    ) THEN (
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
    )
    ELSE 0
  END;
$$;

-- 3. Fix get_advisor_regional_position - add permission check
CREATE OR REPLACE FUNCTION public.get_advisor_regional_position(p_codigo_asesor text, p_regional_id uuid, p_start_date date, p_end_date date)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Leadership roles can access any regional data
    WHEN EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('lider_zona', 'coordinador_comercial', 'administrativo', 'administrador')
    ) THEN (
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
    )
    -- Regular users can only access their own regional position
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND (regional_id = p_regional_id OR codigo_asesor = p_codigo_asesor)
    ) THEN (
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
    )
    ELSE 0
  END;
$$;

-- 4. Fix count_group_advisors - add permission check
CREATE OR REPLACE FUNCTION public.count_group_advisors(p_codigo_jefe text)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Leadership roles can access any group data
    WHEN EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('jefe_ventas', 'lider_zona', 'coordinador_comercial', 'administrativo', 'administrador')
    ) THEN (
      SELECT COUNT(*)::integer
      FROM public.profiles
      WHERE codigo_jefe = p_codigo_jefe
        AND activo = true
        AND codigo_asesor IS NOT NULL
        AND codigo_asesor != '00001'
    )
    -- Regular users can only access their own group data (same codigo_jefe)
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND codigo_jefe = p_codigo_jefe
    ) THEN (
      SELECT COUNT(*)::integer
      FROM public.profiles
      WHERE codigo_jefe = p_codigo_jefe
        AND activo = true
        AND codigo_asesor IS NOT NULL
        AND codigo_asesor != '00001'
    )
    ELSE 0
  END;
$$;

-- 5. Fix get_advisor_group_position - add permission check
CREATE OR REPLACE FUNCTION public.get_advisor_group_position(p_codigo_asesor text, p_codigo_jefe text, p_start_date date, p_end_date date)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Leadership roles can access any group data
    WHEN EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('jefe_ventas', 'lider_zona', 'coordinador_comercial', 'administrativo', 'administrador')
    ) THEN (
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
    )
    -- Regular users can only access their own group position
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND (codigo_jefe = p_codigo_jefe OR codigo_asesor = p_codigo_asesor)
    ) THEN (
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
    )
    ELSE 0
  END;
$$;