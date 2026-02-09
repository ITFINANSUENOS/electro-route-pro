import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { dataService } from '@/services';
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

// Get today's date in local timezone for Colombia
function getTodayLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useTodayActivity() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const today = getTodayLocal();

  const isAsesorComercial = role === 'asesor_comercial';

  const { data: todayAssignment, isLoading: loadingAssignment, error: assignmentError } = useQuery({
    queryKey: ['today-assignment', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return null;
      
      console.log('Fetching assignment for user:', user.id, 'date:', today);
      
      const { data, error } = await (dataService
        .from('programacion')
        .select('*')
        .eq('user_id', user.id)
        .eq('fecha', today)
        .maybeSingle() as any);

      if (error) {
        console.error('Error fetching assignment:', error);
        throw error;
      }
      
      console.log('Assignment result:', data);
      return data as TodayAssignment | null;
    },
    enabled: !!user?.id,
  });

  const { data: todayReport, isLoading: loadingReport, refetch: refetchReport } = useQuery({
    queryKey: ['today-report', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await (dataService
        .from('reportes_diarios')
        .select('*')
        .eq('user_id', user.id)
        .eq('fecha', today)
        .maybeSingle() as any);

      if (error) throw error;
      return data as TodayReport | null;
    },
    enabled: !!user?.id,
  });

  const hasEvidenceSubmitted = todayReport?.evidencia_completa === true;
  const hasConsultasSubmitted = isAsesorComercial && !!todayReport && 
    (todayReport.consultas !== null || todayReport.solicitudes !== null);
  const isFreeUser = !todayAssignment;
  const hasScheduledActivity = !!todayAssignment;

  const submitEvidence = useMutation({
    mutationFn: async (data: {
      photoUrl: string;
      latitude: number;
      longitude: number;
      notas?: string;
    }) => {
      if (!user?.id) throw new Error('No user');

      if (todayReport) {
        const { error } = await (dataService
          .from('reportes_diarios')
          .update({
            foto_url: data.photoUrl,
            gps_latitud: data.latitude,
            gps_longitud: data.longitude,
            notas: data.notas || todayReport.notas,
            evidencia_completa: true,
            estado_evidencia: 'completa',
          })
          .eq('id', todayReport.id) as any);

        if (error) throw error;
      } else {
        const { error } = await (dataService
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
          }) as any);

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

  const submitConsultas = useMutation({
    mutationFn: async (data: {
      consultas: number;
      solicitudes: number;
    }) => {
      if (!user?.id) throw new Error('No user');

      if (todayReport) {
        const { error } = await (dataService
          .from('reportes_diarios')
          .update({
            consultas: data.consultas,
            solicitudes: data.solicitudes,
          })
          .eq('id', todayReport.id) as any);

        if (error) throw error;
      } else {
        const { error } = await (dataService
          .from('reportes_diarios')
          .insert({
            user_id: user.id,
            fecha: today,
            hora_registro: new Date().toISOString(),
            consultas: data.consultas,
            solicitudes: data.solicitudes,
            evidencia_completa: false,
            estado_evidencia: isFreeUser ? 'libre' : 'pendiente',
          }) as any);

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
    isAsesorComercial,
    submitEvidence,
    submitConsultas,
    refetchReport,
  };
}
