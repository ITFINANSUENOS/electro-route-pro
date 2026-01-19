-- =============================================
-- SISTEMA E-COM - Base de Datos Principal
-- =============================================

-- 1. ENUM para roles del sistema
CREATE TYPE public.app_role AS ENUM (
  'asesor_comercial',
  'jefe_ventas',
  'lider_zona',
  'coordinador_comercial',
  'administrativo',
  'administrador'
);

-- 2. ENUM para tipos de actividad
CREATE TYPE public.activity_type AS ENUM (
  'punto',
  'correria',
  'libre'
);

-- 3. ENUM para zonas
CREATE TYPE public.zone_type AS ENUM (
  'norte',
  'sur',
  'centro',
  'oriente'
);

-- =============================================
-- TABLA: profiles (datos de usuarios)
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  cedula TEXT NOT NULL UNIQUE,
  nombre_completo TEXT NOT NULL,
  telefono TEXT,
  zona zone_type,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Índices
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_cedula ON public.profiles(cedula);
CREATE INDEX idx_profiles_zona ON public.profiles(zona);

-- RLS para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- TABLA: user_roles (roles separados - SEGURIDAD)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- RLS para user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Función segura para verificar roles (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Función para obtener el rol de un usuario
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Los usuarios pueden ver su propio rol
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Solo admins pueden gestionar roles (usando función segura)
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'administrador'));

-- =============================================
-- TABLA: programacion (planificación de actividades)
-- =============================================
CREATE TABLE public.programacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fecha DATE NOT NULL,
  tipo_actividad activity_type NOT NULL,
  municipio TEXT NOT NULL,
  latitud DECIMAL(10, 8),
  longitud DECIMAL(11, 8),
  hora_inicio TIME,
  hora_fin TIME,
  creado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_programacion_user_id ON public.programacion(user_id);
CREATE INDEX idx_programacion_fecha ON public.programacion(fecha);

ALTER TABLE public.programacion ENABLE ROW LEVEL SECURITY;

-- Asesores ven su propia programación
CREATE POLICY "Users can view their own schedule"
  ON public.programacion FOR SELECT
  USING (auth.uid() = user_id);

-- Líderes y superiores pueden ver todo
CREATE POLICY "Leaders can view all schedules"
  ON public.programacion FOR SELECT
  USING (
    public.has_role(auth.uid(), 'lider_zona') OR
    public.has_role(auth.uid(), 'coordinador_comercial') OR
    public.has_role(auth.uid(), 'administrador')
  );

-- Líderes y superiores pueden crear/editar programación
CREATE POLICY "Leaders can manage schedules"
  ON public.programacion FOR ALL
  USING (
    public.has_role(auth.uid(), 'lider_zona') OR
    public.has_role(auth.uid(), 'coordinador_comercial') OR
    public.has_role(auth.uid(), 'administrador')
  );

-- =============================================
-- TABLA: reportes_diarios (evidencias de actividad)
-- =============================================
CREATE TABLE public.reportes_diarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  foto_url TEXT,
  gps_latitud DECIMAL(10, 8),
  gps_longitud DECIMAL(11, 8),
  consultas INTEGER DEFAULT 0,
  solicitudes INTEGER DEFAULT 0,
  notas TEXT,
  hora_registro TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_reportes_user_id ON public.reportes_diarios(user_id);
CREATE INDEX idx_reportes_fecha ON public.reportes_diarios(fecha);
CREATE UNIQUE INDEX idx_reportes_user_fecha ON public.reportes_diarios(user_id, fecha);

ALTER TABLE public.reportes_diarios ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver y crear sus propios reportes
CREATE POLICY "Users can view their own reports"
  ON public.reportes_diarios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports"
  ON public.reportes_diarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Líderes pueden ver todos los reportes
CREATE POLICY "Leaders can view all reports"
  ON public.reportes_diarios FOR SELECT
  USING (
    public.has_role(auth.uid(), 'jefe_ventas') OR
    public.has_role(auth.uid(), 'lider_zona') OR
    public.has_role(auth.uid(), 'coordinador_comercial') OR
    public.has_role(auth.uid(), 'administrador')
  );

-- =============================================
-- TABLA: ventas (datos cargados de CSV)
-- =============================================
CREATE TABLE public.ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  codigo_asesor TEXT NOT NULL,
  fecha DATE NOT NULL,
  valor_venta DECIMAL(15, 2) NOT NULL,
  producto TEXT,
  forma_pago TEXT,
  zona zone_type,
  tipo_cliente TEXT,
  celular_cliente TEXT,
  regional TEXT,
  cargado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_ventas_user_id ON public.ventas(user_id);
