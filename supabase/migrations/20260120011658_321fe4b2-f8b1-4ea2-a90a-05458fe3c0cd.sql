-- =============================================
-- ACTUALIZACIÓN DE ESQUEMA E-COM
-- Paso 1: Eliminar vista y tipo dependientes
-- =============================================

-- Primero eliminar la vista que depende de zona
DROP VIEW IF EXISTS public.profiles_with_roles;

-- Ahora cambiar el tipo de zona a TEXT
ALTER TABLE public.profiles ALTER COLUMN zona TYPE TEXT USING zona::TEXT;
ALTER TABLE public.ventas ALTER COLUMN zona TYPE TEXT USING zona::TEXT;

-- Eliminar el tipo enum
DROP TYPE IF EXISTS public.zone_type CASCADE;

-- 2. Crear tabla de regionales (catálogo)
CREATE TABLE public.regionales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo INTEGER NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  zona TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Insertar regionales según BD ASESORES
INSERT INTO public.regionales (codigo, nombre, zona) VALUES
  (101, 'POPAYAN', 'norte'),
  (102, 'EL BORDO', 'norte'),
  (103, 'SANTANDER', 'norte'),
  (104, 'AMBIENTA', 'norte'),
  (201, 'CALI', 'norte'),
  (301, 'PASTO', 'sur'),
  (303, 'TUQUERRES', 'sur'),
  (701, 'HUILA', 'sur');

-- RLS para regionales
ALTER TABLE public.regionales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view regionales"
  ON public.regionales FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage regionales"
  ON public.regionales FOR ALL
  USING (public.has_role(auth.uid(), 'administrador'));

