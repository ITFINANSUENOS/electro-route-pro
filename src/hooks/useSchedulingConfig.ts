import { useQuery } from '@tanstack/react-query';
import { dataService } from '@/services';

interface SchedulingConfig {
  diasBloqueoMinimo: number;
  diasBloqueoMaximo: number;
  isLoading: boolean;
}

export function useSchedulingConfig(): SchedulingConfig {
  const { data, isLoading } = useQuery({
    queryKey: ['scheduling-config'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('permisos_roles')
        .select('permiso, rol')
        .eq('categoria', 'programacion_config') as any);

      if (error) throw error;

      const minDays = data?.find(d => d.permiso === 'dias_bloqueo_minimo');
      const maxDays = data?.find(d => d.permiso === 'dias_bloqueo_maximo');

      return {
        diasBloqueoMinimo: minDays ? parseInt(minDays.rol) : 4,
        diasBloqueoMaximo: maxDays ? parseInt(maxDays.rol) : 19,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    diasBloqueoMinimo: data?.diasBloqueoMinimo ?? 4,
    diasBloqueoMaximo: data?.diasBloqueoMaximo ?? 19,
    isLoading,
  };
}
