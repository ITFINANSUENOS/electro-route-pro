import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dataService } from '@/services';
import { format, startOfMonth, endOfMonth, subMonths, getDaysInMonth } from 'date-fns';

export interface RegionalData {
  id: string;
  nombre: string;
  codigo: number;
  ventaTotal: number;
  cantidadVentas: number;
  meta: number;
  cumplimiento: number;
  desglose: Record<string, { valor: number; cantidad: number }>;
}

export interface RegionalHistorico {
  id: string;
  nombre: string;
  currentTotal: number;
  previousTotal: number;
  currentCount: number;
  previousCount: number;
  variacionValor: number;
  variacionCantidad: number;
  currentDesglose: Record<string, { valor: number; cantidad: number }>;
  previousDesglose: Record<string, { valor: number; cantidad: number }>;
  prevYearTotal: number;
  prevYearCount: number;
  prevYearDesglose: Record<string, { valor: number; cantidad: number }>;
  variacionAnioValor: number;
}

async function fetchAllPaginated(buildQuery: (page: number, pageSize: number) => any, customPageSize = 1000): Promise<any[]> {
  const pageSize = customPageSize;
  let all: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let result: any;
    try {
      result = await buildQuery(page, pageSize);
    } catch (err) {
      console.error('fetchAllPaginated query error:', err);
      break;
    }
    const { data, error } = result;
    if (error) {
      console.error('fetchAllPaginated data error:', error);
      break;
    }
    if (data && data.length > 0) {
      all = all.concat(data);
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }
  return all;
}

