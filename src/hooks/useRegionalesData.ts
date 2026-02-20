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

async function fetchAllPaginated(buildQuery: (page: number, pageSize: number) => any): Promise<any[]> {
  const pageSize = 1000;
  let all: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await buildQuery(page, pageSize);
    if (error) throw error;
    if (data && data.length > 0) {
      all = [...all, ...data];
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
        .select('codigo_asesor, regional_id')
        .eq('activo', true)
        .not('codigo_asesor', 'is', null)
        .not('regional_id', 'is', null) as any);
      if (error) throw error;
      return data as Array<{ codigo_asesor: string; regional_id: string }>;
    },
  });

  // Fetch current + previous month + prev year sales with pagination
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['regionales-sales', selectedMonth, selectedYear],
    queryFn: async () => {
      // Fetch both ranges IN PARALLEL
      const [currentPrevData, prevYearData] = await Promise.all([
        fetchAllPaginated((page, pageSize) =>
          dataService
            .from('ventas')
            .select('fecha, vtas_ant_i, codigo_asesor, tipo_venta')
            .gte('fecha', prevStart)
            .lte('fecha', currentEnd)
            .neq('tipo_venta', 'OTROS')
            .range(page * pageSize, (page + 1) * pageSize - 1)
        ),
        fetchAllPaginated((page, pageSize) =>
          dataService
            .from('ventas')
            .select('fecha, vtas_ant_i, codigo_asesor, tipo_venta')
            .gte('fecha', prevYearStart)
            .lte('fecha', prevYearEnd)
            .neq('tipo_venta', 'OTROS')
            .range(page * pageSize, (page + 1) * pageSize - 1)
        ),
      ]);
      return { currentPrevData, prevYearData };
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

    // Build lookup: codigo_asesor -> regional_id
    const asesorToRegional = new Map<string, string>();
    profiles.forEach(p => {
      if (p.codigo_asesor && p.regional_id) {
        asesorToRegional.set(p.codigo_asesor, p.regional_id);
      }
    });

    // Aggregate sales by regional
    const regionalSales = new Map<string, { current: number; currentCount: number; previous: number; previousCount: number; prevYear: number; prevYearCount: number; desglose: Record<string, { valor: number; cantidad: number }>; prevDesglose: Record<string, { valor: number; cantidad: number }>; prevYearDesglose: Record<string, { valor: number; cantidad: number }> }>();
    
    regionales.forEach(r => {
      regionalSales.set(r.id, { current: 0, currentCount: 0, previous: 0, previousCount: 0, prevYear: 0, prevYearCount: 0, desglose: {}, prevDesglose: {}, prevYearDesglose: {} });
    });

    currentPrevData.forEach(sale => {
      const regionalId = asesorToRegional.get(sale.codigo_asesor);
      if (!regionalId) return;
      const entry = regionalSales.get(regionalId);
      if (!entry) return;

      const amount = sale.vtas_ant_i || 0;
      const isCurrent = sale.fecha >= currentStart && sale.fecha <= currentEnd;
      const isPrev = sale.fecha >= prevStart && sale.fecha <= prevEnd;

      if (isCurrent) {
        entry.current += amount;
        entry.currentCount += 1;
        const tipo = sale.tipo_venta || 'OTROS';
        if (!entry.desglose[tipo]) entry.desglose[tipo] = { valor: 0, cantidad: 0 };
        entry.desglose[tipo].valor += amount;
        entry.desglose[tipo].cantidad += 1;
      } else if (isPrev) {
        entry.previous += amount;
        entry.previousCount += 1;
        const tipo = sale.tipo_venta || 'OTROS';
        if (!entry.prevDesglose[tipo]) entry.prevDesglose[tipo] = { valor: 0, cantidad: 0 };
        entry.prevDesglose[tipo].valor += amount;
        entry.prevDesglose[tipo].cantidad += 1;
      }
    });

    // Aggregate prev year sales
    prevYearData.forEach(sale => {
      const regionalId = asesorToRegional.get(sale.codigo_asesor);
      if (!regionalId) return;
      const entry = regionalSales.get(regionalId);
      if (!entry) return;
      const amount = sale.vtas_ant_i || 0;
      entry.prevYear += amount;
      entry.prevYearCount += 1;
      const tipo = sale.tipo_venta || 'OTROS';
      if (!entry.prevYearDesglose[tipo]) entry.prevYearDesglose[tipo] = { valor: 0, cantidad: 0 };
      entry.prevYearDesglose[tipo].valor += amount;
      entry.prevYearDesglose[tipo].cantidad += 1;
    });

    // Aggregate metas by regional
    const regionalMetas = new Map<string, number>();
    metas.forEach(m => {
      const regionalId = asesorToRegional.get(m.codigo_asesor);
      if (!regionalId) return;
      regionalMetas.set(regionalId, (regionalMetas.get(regionalId) || 0) + m.valor_meta);
    });

    // Build ranking
    const ranking: RegionalData[] = regionales.map(r => {
      const sales = regionalSales.get(r.id);
      const meta = regionalMetas.get(r.id) || 0;
      const ventaTotal = sales?.current || 0;
      return {
        id: r.id,
        nombre: r.nombre,
        codigo: r.codigo,
        ventaTotal,
        cantidadVentas: sales?.currentCount || 0,
        meta,
        cumplimiento: meta > 0 ? (ventaTotal / meta) * 100 : 0,
        desglose: sales?.desglose || {},
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
      const sales = regionalSales.get(r.id);
      const curr = sales?.current || 0;
      const prev = sales?.previous || 0;
      const currCount = sales?.currentCount || 0;
      const prevCount = sales?.previousCount || 0;
      const prevYr = sales?.prevYear || 0;
      const prevYrCount = sales?.prevYearCount || 0;
      return {
        id: r.id,
        nombre: r.nombre,
        currentTotal: curr,
        previousTotal: prev,
        currentCount: currCount,
        previousCount: prevCount,
        variacionValor: prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : curr > 0 ? 100 : 0,
        variacionCantidad: prevCount !== 0 ? ((currCount - prevCount) / prevCount) * 100 : currCount > 0 ? 100 : 0,
        currentDesglose: sales?.desglose || {},
        previousDesglose: sales?.prevDesglose || {},
        prevYearTotal: prevYr,
        prevYearCount: prevYrCount,
        prevYearDesglose: sales?.prevYearDesglose || {},
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
