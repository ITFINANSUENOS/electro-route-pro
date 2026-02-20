import { useQuery } from '@tanstack/react-query';
import { dataService } from '@/services';

interface ConsultasConfig {
  consultasHoraInicio: string;
  consultasHoraFin: string;
  consultasStartHour: number;
  consultasStartMinutes: number;
  consultasEndHour: number;
  consultasEndMinutes: number;
}

export function useConsultasConfig(): ConsultasConfig {
  const { data } = useQuery({
    queryKey: ['consultas-config'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('permisos_roles')
        .select('permiso, rol')
        .eq('categoria', 'programacion_config')
        .in('permiso', ['consultas_hora_inicio', 'consultas_hora_fin']) as any);

      if (error) throw error;
      return data as { permiso: string; rol: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const getValue = (permiso: string, defaultVal: string) => {
    const found = data?.find(d => d.permiso === permiso);
    return found?.rol || defaultVal;
  };

  const inicio = getValue('consultas_hora_inicio', '12:00');
  const fin = getValue('consultas_hora_fin', '22:00');

  const [startH, startM] = inicio.split(':').map(Number);
  const [endH, endM] = fin.split(':').map(Number);

  return {
    consultasHoraInicio: inicio,
    consultasHoraFin: fin,
    consultasStartHour: startH || 12,
    consultasStartMinutes: startM || 0,
    consultasEndHour: endH || 22,
    consultasEndMinutes: endM || 0,
  };
}
