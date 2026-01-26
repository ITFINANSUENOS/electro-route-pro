-- Allow users to update their own reports (for updating consultas/solicitudes multiple times)
CREATE POLICY "Users can update their own reports"
ON public.reportes_diarios
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add column to track if evidence (photo+gps) was submitted (to prevent re-submission)
ALTER TABLE public.reportes_diarios 
ADD COLUMN IF NOT EXISTS evidencia_completa boolean DEFAULT false;

-- Add column to track activity status (completa, incompleta, pendiente)
ALTER TABLE public.reportes_diarios 
ADD COLUMN IF NOT EXISTS estado_evidencia text DEFAULT 'pendiente';