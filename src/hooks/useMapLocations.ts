import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dataService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import type { MapMarker, MapFiltersState } from '@/components/map/types';

interface UseMapLocationsOptions {
  filters?: Partial<MapFiltersState>;
  enabled?: boolean;
}

export function useMapLocations({ filters = {}, enabled = true }: UseMapLocationsOptions = {}) {
  const { role, profile } = useAuth();

  // Fetch reportes_diarios with GPS data
  const { data: reportes = [], isLoading: loadingReportes } = useQuery({
    queryKey: ['map-reportes', filters.dateFrom, filters.dateTo],
    queryFn: async () => {
      let query = dataService
        .from('reportes_diarios')
        .select('*')
        .not('gps_latitud', 'is', null)
        .not('gps_longitud', 'is', null)
        .order('fecha', { ascending: false })
        .limit(500);

      if (filters.dateFrom) {
        query = query.gte('fecha', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('fecha', filters.dateTo);
      }

      const { data, error } = await (query as any);
      if (error) throw error;
      return data || [];
    },
    enabled,
  });

  // Fetch profiles to get user names and hierarchy info
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['map-profiles'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('profiles')
        .select('user_id, nombre_completo, codigo_jefe, regional_id, tipo_asesor')
        .eq('activo', true) as any);
      if (error) throw error;
      return data || [];
    },
    enabled,
  });

  // Fetch programaciones to get activity type and municipio
  const { data: programaciones = [], isLoading: loadingProgramaciones } = useQuery({
    queryKey: ['map-programaciones', filters.dateFrom, filters.dateTo, filters.tipoActividad],
    queryFn: async () => {
      let query = dataService
        .from('programacion')
        .select('user_id, fecha, tipo_actividad, municipio, nombre')
        .order('fecha', { ascending: false })
        .limit(500);

      if (filters.dateFrom) {
        query = query.gte('fecha', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('fecha', filters.dateTo);
      }
      if (filters.tipoActividad && filters.tipoActividad !== 'todos') {
        query = query.eq('tipo_actividad', filters.tipoActividad as 'punto' | 'correria' | 'libre');
      }

      const { data, error } = await (query as any);
      if (error) throw error;
      return data || [];
    },
    enabled,
  });

  // Fetch regionales for regional names
  const { data: regionales = [] } = useQuery({
    queryKey: ['map-regionales'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('regionales')
        .select('id, nombre')
        .eq('activo', true) as any);
      if (error) throw error;
      return data || [];
    },
    enabled,
  });

  // Create lookup maps
  const profilesMap = useMemo(() => {
    const map = new Map<string, typeof profiles[0]>();
    profiles.forEach(p => map.set(p.user_id, p));
    return map;
  }, [profiles]);

  const regionalesMap = useMemo(() => {
    const map = new Map<string, string>();
    regionales.forEach(r => map.set(r.id, r.nombre));
    return map;
  }, [regionales]);

  const programacionesMap = useMemo(() => {
    const map = new Map<string, typeof programaciones[0]>();
    programaciones.forEach(p => {
      const key = `${p.user_id}-${p.fecha}`;
      map.set(key, p);
    });
    return map;
  }, [programaciones]);

  // Build markers with all required data
  const markers: MapMarker[] = useMemo(() => {
    return reportes
      .filter(reporte => {
        // Must have valid GPS coordinates
        if (!reporte.gps_latitud || !reporte.gps_longitud) return false;

        const userProfile = profilesMap.get(reporte.user_id);
        if (!userProfile) return false;

        // Role-based filtering
        if (role === 'asesor_comercial') {
          if (reporte.user_id !== profile?.user_id) return false;
        } else if (role === 'jefe_ventas') {
          const myCodigoJefe = profile?.codigo_jefe;
          if (reporte.user_id !== profile?.user_id && userProfile.codigo_jefe !== myCodigoJefe) {
            return false;
          }
        } else if (role === 'lider_zona') {
          if (userProfile.regional_id !== profile?.regional_id) return false;
        }
        // coordinador_comercial and administrador see all

        // Filter by regional
        if (filters.regionalId && filters.regionalId !== 'todos') {
          if (userProfile.regional_id !== filters.regionalId) return false;
        }

        // Filter by jefe
        if (filters.jefeId && filters.jefeId !== 'todos') {
          if (userProfile.codigo_jefe !== filters.jefeId) return false;
        }

        return true;
      })
      .map(reporte => {
        const userProfile = profilesMap.get(reporte.user_id);
        const progKey = `${reporte.user_id}-${reporte.fecha}`;
        const programacion = programacionesMap.get(progKey);

        return {
          id: reporte.id,
          lat: Number(reporte.gps_latitud),
          lng: Number(reporte.gps_longitud),
          user_id: reporte.user_id,
          user_name: userProfile?.nombre_completo || 'Desconocido',
          fecha: reporte.fecha,
          hora_registro: reporte.hora_registro,
          tipo_actividad: (programacion?.tipo_actividad || 'libre') as 'punto' | 'correria' | 'libre',
          municipio: programacion?.municipio || 'Sin municipio',
          has_photo: !!reporte.foto_url,
          has_gps: true,
          regional_id: userProfile?.regional_id || undefined,
          regional_name: userProfile?.regional_id ? regionalesMap.get(userProfile.regional_id) : undefined,
          foto_url: reporte.foto_url,
        };
      });
  }, [reportes, profilesMap, programacionesMap, regionalesMap, role, profile, filters]);

  return {
    markers,
    isLoading: loadingReportes || loadingProfiles || loadingProgramaciones,
    regionales,
    regionalesMap,
  };
}