CREATE INDEX idx_ventas_codigo ON public.ventas(codigo_asesor);
CREATE INDEX idx_ventas_fecha ON public.ventas(fecha);

ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

-- Asesores ven solo sus ventas
CREATE POLICY "Users can view their own sales"
  ON public.ventas FOR SELECT
  USING (auth.uid() = user_id);

-- Líderes pueden ver y gestionar ventas
CREATE POLICY "Leaders can view all sales"
  ON public.ventas FOR SELECT
  USING (
    public.has_role(auth.uid(), 'jefe_ventas') OR
    public.has_role(auth.uid(), 'lider_zona') OR
    public.has_role(auth.uid(), 'coordinador_comercial') OR
    public.has_role(auth.uid(), 'administrativo') OR
    public.has_role(auth.uid(), 'administrador')
  );

CREATE POLICY "Leaders can insert sales"
  ON public.ventas FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'lider_zona') OR
    public.has_role(auth.uid(), 'coordinador_comercial') OR
    public.has_role(auth.uid(), 'administrativo') OR
    public.has_role(auth.uid(), 'administrador')
  );

-- =============================================
-- TABLA: metas (metas mensuales por asesor)
-- =============================================
CREATE TABLE public.metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo_asesor TEXT NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INTEGER NOT NULL,
  valor_meta DECIMAL(15, 2) NOT NULL,
  tipo_meta TEXT DEFAULT 'ventas',
  cargado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (codigo_asesor, mes, anio, tipo_meta)
);

CREATE INDEX idx_metas_user_id ON public.metas(user_id);
CREATE INDEX idx_metas_codigo ON public.metas(codigo_asesor);
CREATE INDEX idx_metas_periodo ON public.metas(anio, mes);

ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
  ON public.metas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Leaders can view all goals"
  ON public.metas FOR SELECT
  USING (
    public.has_role(auth.uid(), 'jefe_ventas') OR
    public.has_role(auth.uid(), 'lider_zona') OR
    public.has_role(auth.uid(), 'coordinador_comercial') OR
    public.has_role(auth.uid(), 'administrador')
  );

CREATE POLICY "Leaders can manage goals"
  ON public.metas FOR ALL
  USING (
    public.has_role(auth.uid(), 'lider_zona') OR
    public.has_role(auth.uid(), 'coordinador_comercial') OR
    public.has_role(auth.uid(), 'administrador')
  );

-- =============================================
-- TABLA: historial_ediciones (auditoría)
-- =============================================
CREATE TABLE public.historial_ediciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla TEXT NOT NULL,
  registro_id UUID NOT NULL,
  campo_editado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  modificado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_historial_registro ON public.historial_ediciones(registro_id);
CREATE INDEX idx_historial_fecha ON public.historial_ediciones(created_at);

ALTER TABLE public.historial_ediciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders can view history"
  ON public.historial_ediciones FOR SELECT
  USING (
    public.has_role(auth.uid(), 'lider_zona') OR
    public.has_role(auth.uid(), 'coordinador_comercial') OR
    public.has_role(auth.uid(), 'administrador')
  );

CREATE POLICY "System can insert history"
  ON public.historial_ediciones FOR INSERT
  WITH CHECK (true);

-- =============================================
-- TABLA: carga_archivos (registro de cargas CSV)
-- =============================================
CREATE TABLE public.carga_archivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_archivo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('ventas', 'metas')),
  registros_procesados INTEGER DEFAULT 0,
  estado TEXT DEFAULT 'procesando' CHECK (estado IN ('procesando', 'completado', 'error')),
  mensaje_error TEXT,
  cargado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_carga_tipo ON public.carga_archivos(tipo);

ALTER TABLE public.carga_archivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders can view uploads"
  ON public.carga_archivos FOR SELECT
  USING (
    public.has_role(auth.uid(), 'lider_zona') OR
    public.has_role(auth.uid(), 'coordinador_comercial') OR
    public.has_role(auth.uid(), 'administrativo') OR
    public.has_role(auth.uid(), 'administrador')
  );

CREATE POLICY "Leaders can insert uploads"
  ON public.carga_archivos FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'lider_zona') OR
    public.has_role(auth.uid(), 'coordinador_comercial') OR
    public.has_role(auth.uid(), 'administrativo') OR
    public.has_role(auth.uid(), 'administrador')
  );

-- =============================================
-- TRIGGER: Actualizar updated_at automáticamente
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_programacion_updated_at
  BEFORE UPDATE ON public.programacion
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metas_updated_at
  BEFORE UPDATE ON public.metas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- VISTA: Perfiles completos con rol (para el sistema)
-- =============================================
CREATE OR REPLACE VIEW public.profiles_with_roles
WITH (security_invoker = on) AS
SELECT 
  p.*,
  ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id;