-- 3. Crear tabla de formas de pago
CREATE TABLE public.formas_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  tipo_venta TEXT NOT NULL CHECK (tipo_venta IN ('CONTADO', 'CREDICONTADO', 'CREDITO', 'CONVENIO')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

INSERT INTO public.formas_pago (codigo, nombre, tipo_venta) VALUES
  ('01', 'CONTADO 10', 'CONTADO'),
  ('02', 'CONTADO 12', 'CONTADO'),
  ('03', 'CONTADO 14', 'CONTADO'),
  ('PA01', 'PLAN ADDI', 'CREDICONTADO'),
  ('PN110', 'A 6 CUOTAS IGUALES 30% INCREMENTO', 'CREDICONTADO'),
  ('FS15', 'PLAN FINANSUEÑOS 15 MESES', 'CREDITO'),
  ('PB01', 'PLAN BRILLA', 'CONVENIO');

ALTER TABLE public.formas_pago ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view formas_pago"
  ON public.formas_pago FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage formas_pago"
  ON public.formas_pago FOR ALL
  USING (public.has_role(auth.uid(), 'administrador'));

-- 4. Agregar campos a profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS codigo_asesor TEXT,
  ADD COLUMN IF NOT EXISTS codigo_jefe TEXT,
  ADD COLUMN IF NOT EXISTS tipo_asesor TEXT CHECK (tipo_asesor IN ('INTERNO', 'EXTERNO')),
  ADD COLUMN IF NOT EXISTS regional_id UUID REFERENCES public.regionales(id),
  ADD COLUMN IF NOT EXISTS ccosto_asesor TEXT,
  ADD COLUMN IF NOT EXISTS correo TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_codigo_asesor ON public.profiles(codigo_asesor);
CREATE INDEX IF NOT EXISTS idx_profiles_regional ON public.profiles(regional_id);

-- 5. Recrear tabla ventas
DROP TABLE IF EXISTS public.ventas CASCADE;

CREATE TABLE public.ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cargado_por UUID REFERENCES auth.users(id),
  carga_id UUID REFERENCES public.carga_archivos(id),
  
  tipo_documento TEXT,
  tipo_docum TEXT,
  numero_doc TEXT,
  fecha DATE NOT NULL,
  
  cod_region INTEGER,
  sede TEXT,
  codigo_cco TEXT,
  nombre_cco TEXT,
  
  cliente_identificacion TEXT,
  cliente_nombre TEXT,
  cliente_telefono TEXT,
  cliente_direccion TEXT,
  cliente_email TEXT,
  
  destino TEXT,
  destino_nombre TEXT,
  cod_forma_pago TEXT,
  forma1_pago TEXT,
  forma_pago TEXT,
  tipo_venta TEXT CHECK (tipo_venta IN ('CONTADO', 'CREDICONTADO', 'CREDITO', 'CONVENIO')),
  
  cedula_asesor TEXT,
  codigo_asesor TEXT NOT NULL,
  asesor_nombre TEXT,
  
  codigo_jefe TEXT,
  jefe_ventas TEXT,
  
  codigo_ean TEXT,
  producto TEXT,
  referencia TEXT,
  nombre_corto TEXT,
  categoria TEXT,
  cod_marca TEXT,
  marca TEXT,
  cod_linea TEXT,
  linea TEXT,
  lote TEXT,
  serial TEXT,
  
  mcn_clase TEXT CHECK (mcn_clase IN ('FV00', 'DV00')),
  
  subtotal DECIMAL(15, 2) DEFAULT 0,
  iva DECIMAL(15, 2) DEFAULT 0,
  total DECIMAL(15, 2) DEFAULT 0,
  vtas_ant_i DECIMAL(15, 2) NOT NULL,
  
  cantidad DECIMAL(10, 2) DEFAULT 1,
  motivo_dev TEXT,
  
  regional TEXT,
  zona TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_ventas_fecha ON public.ventas(fecha);
CREATE INDEX idx_ventas_codigo_asesor ON public.ventas(codigo_asesor);
CREATE INDEX idx_ventas_cod_region ON public.ventas(cod_region);
CREATE INDEX idx_ventas_tipo_venta ON public.ventas(tipo_venta);
CREATE INDEX idx_ventas_mcn_clase ON public.ventas(mcn_clase);
CREATE INDEX idx_ventas_carga_id ON public.ventas(carga_id);
CREATE INDEX idx_ventas_user_id ON public.ventas(user_id);

ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sales"
  ON public.ventas FOR SELECT
  USING (auth.uid() = user_id);

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

-- 6. Tabla jefes de ventas
CREATE TABLE public.jefes_ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  cedula TEXT NOT NULL,
  nombre TEXT NOT NULL,
  telefono TEXT,
  correo TEXT,
  regional_id UUID REFERENCES public.regionales(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.jefes_ventas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view jefes"
  ON public.jefes_ventas FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage jefes"
  ON public.jefes_ventas FOR ALL
  USING (public.has_role(auth.uid(), 'administrador'));

-- 7. Tabla líderes de zona
CREATE TABLE public.lideres_zona (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  telefono TEXT,
  correo TEXT,
  zona TEXT,
  regional_id UUID REFERENCES public.regionales(id),
  user_id UUID REFERENCES auth.users(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.lideres_zona ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view lideres"
  ON public.lideres_zona FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage lideres"
  ON public.lideres_zona FOR ALL
  USING (public.has_role(auth.uid(), 'administrador'));

-- 8. Tabla coordinadores
CREATE TABLE public.coordinadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  telefono TEXT,
  correo TEXT,
  zona TEXT,
  user_id UUID REFERENCES auth.users(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.coordinadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view coordinadores"
  ON public.coordinadores FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage coordinadores"
  ON public.coordinadores FOR ALL
  USING (public.has_role(auth.uid(), 'administrador'));

-- 9. Recrear vista profiles_with_roles
CREATE OR REPLACE VIEW public.profiles_with_roles
WITH (security_invoker = on) AS
SELECT 
  p.id,
  p.user_id,
  p.cedula,
  p.nombre_completo,
  p.telefono,
  p.zona,
  p.activo,
  p.created_at,
  p.updated_at,
  p.codigo_asesor,
  p.codigo_jefe,
  p.tipo_asesor,
  p.regional_id,
  p.ccosto_asesor,
  p.correo,
  ur.role,
  r.nombre as regional_nombre,
  r.codigo as regional_codigo
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
LEFT JOIN public.regionales r ON p.regional_id = r.id;