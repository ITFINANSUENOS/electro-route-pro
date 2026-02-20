import { useQuery } from '@tanstack/react-query';
import { dataService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { useConsultasConfig } from './useConsultasConfig';

export function useActivityNotification() {
  const { user, role } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const currentHour = new Date().getHours();
  const currentMinutes = new Date().getMinutes();
  const consultasConfig = useConsultasConfig();

  const isAsesorComercial = role === 'asesor_comercial';

  const currentTotalMin = currentHour * 60 + currentMinutes;
  const startTotalMin = consultasConfig.consultasStartHour * 60 + consultasConfig.consultasStartMinutes;
  const endTotalMin = consultasConfig.consultasEndHour * 60 + consultasConfig.consultasEndMinutes;
  const isInNotificationWindow = currentTotalMin >= startTotalMin && currentTotalMin < endTotalMin;

  const { data: todayReport } = useQuery({
    queryKey: ['today-report-notification', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await (dataService
        .from('reportes_diarios')
        .select('consultas, solicitudes')
        .eq('user_id', user.id)
        .eq('fecha', today)
        .maybeSingle() as any);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isInNotificationWindow && isAsesorComercial,
    refetchInterval: 60000,
  });

  const showNotification = useMemo(() => {
    if (!isAsesorComercial) return false;
    if (!isInNotificationWindow) return false;
    if (!todayReport) return true;
    if (todayReport.consultas === null && todayReport.solicitudes === null) return true;
    return false;
  }, [isAsesorComercial, isInNotificationWindow, todayReport]);

  return {
    showNotification,
    isInNotificationWindow,
    isAsesorComercial,
    hasSubmittedConsultas: !!todayReport && 
      (todayReport.consultas !== null || todayReport.solicitudes !== null),
    consultasConfig,
  };
}
