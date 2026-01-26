import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

export interface TodayAssignment {
  id: string;
  user_id: string;
  fecha: string;
  tipo_actividad: 'punto' | 'correria' | 'libre';
  municipio: string;
  nombre: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
}

export interface TodayReport {
  id: string;
  user_id: string;
  fecha: string;
  hora_registro: string;
  consultas: number | null;
  solicitudes: number | null;
  foto_url: string | null;
  gps_latitud: number | null;
  gps_longitud: number | null;
  notas: string | null;
  evidencia_completa: boolean | null;
  estado_evidencia: string | null;
}

export function useTodayActivity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch today's assignment
  const { data: todayAssignment, isLoading: loadingAssignment } = useQuery({
    queryKey: ['today-assignment', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('programacion')
        .select('*')
        .eq('user_id', user.id)
        .eq('fecha', today)
        .maybeSingle();

      if (error) throw error;
      return data as TodayAssignment | null;
    },
    enabled: !!user?.id,
  });

  // Fetch today's report
  const { data: todayReport, isLoading: loadingReport, refetch: refetchReport } = useQuery({
    queryKey: ['today-report', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('reportes_diarios')
        .select('*')
        .eq('user_id', user.id)
        .eq('fecha', today)
        .maybeSingle();

      if (error) throw error;
      return data as TodayReport | null;
    },
    enabled: !!user?.id,
  });

  // Check if evidence was already submitted
  const hasEvidenceSubmitted = todayReport?.evidencia_completa === true;
  
  // Check if consultas/solicitudes were submitted today
  const hasConsultasSubmitted = !!todayReport && 
    (todayReport.consultas !== null || todayReport.solicitudes !== null);

  // Determine user status
  const isFreeUser = !todayAssignment; // No activity assigned = "libre"
  const hasScheduledActivity = !!todayAssignment;

  // Submit evidence mutation
  const submitEvidence = useMutation({
    mutationFn: async (data: {
      photoUrl: string;
      latitude: number;
      longitude: number;
      notas?: string;
    }) => {
      if (!user?.id) throw new Error('No user');

      if (todayReport) {
        // Update existing report with evidence
        const { error } = await supabase
          .from('reportes_diarios')
          .update({
            foto_url: data.photoUrl,
            gps_latitud: data.latitude,
            gps_longitud: data.longitude,
            notas: data.notas || todayReport.notas,
            evidencia_completa: true,
            estado_evidencia: 'completa',
          })
          .eq('id', todayReport.id);

        if (error) throw error;
      } else {
        // Create new report with evidence
        const { error } = await supabase
          .from('reportes_diarios')
          .insert({
            user_id: user.id,
            fecha: today,
            hora_registro: new Date().toISOString(),
            foto_url: data.photoUrl,
            gps_latitud: data.latitude,
            gps_longitud: data.longitude,
            notas: data.notas,
            evidencia_completa: true,
            estado_evidencia: 'completa',
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Evidencia registrada correctamente');
      refetchReport();
      queryClient.invalidateQueries({ queryKey: ['reportes-diarios-viewer'] });
    },
    onError: (error: Error) => {
      toast.error(`Error al registrar evidencia: ${error.message}`);
    },
  });

  // Submit/Update consultas mutation
  const submitConsultas = useMutation({
    mutationFn: async (data: {
      consultas: number;
      solicitudes: number;
    }) => {
      if (!user?.id) throw new Error('No user');

      if (todayReport) {
        // Update existing report
        const { error } = await supabase
          .from('reportes_diarios')
          .update({
            consultas: data.consultas,
            solicitudes: data.solicitudes,
          })
          .eq('id', todayReport.id);

        if (error) throw error;
      } else {
        // Create new report (for free users or first submission)
        const { error } = await supabase
          .from('reportes_diarios')
          .insert({
            user_id: user.id,
            fecha: today,
            hora_registro: new Date().toISOString(),
            consultas: data.consultas,
            solicitudes: data.solicitudes,
            evidencia_completa: false,
            estado_evidencia: isFreeUser ? 'libre' : 'pendiente',
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Consultas y solicitudes actualizadas');
      refetchReport();
      queryClient.invalidateQueries({ queryKey: ['reportes-diarios-viewer'] });
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  return {
    todayAssignment,
    todayReport,
    isLoading: loadingAssignment || loadingReport,
    hasEvidenceSubmitted,
    hasConsultasSubmitted,
    isFreeUser,
    hasScheduledActivity,
    submitEvidence,
    submitConsultas,
    refetchReport,
  };
}
