import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { dataService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import type { MetaType } from '@/components/dashboard/MetaTypeToggle';

export interface MonthData {
  key: string; // "2025-01"
  label: string; // "Ene 25"
  mes: number;
  anio: number;
  ventaTotal: number;
  meta: number;
  cumplimiento: number;
  cantidad: number;
  asesoresUnicos: number;
  desglose: Record<string, { valor: number; cantidad: number }>;
  desglosesMeta: Record<string, number>;
}

export interface HistoricoRegionalRow {
  id: string;
  nombre: string;
  months: Record<string, { venta: number; meta: number; cantidad: number; desglose: Record<string, { valor: number; cantidad: number }> }>;
}

export interface HistoricoFiltersState {
  codigoJefe?: string;
  codigosAsesor?: string[];
  monthRange?: { start: string; end: string }; // "2025-01" format
}

const MONTH_NAMES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function normalizeTipo(raw: string | null): string {
  if (!raw) return 'OTROS';
  if (raw === 'CONVENIO') return 'ALIADOS';
  if (raw === 'CREDITO' || raw === 'CREDICONTADO') return 'FINANSUENOS';
  return raw;
}

async function fetchAllPaginated(buildQuery: (page: number, pageSize: number) => any, customPageSize = 1000): Promise<any[]> {
  const pageSize = customPageSize;
  const concurrency = 8; // peticiones paralelas
  let all: any[] = [];
  let page = 0;
  let done = false;

  while (!done) {
    const batch = Array.from({ length: concurrency }, (_, i) => buildQuery(page + i, pageSize));
    try {
      const results = await Promise.all(batch);
      for (const { data, error } of results) {
        if (error) { console.error('fetchAllPaginated error:', error); done = true; break; }
        if (data && data.length > 0) {
          all = all.concat(data);
          if (data.length < pageSize) done = true;
        } else {
          done = true;
        }
      }
      page += concurrency;
    } catch (err) {
      console.error('fetchAllPaginated catch:', err);
      break;
    }
  }
  return all;
}

export function useHistoricoData(
  selectedRegionalIds: string[] = [],
  tipoVentaFilter: string[] = [],
  metaType: MetaType = 'comercial',
  comparableMode: boolean = false,
  filters: HistoricoFiltersState = {}
) {
  const { profile, role } = useAuth();

  // 1. Fetch periodos_ventas to know which months exist
  const { data: periodos } = useQuery({
    queryKey: ['historico-periodos'],
    queryFn: async () => {
      const { data, error } = await dataService
        .from('periodos_ventas')
        .select('mes, anio, estado, monto_total')
        .order('anio', { ascending: true })
        .order('mes', { ascending: true });
      if (error) throw error;
      return (data || []) as Array<{ mes: number; anio: number; estado: string; monto_total: number }>;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // 2. Fetch profiles for mapping
  const { data: profiles } = useQuery({
    queryKey: ['historico-profiles'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('profiles')
        .select('codigo_asesor, regional_id, codigo_jefe, nombre_completo, activo')
        .not('codigo_asesor', 'is', null) as any);
      if (error) throw error;
      return data as Array<{ codigo_asesor: string; regional_id: string | null; codigo_jefe: string | null; nombre_completo: string; activo: boolean }>;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // 3. Fetch regionales
  const { data: regionales } = useQuery({
    queryKey: ['historico-regionales'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('regionales')
        .select('id, nombre, codigo')
        .eq('activo', true)
        .order('nombre') as any);
      if (error) throw error;
      return data as Array<{ id: string; nombre: string; codigo: number }>;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Date range covering all periods (or filtered range)
  const dateRange = useMemo(() => {
    if (!periodos || periodos.length === 0) return null;

    let filteredPeriodos = periodos;
    if (filters.monthRange) {
      const [startY, startM] = filters.monthRange.start.split('-').map(Number);
      const [endY, endM] = filters.monthRange.end.split('-').map(Number);
      filteredPeriodos = periodos.filter(p => {
        const v = p.anio * 100 + p.mes;
        return v >= startY * 100 + startM && v <= endY * 100 + endM;
      });
      if (filteredPeriodos.length === 0) return null;
    }

    const first = filteredPeriodos[0];
    const last = filteredPeriodos[filteredPeriodos.length - 1];
    return {
      start: format(startOfMonth(new Date(first.anio, first.mes - 1)), 'yyyy-MM-dd'),
      end: format(endOfMonth(new Date(last.anio, last.mes - 1)), 'yyyy-MM-dd'),
    };
  }, [periodos, filters.monthRange]);

  // 4. Fetch ALL ventas across all periods - with .order('id') for stable pagination
  const { data: ventas, isLoading: ventasLoading } = useQuery({
    queryKey: ['historico-ventas', dateRange, profile?.codigo_asesor, profile?.codigo_jefe, profile?.regional_id, role, comparableMode],
    queryFn: async () => {
      if (!dateRange) return [];
      return fetchAllPaginated((page, pageSize) => {
        let q = dataService
          .from('ventas')
          .select('fecha, vtas_ant_i, codigo_asesor, tipo_venta, codigo_jefe, cantidad, mcn_clase')
          .gte('fecha', dateRange.start)
          .lte('fecha', dateRange.end)
          .neq('tipo_venta', 'OTROS')
          .order('id', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        // Comparable mode: exclude FNZ complements
        if (comparableMode) {
          q = q.neq('mcn_clase', '.');
        }

        // Role-based filter at query level
        if (role === 'asesor_comercial' && profile?.codigo_asesor) {
          q = q.eq('codigo_asesor', profile.codigo_asesor);
        } else if (role === 'jefe_ventas' && profile?.codigo_jefe) {
          q = q.eq('codigo_jefe', profile.codigo_jefe);
        }
        return q;
      });
    },
    enabled: !!dateRange && !!profile,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    placeholderData: keepPreviousData,
  });

  // 5. Fetch ALL metas across all periods - with .order('id') for stable pagination
  const { data: metas, isLoading: metasLoading } = useQuery({
    queryKey: ['historico-metas', dateRange, metaType],
    queryFn: async () => {
      if (!periodos) return [];
      return fetchAllPaginated((page, pageSize) =>
        dataService
          .from('metas')
          .select('codigo_asesor, valor_meta, mes, anio, tipo_meta_categoria')
          .eq('tipo_meta_categoria', metaType)
          .order('id', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1)
      );
    },
    enabled: !!periodos && periodos.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    placeholderData: keepPreviousData,
  });

  // Fetch jefes for filter options
  const { data: jefes } = useQuery({
    queryKey: ['historico-jefes'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('jefes_ventas')
        .select('codigo, nombre, regional_id')
        .eq('activo', true)
        .order('nombre') as any);
      if (error) throw error;
      return data as Array<{ codigo: string; nombre: string; regional_id: string | null }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Process everything
  const processed = useMemo(() => {
    if (!periodos || !ventas || !metas || !profiles || !regionales) {
      return { months: [], regionalRows: [], availableMonths: [] };
    }

    // Build lookups
    const asesorToRegional = new Map<string, string>();
    const asesorToJefe = new Map<string, string>();
    profiles.forEach(p => {
      if (p.codigo_asesor) {
        if (p.regional_id) asesorToRegional.set(p.codigo_asesor, p.regional_id);
        if (p.codigo_jefe) asesorToJefe.set(p.codigo_asesor, p.codigo_jefe);
      }
    });

    // Determine which asesores are in scope based on role + filters
    const isInScope = (codigoAsesor: string, codigoJefe?: string | null): boolean => {
      // Advanced filters override
      if (filters.codigosAsesor && filters.codigosAsesor.length > 0) {
        return filters.codigosAsesor.includes(codigoAsesor);
      }
      if (filters.codigoJefe) {
        const jefe = codigoJefe || asesorToJefe.get(codigoAsesor);
        return jefe === filters.codigoJefe;
      }

      if (role === 'asesor_comercial') return codigoAsesor === profile?.codigo_asesor;
      if (role === 'jefe_ventas') {
        const jefe = codigoJefe || asesorToJefe.get(codigoAsesor);
        return jefe === profile?.codigo_jefe;
      }
      if (role === 'lider_zona') {
        const rid = asesorToRegional.get(codigoAsesor);
        return rid === profile?.regional_id;
      }
      if (selectedRegionalIds.length > 0) {
        const rid = asesorToRegional.get(codigoAsesor);
        return !!rid && selectedRegionalIds.includes(rid);
      }
      return true;
    };

    // Filter periods by month range
    let activePeriodos = periodos;
    if (filters.monthRange) {
      const [startY, startM] = filters.monthRange.start.split('-').map(Number);
      const [endY, endM] = filters.monthRange.end.split('-').map(Number);
      activePeriodos = periodos.filter(p => {
        const v = p.anio * 100 + p.mes;
        return v >= startY * 100 + startM && v <= endY * 100 + endM;
      });
    }

    // Aggregate ventas by month
    const monthMap = new Map<string, MonthData>();
    const monthAsesores = new Map<string, Set<string>>();
    const regionalMonthMap = new Map<string, Map<string, { venta: number; meta: number; cantidad: number; desglose: Record<string, { valor: number; cantidad: number }> }>>();

    // Init months from periodos
    activePeriodos.forEach(p => {
      const key = `${p.anio}-${String(p.mes).padStart(2, '0')}`;
      const label = `${MONTH_NAMES[p.mes]} ${String(p.anio).slice(2)}`;
      monthMap.set(key, {
        key, label, mes: p.mes, anio: p.anio,
        ventaTotal: 0, meta: 0, cumplimiento: 0, cantidad: 0, asesoresUnicos: 0,
        desglose: {}, desglosesMeta: {},
      });
      monthAsesores.set(key, new Set());
    });

    // Process ventas
    ventas.forEach((sale: any) => {
      if (!isInScope(sale.codigo_asesor, sale.codigo_jefe)) return;

      const tipo = normalizeTipo(sale.tipo_venta);
      if (tipoVentaFilter.length > 0 && !tipoVentaFilter.includes(tipo)) return;

      const [y, m] = sale.fecha.split('-');
      const key = `${y}-${m}`;
      const entry = monthMap.get(key);
      if (!entry) return;

      const amount = sale.vtas_ant_i || 0;
      entry.ventaTotal += amount;
      entry.cantidad += 1;
      if (!entry.desglose[tipo]) entry.desglose[tipo] = { valor: 0, cantidad: 0 };
      entry.desglose[tipo].valor += amount;
      entry.desglose[tipo].cantidad += 1;

      // Track unique asesores
      monthAsesores.get(key)?.add(sale.codigo_asesor);

      // Regional breakdown
      const globalRoles: UserRole[] = ['coordinador_comercial', 'administrador', 'lider_zona'];
      if (role && globalRoles.includes(role)) {
        const rid = asesorToRegional.get(sale.codigo_asesor);
        if (rid) {
          if (!regionalMonthMap.has(rid)) regionalMonthMap.set(rid, new Map());
          const rm = regionalMonthMap.get(rid)!;
          if (!rm.has(key)) rm.set(key, { venta: 0, meta: 0, cantidad: 0, desglose: {} });
          const re = rm.get(key)!;
          re.venta += amount;
          re.cantidad += 1;
          if (!re.desglose[tipo]) re.desglose[tipo] = { valor: 0, cantidad: 0 };
          re.desglose[tipo].valor += amount;
          re.desglose[tipo].cantidad += 1;
        }
      }
    });

    // Process metas
    metas.forEach((m: any) => {
      if (!isInScope(m.codigo_asesor)) return;
      const key = `${m.anio}-${String(m.mes).padStart(2, '0')}`;
      const entry = monthMap.get(key);
      if (!entry) return;
      entry.meta += m.valor_meta || 0;

      // Regional meta
      const globalRoles: UserRole[] = ['coordinador_comercial', 'administrador', 'lider_zona'];
      if (role && globalRoles.includes(role)) {
        const rid = asesorToRegional.get(m.codigo_asesor);
        if (rid) {
          if (!regionalMonthMap.has(rid)) regionalMonthMap.set(rid, new Map());
          const rm = regionalMonthMap.get(rid)!;
          if (!rm.has(key)) rm.set(key, { venta: 0, meta: 0, cantidad: 0, desglose: {} });
          rm.get(key)!.meta += m.valor_meta || 0;
        }
      }
    });

    // Set asesoresUnicos and calculate cumplimiento
    monthMap.forEach((entry, key) => {
      entry.asesoresUnicos = monthAsesores.get(key)?.size || 0;
      entry.cumplimiento = entry.meta > 0 ? (entry.ventaTotal / entry.meta) * 100 : 0;
    });

    const months = Array.from(monthMap.values()).sort((a, b) =>
      a.key.localeCompare(b.key)
    );

    // Build regional rows
    const regionalRows: HistoricoRegionalRow[] = regionales
      .filter(r => {
        if (selectedRegionalIds.length > 0) return selectedRegionalIds.includes(r.id);
        if (role === 'lider_zona') return r.id === profile?.regional_id;
        return true;
      })
      .map(r => ({
        id: r.id,
        nombre: r.nombre,
        months: Object.fromEntries(
          Array.from(regionalMonthMap.get(r.id)?.entries() || [])
        ),
      }))
      .filter(r => Object.keys(r.months).length > 0);

    return { months, regionalRows, availableMonths: months.map(m => m.key) };
  }, [periodos, ventas, metas, profiles, regionales, role, profile, selectedRegionalIds, tipoVentaFilter, filters]);

  const isGlobalRole = role === 'coordinador_comercial' || role === 'administrador' || role === 'lider_zona';

  // Build advisor options for filter
  const advisorOptions = useMemo(() => {
    if (!profiles) return [];
    let filtered = profiles.filter(p => p.activo && p.codigo_asesor && p.codigo_asesor !== '00001');
    if (filters.codigoJefe) {
      filtered = filtered.filter(p => p.codigo_jefe === filters.codigoJefe);
    } else if (selectedRegionalIds.length > 0) {
      filtered = filtered.filter(p => p.regional_id && selectedRegionalIds.includes(p.regional_id));
    } else if (role === 'lider_zona' && profile?.regional_id) {
      filtered = filtered.filter(p => p.regional_id === profile.regional_id);
    } else if (role === 'jefe_ventas' && profile?.codigo_jefe) {
      filtered = filtered.filter(p => p.codigo_jefe === profile.codigo_jefe);
    }
    return filtered.map(p => ({ value: p.codigo_asesor, label: p.nombre_completo }));
  }, [profiles, filters.codigoJefe, selectedRegionalIds, role, profile]);

  return {
    months: processed.months,
    regionalRows: processed.regionalRows,
    availableMonths: processed.availableMonths,
    regionales: regionales || [],
    jefes: jefes || [],
    advisorOptions,
    isLoading: ventasLoading || metasLoading || !periodos || !profiles,
    isGlobalRole,
    role,
    periodos: periodos || [],
  };
}
