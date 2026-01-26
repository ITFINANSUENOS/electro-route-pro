import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useMemo } from 'react';

export function useActivityNotification() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const currentHour = new Date().getHours();

  // Check if we're in the notification window (4pm-9pm)
  const isInNotificationWindow = currentHour >= 16 && currentHour < 21;

  // Fetch today's report to check if consultas were submitted
  const { data: todayReport } = useQuery({
    queryKey: ['today-report-notification', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('reportes_diarios')
        .select('consultas, solicitudes')
        .eq('user_id', user.id)
        .eq('fecha', today)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isInNotificationWindow,
    refetchInterval: 60000, // Refetch every minute
  });

  const showNotification = useMemo(() => {
    if (!isInNotificationWindow) return false;
    
    // Show notification if no report exists or consultas haven't been set
    if (!todayReport) return true;
    if (todayReport.consultas === null && todayReport.solicitudes === null) return true;
    
    return false;
  }, [isInNotificationWindow, todayReport]);

  return {
    showNotification,
    isInNotificationWindow,
    hasSubmittedConsultas: todayReport !== null && 
      (todayReport.consultas !== null || todayReport.solicitudes !== null),
  };
}
