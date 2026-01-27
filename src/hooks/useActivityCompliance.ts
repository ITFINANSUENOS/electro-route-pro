import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface AdvisorComplianceIssue {
  user_id: string;
  user_name: string;
  fecha: string;
  activity_name: string | null;
  tipo_actividad: string;
  municipio: string;
  issue_type: 'missing_evidence' | 'missing_photo' | 'missing_gps' | 'missing_consultas';
  issue_label: string;
}

export interface ComplianceStats {
  total_scheduled: number;
  with_evidence: number;
  missing_evidence: number;
  compliance_rate: number;
}

export interface AdvisorComplianceSummary {
  user_id: string;
  user_name: string;
  total_activities: number;
  completed_activities: number;
  missing_activities: number;
  compliance_rate: number;
  issues: AdvisorComplianceIssue[];
}

export function useActivityCompliance(month?: Date) {
  const { user, role, profile } = useAuth();
  const targetMonth = month || new Date();
  const monthStart = format(startOfMonth(targetMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(targetMonth), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['activity-compliance', role, profile?.regional_id, (profile as any)?.codigo_jefe, monthStart],
    queryFn: async () => {
      // Fetch all programmed activities for the month
      const { data: programacion, error: progError } = await supabase
        .from('programacion')
        .select('*')
        .gte('fecha', monthStart)
        .lte('fecha', monthEnd)
        .lte('fecha', format(new Date(), 'yyyy-MM-dd')); // Only past or today

      if (progError) throw progError;

      // Fetch all reports for the month
      const { data: reportes, error: repError } = await supabase
        .from('reportes_diarios')
        .select('*')
        .gte('fecha', monthStart)
        .lte('fecha', monthEnd);

      if (repError) throw repError;

      // Fetch profiles for names
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('user_id, nombre_completo, regional_id, codigo_jefe')
        .eq('activo', true);

      if (profError) throw profError;

      // Filter programacion based on role
      let filteredProgramacion = programacion || [];
      
      if (role === 'asesor_comercial' && user?.id) {
        filteredProgramacion = filteredProgramacion.filter(p => p.user_id === user.id);
      } else if (role === 'jefe_ventas') {
        const jefeCode = (profile as any)?.codigo_jefe;
        if (jefeCode) {
          const teamUserIds = new Set(
            profiles?.filter(p => p.codigo_jefe === jefeCode).map(p => p.user_id) || []
          );
          teamUserIds.add(user?.id || '');
          filteredProgramacion = filteredProgramacion.filter(p => teamUserIds.has(p.user_id));
        }
      } else if (role === 'lider_zona' && profile?.regional_id) {
        const regionalUserIds = new Set(
          profiles?.filter(p => p.regional_id === profile.regional_id).map(p => p.user_id) || []
        );
        filteredProgramacion = filteredProgramacion.filter(p => regionalUserIds.has(p.user_id));
      }

      // Create lookup maps
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p.nombre_completo]) || []);
      const reportesMap = new Map(
        (reportes || []).map(r => [`${r.user_id}-${r.fecha}`, r])
      );

      // Analyze compliance issues
      const issues: AdvisorComplianceIssue[] = [];
      const advisorStats = new Map<string, {
        total: number;
        completed: number;
        issues: AdvisorComplianceIssue[];
      }>();

      for (const prog of filteredProgramacion) {
        const key = `${prog.user_id}-${prog.fecha}`;
        const report = reportesMap.get(key);
        const userName = profilesMap.get(prog.user_id) || 'Desconocido';
        const isCorreria = prog.tipo_actividad === 'correria';

        // Initialize advisor stats
        if (!advisorStats.has(prog.user_id)) {
          advisorStats.set(prog.user_id, { total: 0, completed: 0, issues: [] });
        }
        const stats = advisorStats.get(prog.user_id)!;
        stats.total++;

        // Check evidence requirements
        const hasPhoto = !!report?.foto_url;
        const hasGps = report?.gps_latitud != null && report?.gps_longitud != null;
        
        // For correria: need both photo and GPS
        // For punto: only need GPS
        const hasEvidence = isCorreria ? (hasPhoto && hasGps) : hasGps;

        if (!hasEvidence) {
          const issueList: AdvisorComplianceIssue[] = [];

          if (!report) {
            issueList.push({
              user_id: prog.user_id,
              user_name: userName,
              fecha: prog.fecha,
              activity_name: prog.nombre,
              tipo_actividad: prog.tipo_actividad,
              municipio: prog.municipio,
              issue_type: 'missing_evidence',
              issue_label: 'Sin reporte',
            });
          } else {
            if (isCorreria && !hasPhoto) {
              issueList.push({
                user_id: prog.user_id,
                user_name: userName,
                fecha: prog.fecha,
                activity_name: prog.nombre,
                tipo_actividad: prog.tipo_actividad,
                municipio: prog.municipio,
                issue_type: 'missing_photo',
                issue_label: 'Falta foto',
              });
            }
            if (!hasGps) {
              issueList.push({
                user_id: prog.user_id,
                user_name: userName,
                fecha: prog.fecha,
                activity_name: prog.nombre,
                tipo_actividad: prog.tipo_actividad,
                municipio: prog.municipio,
                issue_type: 'missing_gps',
                issue_label: 'Falta ubicación',
              });
            }
          }

          issues.push(...issueList);
          stats.issues.push(...issueList);
        } else {
          stats.completed++;
        }
      }

      // Build advisor summaries
      const advisorSummaries: AdvisorComplianceSummary[] = [];
      for (const [userId, stats] of advisorStats) {
        if (stats.issues.length > 0) {
          advisorSummaries.push({
            user_id: userId,
            user_name: profilesMap.get(userId) || 'Desconocido',
            total_activities: stats.total,
            completed_activities: stats.completed,
            missing_activities: stats.total - stats.completed,
            compliance_rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
            issues: stats.issues,
          });
        }
      }

      // Sort by most issues first
      advisorSummaries.sort((a, b) => b.missing_activities - a.missing_activities);

      // Overall stats
      const totalScheduled = filteredProgramacion.length;
      const withEvidence = filteredProgramacion.reduce((count, prog) => {
        const key = `${prog.user_id}-${prog.fecha}`;
        const report = reportesMap.get(key);
        const isCorreria = prog.tipo_actividad === 'correria';
        const hasPhoto = !!report?.foto_url;
        const hasGps = report?.gps_latitud != null && report?.gps_longitud != null;
        const hasEvidence = isCorreria ? (hasPhoto && hasGps) : hasGps;
        return count + (hasEvidence ? 1 : 0);
      }, 0);

      const overallStats: ComplianceStats = {
        total_scheduled: totalScheduled,
        with_evidence: withEvidence,
        missing_evidence: totalScheduled - withEvidence,
        compliance_rate: totalScheduled > 0 ? Math.round((withEvidence / totalScheduled) * 100) : 100,
      };

      return {
        issues,
        advisorSummaries,
        overallStats,
      };
    },
    enabled: !!user?.id,
  });

  return {
    issues: data?.issues || [],
    advisorSummaries: data?.advisorSummaries || [],
    overallStats: data?.overallStats || { total_scheduled: 0, with_evidence: 0, missing_evidence: 0, compliance_rate: 100 },
    isLoading,
  };
}
