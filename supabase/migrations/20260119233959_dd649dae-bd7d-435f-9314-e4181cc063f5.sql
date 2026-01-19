-- Fix security warnings

-- 1. Set search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Replace permissive RLS policy for historial_ediciones
DROP POLICY IF EXISTS "System can insert history" ON public.historial_ediciones;

CREATE POLICY "Authenticated users can insert history"
  ON public.historial_ediciones FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Add policies for admins to manage all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'administrador') OR 
    auth.uid() = user_id
  );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'administrador'));

-- 4. Leaders can also view team profiles
CREATE POLICY "Leaders can view team profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'jefe_ventas') OR
    public.has_role(auth.uid(), 'lider_zona') OR
    public.has_role(auth.uid(), 'coordinador_comercial')
  );