export function useRegionalesData(selectedMonth: number, selectedYear: number, metaType: 'comercial' | 'nacional') {
  const currentStart = format(startOfMonth(new Date(selectedYear, selectedMonth - 1)), 'yyyy-MM-dd');
  const currentEnd = format(endOfMonth(new Date(selectedYear, selectedMonth - 1)), 'yyyy-MM-dd');
  
  const prevDate = subMonths(new Date(selectedYear, selectedMonth - 1), 1);
  const prevStart = format(startOfMonth(prevDate), 'yyyy-MM-dd');
  const prevEnd = format(endOfMonth(prevDate), 'yyyy-MM-dd');

  const prevYearDate = new Date(selectedYear - 1, selectedMonth - 1);
  const prevYearStart = format(startOfMonth(prevYearDate), 'yyyy-MM-dd');
  const prevYearEnd = format(endOfMonth(prevYearDate), 'yyyy-MM-dd');

  // Fetch regionales
  const { data: regionales } = useQuery({
    queryKey: ['regionales-list'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('regionales')
        .select('id, nombre, codigo')
        .eq('activo', true)
        .order('nombre', { ascending: true }) as any);
      if (error) throw error;
      return data as Array<{ id: string; nombre: string; codigo: number }>;
    },
  });

  // Fetch profiles to map codigo_asesor -> regional_id
  const { data: profiles } = useQuery({
    queryKey: ['regionales-profiles'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('profiles')
        .select('codigo_asesor, regional_id, activo')
        .not('codigo_asesor', 'is', null)
        .not('regional_id', 'is', null) as any);
      if (error) throw error;
      return data as Array<{ codigo_asesor: string; regional_id: string; activo: boolean }>;
    },
  });

  // Fetch current + previous month + prev year sales with pagination
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['regionales-sales', selectedMonth, selectedYear],
    retry: 2,
    queryFn: async () => {
      try {
        // Fetch both ranges IN PARALLEL - use cod_region for direct regional mapping
         const [currentPrevData, prevYearData] = await Promise.all([
          fetchAllPaginated((page, pageSize) =>
            dataService
              .from('ventas')
              .select('fecha, vtas_ant_i, codigo_asesor, tipo_venta, cod_region, tipo_documento, numero_doc')
              .gte('fecha', prevStart)
              .lte('fecha', currentEnd)
              .neq('tipo_venta', 'OTROS')
              .order('id', { ascending: true })
              .range(page * pageSize, (page + 1) * pageSize - 1)
          ),
          fetchAllPaginated((page, pageSize) =>
            dataService
              .from('ventas')
              .select('fecha, vtas_ant_i, codigo_asesor, tipo_venta, cod_region, tipo_documento, numero_doc')
              .gte('fecha', prevYearStart)
              .lte('fecha', prevYearEnd)
              .neq('tipo_venta', 'OTROS')
              .order('id', { ascending: true })
              .range(page * pageSize, (page + 1) * pageSize - 1)
          ),
        ]);
        return { currentPrevData, prevYearData };
      } catch (err) {
        console.error('useRegionalesData queryFn error:', err);
        return { currentPrevData: [], prevYearData: [] };
      }
    },
    enabled: !!regionales && !!profiles,
  });

  // Fetch metas
  const { data: metas } = useQuery({
    queryKey: ['regionales-metas', selectedMonth, selectedYear, metaType],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('metas')
        .select('codigo_asesor, valor_meta')
        .eq('mes', selectedMonth)
        .eq('anio', selectedYear)
        .eq('tipo_meta_categoria', metaType) as any);
      if (error) throw error;
      return data as Array<{ codigo_asesor: string; valor_meta: number }>;
    },
    enabled: !!regionales,
  });

  // Fetch nacional metas (always, for desglose table)
  const { data: metasNacionales } = useQuery({
    queryKey: ['regionales-metas-nacional', selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('metas')
        .select('codigo_asesor, valor_meta')
        .eq('mes', selectedMonth)
        .eq('anio', selectedYear)
        .eq('tipo_meta_categoria', 'nacional') as any);
      if (error) throw error;
      return data as Array<{ codigo_asesor: string; valor_meta: number }>;
    },
    enabled: !!regionales,
  });

  // Previous month metas for historical
  const prevMonth = prevDate.getMonth() + 1;
  const prevYear = prevDate.getFullYear();

  const processed = useMemo(() => {
    if (!regionales || !profiles || !salesData || !metas) {
      return { ranking: [], historico: [], metaNacionalByRegional: {} as Record<string, number> };
    }
    const { currentPrevData, prevYearData } = salesData;

    // Build lookup: codigo_asesor -> regional_id (for metas mapping)
    const asesorToRegional = new Map<string, string>();
    profiles.forEach(p => {
      if (p.codigo_asesor && p.regional_id) {
        asesorToRegional.set(p.codigo_asesor, p.regional_id);
      }
    });

    // Build lookup: cod_region (number) -> regional id (uuid)
    const codRegionToId = new Map<number, string>();
    regionales.forEach(r => {
      codRegionToId.set(r.codigo, r.id);
    });

    // Aggregate sales by regional using cod_region directly from ventas
    // Step 1: Group rows by unique document (tipo_documento + numero_doc + fecha) per regional
    type DocGroup = { regionalId: string; tipo: string; rows: Array<{ vtas_ant_i: number }> };
    const docGroups = new Map<string, DocGroup>();
    
    // Also track raw value totals per regional for financial sums
    const regionalValues = new Map<string, { current: number; previous: number; prevYear: number; desglose: Record<string, number>; prevDesglose: Record<string, number>; prevYearDesglose: Record<string, number> }>();
    regionales.forEach(r => {
      regionalValues.set(r.id, { current: 0, previous: 0, prevYear: 0, desglose: {}, prevDesglose: {}, prevYearDesglose: {} });
    });

    // Unique-count accumulators per regional
    const regionalCounts = new Map<string, { currentCount: number; previousCount: number; prevYearCount: number; desglose: Record<string, number>; prevDesglose: Record<string, number>; prevYearDesglose: Record<string, number> }>();
    regionales.forEach(r => {
      regionalCounts.set(r.id, { currentCount: 0, previousCount: 0, prevYearCount: 0, desglose: {}, prevDesglose: {}, prevYearDesglose: {} });
    });

    // Helper to normalize tipo
    const normTipo = (rawTipo: string | null) => {
      const t = rawTipo || 'OTROS';
      return t === 'CONVENIO' ? 'ALIADOS' : (t === 'CREDITO' || t === 'CREDICONTADO') ? 'FINANSUENOS' : t;
    };

    // Step 2: Accumulate raw values AND build document groups for current+prev month
    const currentPrevDocGroups = new Map<string, { regionalId: string; tipo: string; period: 'current' | 'previous'; total: number }>();
    
    currentPrevData.forEach(sale => {
      const regionalId = sale.cod_region ? codRegionToId.get(sale.cod_region) : null;
      if (!regionalId) return;
      const vals = regionalValues.get(regionalId);
      if (!vals) return;

      const amount = sale.vtas_ant_i || 0;
      const tipo = normTipo(sale.tipo_venta);
      const isCurrent = sale.fecha >= currentStart && sale.fecha <= currentEnd;
      const isPrev = sale.fecha >= prevStart && sale.fecha <= prevEnd;
      const period = isCurrent ? 'current' : isPrev ? 'previous' : null;
      if (!period) return;

      // Raw value aggregation (always add for totals)
      if (period === 'current') {
        vals.current += amount;
        vals.desglose[tipo] = (vals.desglose[tipo] || 0) + amount;
      } else {
        vals.previous += amount;
        vals.prevDesglose[tipo] = (vals.prevDesglose[tipo] || 0) + amount;
      }

      // Document grouping for unique count
      const tipoDoc = (sale.tipo_documento || 'UNK').trim();
      const numDoc = (sale.numero_doc || 'UNK').trim();
      const docKey = `${regionalId}|${period}|${tipo}|${tipoDoc}|${numDoc}|${sale.fecha}`;
      const existing = currentPrevDocGroups.get(docKey);
      if (existing) {
        existing.total += amount;
      } else {
        currentPrevDocGroups.set(docKey, { regionalId, tipo, period, total: amount });
      }
    });

    // Count unique documents (only if net > 0)
    currentPrevDocGroups.forEach(({ regionalId, tipo, period, total }) => {
      if (total <= 0) return;
      const counts = regionalCounts.get(regionalId);
      if (!counts) return;
      if (period === 'current') {
        counts.currentCount += 1;
        counts.desglose[tipo] = (counts.desglose[tipo] || 0) + 1;
      } else {
        counts.previousCount += 1;
        counts.prevDesglose[tipo] = (counts.prevDesglose[tipo] || 0) + 1;
      }
    });

    // Prev year: same pattern
    const prevYearDocGroups = new Map<string, { regionalId: string; tipo: string; total: number }>();
    
    prevYearData.forEach(sale => {
      const regionalId = sale.cod_region ? codRegionToId.get(sale.cod_region) : null;
      if (!regionalId) return;
      const vals = regionalValues.get(regionalId);
      if (!vals) return;
      const amount = sale.vtas_ant_i || 0;
      const tipo = normTipo(sale.tipo_venta);
      
      vals.prevYear += amount;
      vals.prevYearDesglose[tipo] = (vals.prevYearDesglose[tipo] || 0) + amount;

      const tipoDoc = (sale.tipo_documento || 'UNK').trim();
      const numDoc = (sale.numero_doc || 'UNK').trim();
      const docKey = `${regionalId}|${tipo}|${tipoDoc}|${numDoc}|${sale.fecha}`;
      const existing = prevYearDocGroups.get(docKey);
      if (existing) {
        existing.total += amount;
      } else {
        prevYearDocGroups.set(docKey, { regionalId, tipo, total: amount });
      }
    });

    prevYearDocGroups.forEach(({ regionalId, tipo, total }) => {
      if (total <= 0) return;
      const counts = regionalCounts.get(regionalId);
      if (!counts) return;
      counts.prevYearCount += 1;
      counts.prevYearDesglose[tipo] = (counts.prevYearDesglose[tipo] || 0) + 1;
    });

    // Aggregate metas by regional
    const regionalMetas = new Map<string, number>();
    metas.forEach(m => {
      const regionalId = asesorToRegional.get(m.codigo_asesor);
      if (!regionalId) return;
      regionalMetas.set(regionalId, (regionalMetas.get(regionalId) || 0) + m.valor_meta);
    });

    // Build ranking - use regionalValues for totals, regionalCounts for unique counts
    const ranking: RegionalData[] = regionales.map(r => {
      const vals = regionalValues.get(r.id);
      const counts = regionalCounts.get(r.id);
      const meta = regionalMetas.get(r.id) || 0;
      const ventaTotal = vals?.current || 0;
      // Build desglose with valor from regionalValues and cantidad from regionalCounts
      const desgloseKeys = new Set([...Object.keys(vals?.desglose || {}), ...Object.keys(counts?.desglose || {})]);
      const desglose: Record<string, { valor: number; cantidad: number }> = {};
      desgloseKeys.forEach(k => {
        desglose[k] = { valor: vals?.desglose[k] || 0, cantidad: counts?.desglose[k] || 0 };
      });
      return {
        id: r.id,
        nombre: r.nombre,
        codigo: r.codigo,
        ventaTotal,
        cantidadVentas: counts?.currentCount || 0,
        meta,
        cumplimiento: meta > 0 ? (ventaTotal / meta) * 100 : 0,
        desglose,
      };
    }).sort((a, b) => b.cumplimiento - a.cumplimiento);

    // Aggregate nacional metas by regional
    const metaNacionalByRegional: Record<string, number> = {};
    if (metasNacionales) {
      metasNacionales.forEach(m => {
        const regionalId = asesorToRegional.get(m.codigo_asesor);
        if (!regionalId) return;
        metaNacionalByRegional[regionalId] = (metaNacionalByRegional[regionalId] || 0) + m.valor_meta;
      });
    }

    // Build historico
    const historico: RegionalHistorico[] = regionales.map(r => {
      const vals = regionalValues.get(r.id);
      const counts = regionalCounts.get(r.id);
      const curr = vals?.current || 0;
      const prev = vals?.previous || 0;
      const currCount = counts?.currentCount || 0;
      const prevCount = counts?.previousCount || 0;
      const prevYr = vals?.prevYear || 0;
      const prevYrCount = counts?.prevYearCount || 0;
      // Build desgloses with valor + cantidad
      const buildDesglose = (valMap: Record<string, number> | undefined, countMap: Record<string, number> | undefined) => {
        const keys = new Set([...Object.keys(valMap || {}), ...Object.keys(countMap || {})]);
        const result: Record<string, { valor: number; cantidad: number }> = {};
        keys.forEach(k => { result[k] = { valor: valMap?.[k] || 0, cantidad: countMap?.[k] || 0 }; });
        return result;
      };
      return {
        id: r.id,
        nombre: r.nombre,
        currentTotal: curr,
        previousTotal: prev,
        currentCount: currCount,
        previousCount: prevCount,
        variacionValor: prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : curr > 0 ? 100 : 0,
        variacionCantidad: prevCount !== 0 ? ((currCount - prevCount) / prevCount) * 100 : currCount > 0 ? 100 : 0,
        currentDesglose: buildDesglose(vals?.desglose, counts?.desglose),
        previousDesglose: buildDesglose(vals?.prevDesglose, counts?.prevDesglose),
        prevYearTotal: prevYr,
        prevYearCount: prevYrCount,
        prevYearDesglose: buildDesglose(vals?.prevYearDesglose, counts?.prevYearDesglose),
        variacionAnioValor: prevYr !== 0 ? ((curr - prevYr) / Math.abs(prevYr)) * 100 : curr > 0 ? 100 : 0,
      };
    }).sort((a, b) => b.currentTotal - a.currentTotal);

    return { ranking, historico, metaNacionalByRegional };
  }, [regionales, profiles, salesData, metas, metasNacionales, currentStart, currentEnd, prevStart, prevEnd]);

  return {
    ranking: processed.ranking,
    historico: processed.historico,
    metaNacionalByRegional: processed.metaNacionalByRegional,
    regionales: regionales || [],
    isLoading: salesLoading || !regionales || !profiles,
    prevMonth,
    prevYear,
  };
}
