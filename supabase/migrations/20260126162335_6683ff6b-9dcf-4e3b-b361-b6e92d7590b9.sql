-- Create table to store average sale values for meta quantity calculation
CREATE TABLE public.config_metas_promedio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regional_id UUID REFERENCES public.regionales(id) ON DELETE CASCADE NOT NULL,
  tipo_asesor TEXT NOT NULL CHECK (tipo_asesor IN ('INTERNO', 'EXTERNO', 'CORRETAJE')),
  tipo_venta TEXT NOT NULL CHECK (tipo_venta IN ('CONTADO', 'CREDICONTADO', 'CREDITO', 'CONVENIO')),
  valor_promedio NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(regional_id, tipo_asesor, tipo_venta)
);

-- Create table to store percentage adjustments for quantity calculation
CREATE TABLE public.config_metas_porcentajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regional_id UUID REFERENCES public.regionales(id) ON DELETE CASCADE NOT NULL,
  porcentaje_aumento_1 NUMERIC NOT NULL DEFAULT 0,
  porcentaje_aumento_2 NUMERIC NOT NULL DEFAULT 0,
  porcentaje_aumento_3 NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(regional_id)
);

-- Enable RLS on both tables
ALTER TABLE public.config_metas_promedio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_metas_porcentajes ENABLE ROW LEVEL SECURITY;

-- RLS policies for config_metas_promedio
CREATE POLICY "Admins can manage config_metas_promedio"
ON public.config_metas_promedio
FOR ALL
USING (has_role(auth.uid(), 'administrador'));

CREATE POLICY "Leaders can view config_metas_promedio"
ON public.config_metas_promedio
FOR SELECT
USING (
  has_role(auth.uid(), 'lider_zona') OR 
  has_role(auth.uid(), 'coordinador_comercial') OR 
  has_role(auth.uid(), 'administrador')
);

-- RLS policies for config_metas_porcentajes
CREATE POLICY "Admins can manage config_metas_porcentajes"
ON public.config_metas_porcentajes
FOR ALL
USING (has_role(auth.uid(), 'administrador'));

CREATE POLICY "Leaders can view config_metas_porcentajes"
ON public.config_metas_porcentajes
FOR SELECT
USING (
  has_role(auth.uid(), 'lider_zona') OR 
  has_role(auth.uid(), 'coordinador_comercial') OR 
  has_role(auth.uid(), 'administrador')
);

-- Add triggers for updated_at
CREATE TRIGGER update_config_metas_promedio_updated_at
  BEFORE UPDATE ON public.config_metas_promedio
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_config_metas_porcentajes_updated_at
  BEFORE UPDATE ON public.config_metas_porcentajes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();