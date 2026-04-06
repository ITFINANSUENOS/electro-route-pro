import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dataService } from '@/services';
import { useEffect, useRef } from 'react';

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
  sede: string | null;
  telefono: string | null;
  tipo_asesor: string | null;
  codigo_jefe: string | null;
  created_at: string;
}

/** Normalize advisor code by stripping leading zeros */
const normalizeCode = (code: string): string => code.replace(/^0+/, '') || '0';

export function usePendingAdvisors() {
  const queryClient = useQueryClient();
  const autoResolveRan = useRef(false);

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

  // Auto-resolve false positives: check pending against profiles by normalized code + cedula
  useEffect(() => {
    if (isLoading || pendingList.length === 0 || autoResolveRan.current) return;
    autoResolveRan.current = true;

    const autoResolve = async () => {
      try {
        // Fetch all profiles codes and cedulas
        const { data: allProfiles } = await (dataService
          .from('profiles' as any)
          .select('codigo_asesor, cedula') as any);

        if (!allProfiles || allProfiles.length === 0) return;

        const profileNormalizedCodes = new Set(
          allProfiles
            .filter((p: any) => p.codigo_asesor)
            .map((p: any) => normalizeCode(p.codigo_asesor))
        );
        const profileCedulas = new Set(
          allProfiles
            .filter((p: any) => p.cedula)
            .map((p: any) => p.cedula)
        );

        // Find false positives
        const falsePositives = pendingList.filter(p => {
          const normCode = normalizeCode(p.codigo_asesor);
          // Generic codes like 01
          if (normCode === '1') return true;
          // Match by normalized code
          if (profileNormalizedCodes.has(normCode)) return true;
          // Match by cedula
          if (p.cedula && profileCedulas.has(p.cedula)) return true;
          return false;
        });

        if (falsePositives.length === 0) return;

        // Mark all false positives as auto-resolved
        for (const fp of falsePositives) {
          await (dataService
            .from('asesores_pendientes' as any)
            .update({ estado: 'auto_resuelto', resuelto_at: new Date().toISOString() })
            .eq('id', fp.id) as any);
        }

        console.log(`Auto-resolved ${falsePositives.length} false positive pending advisors`);
        queryClient.invalidateQueries({ queryKey: ['asesores-pendientes'] });
      } catch (e) {
        console.error('Error auto-resolving pending advisors:', e);
      }
    };

    autoResolve();
  }, [pendingList, isLoading, queryClient]);

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
