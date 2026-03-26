import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dataService } from '@/services';

export interface PendingAdvisor {
  id: string;
  codigo_asesor: string;
  cedula: string | null;
  nombre_completo: string | null;
  cod_region: number | null;
  regional_id: string | null;
  num_ventas: number | null;
  mes_deteccion: number | null;
  anio_deteccion: number | null;
  estado: string;
  email: string | null;
  telefono: string | null;
  tipo_asesor: string | null;
  codigo_jefe: string | null;
  created_at: string;
}

export function usePendingAdvisors() {
  const queryClient = useQueryClient();

  const { data: pendingList = [], isLoading, refetch } = useQuery({
    queryKey: ['asesores-pendientes'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('asesores_pendientes' as any)
        .select('*')
        .eq('estado', 'pendiente')
        .order('nombre_completo') as any);
      if (error) throw error;
      return (data || []) as PendingAdvisor[];
    },
  });

  const pendingCount = pendingList.length;

  const markAsCreated = async (codigoAsesor: string, resolvedBy: string) => {
    const { error } = await (dataService
      .from('asesores_pendientes' as any)
      .update({ estado: 'creado', resuelto_por: resolvedBy, resuelto_at: new Date().toISOString() })
      .eq('codigo_asesor', codigoAsesor) as any);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['asesores-pendientes'] });
  };

  const markAsDiscarded = async (codigoAsesor: string, resolvedBy: string) => {
    const { error } = await (dataService
      .from('asesores_pendientes' as any)
      .update({ estado: 'descartado', resuelto_por: resolvedBy, resuelto_at: new Date().toISOString() })
      .eq('codigo_asesor', codigoAsesor) as any);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['asesores-pendientes'] });
  };

  const updatePendingAdvisor = async (codigoAsesor: string, fields: Partial<PendingAdvisor>) => {
    const { error } = await (dataService
      .from('asesores_pendientes' as any)
      .update(fields)
      .eq('codigo_asesor', codigoAsesor) as any);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['asesores-pendientes'] });
  };

  return {
    pendingList,
    pendingCount,
    isLoading,
    refetch,
    markAsCreated,
    markAsDiscarded,
    updatePendingAdvisor,
  };
}
