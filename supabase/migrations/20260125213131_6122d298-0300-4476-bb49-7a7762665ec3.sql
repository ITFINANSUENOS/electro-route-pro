-- Create table to track monthly sales period status
CREATE TABLE public.periodos_ventas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
  fecha_cierre TIMESTAMP WITH TIME ZONE,
  cerrado_por UUID,
  registros_totales INTEGER DEFAULT 0,
  monto_total NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(anio, mes)
);

-- Enable Row Level Security
ALTER TABLE public.periodos_ventas ENABLE ROW LEVEL SECURITY;

-- Create policies for periodos_ventas
CREATE POLICY "Leaders can view periods" 
ON public.periodos_ventas 
FOR SELECT 
USING (
  has_role(auth.uid(), 'lider_zona'::app_role) OR 
  has_role(auth.uid(), 'coordinador_comercial'::app_role) OR 
  has_role(auth.uid(), 'administrativo'::app_role) OR 
  has_role(auth.uid(), 'administrador'::app_role)
);

CREATE POLICY "Leaders can insert periods" 
ON public.periodos_ventas 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'lider_zona'::app_role) OR 
  has_role(auth.uid(), 'coordinador_comercial'::app_role) OR 
  has_role(auth.uid(), 'administrativo'::app_role) OR 
  has_role(auth.uid(), 'administrador'::app_role)
);

CREATE POLICY "Leaders can update periods" 
ON public.periodos_ventas 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'lider_zona'::app_role) OR 
  has_role(auth.uid(), 'coordinador_comercial'::app_role) OR 
  has_role(auth.uid(), 'administrativo'::app_role) OR 
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_periodos_ventas_updated_at
BEFORE UPDATE ON public.periodos_ventas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert January 2026 as an open period
INSERT INTO public.periodos_ventas (anio, mes, estado) VALUES (2026, 1, 'abierto');