import { useQuery } from '@tanstack/react-query';
import { dataService } from '@/services';

export interface EvidenceStatus {
  user_id: string;
  user_name: string;
  has_evidence: boolean;
  has_photo: boolean;
  has_gps: boolean;
  has_consultas: boolean;
  consultas: number | null;
  solicitudes: number | null;
}

export interface ActivityEvidenceStatus {
  activity_key: string;
  fecha: string;
  tipo_actividad: string;
  total_assigned: number;
  with_evidence: number;
  evidence_by_user: EvidenceStatus[];
}

export function useActivityEvidenceStatus(
  activities: Array<{
    fecha: string;
    user_ids: string[];
    user_names: string[];
    tipo_actividad: string;
    key: string;
  }>,
  enabled = true
) {
  const dates = [...new Set(activities.map(a => a.fecha))];
  const allUserIds = [...new Set(activities.flatMap(a => a.user_ids))];

  const { data: evidenceData = [], isLoading } = useQuery({
    queryKey: ['activity-evidence-status', dates.join(','), allUserIds.join(',')],
    queryFn: async () => {
      if (dates.length === 0 || allUserIds.length === 0) return [];

      const { data, error } = await (dataService
        .from('reportes_diarios')
        .select('user_id, fecha, evidencia_completa, foto_url, gps_latitud, gps_longitud, consultas, solicitudes')
        .in('fecha', dates)
        .in('user_id', allUserIds) as any);

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && dates.length > 0 && allUserIds.length > 0,
  });

  // Build status map for each activity
  const statusByActivity: Record<string, ActivityEvidenceStatus> = {};

  activities.forEach(activity => {
    const evidenceByUser: EvidenceStatus[] = activity.user_ids.map((userId, idx) => {
      const report = evidenceData.find(
        (r: any) => r.user_id === userId && r.fecha === activity.fecha
      );

      const hasPhoto = !!report?.foto_url;
      const hasGps = report?.gps_latitud != null && report?.gps_longitud != null;
      const hasEvidence = activity.tipo_actividad === 'correria'
        ? hasPhoto && hasGps
        : hasGps;

      return {
        user_id: userId,
        user_name: activity.user_names[idx] || 'Desconocido',
        has_evidence: hasEvidence,
        has_photo: hasPhoto,
        has_gps: hasGps,
        has_consultas: report?.consultas != null || report?.solicitudes != null,
        consultas: report?.consultas ?? null,
        solicitudes: report?.solicitudes ?? null,
      };
    });

    const withEvidence = evidenceByUser.filter(e => e.has_evidence).length;

    statusByActivity[activity.key] = {
      activity_key: activity.key,
      fecha: activity.fecha,
      tipo_actividad: activity.tipo_actividad,
      total_assigned: activity.user_ids.length,
      with_evidence: withEvidence,
      evidence_by_user: evidenceByUser,
    };
  });

  return {
    statusByActivity,
    isLoading,
  };
}

export function isActivityForToday(fecha: string): boolean {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  return fecha === today;
}
