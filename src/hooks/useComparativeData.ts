import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dataService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, subMonths, format, getDaysInMonth } from 'date-fns';

export interface ComparativeFilters {
  tipoAsesor: string[];
  tipoVenta: string[];
  codigoJefe: string | null;
  codigosAsesor: string[];
  regionalIds: string[];
}

export interface DailySalesData {
  day: number;
  currentAmount: number;
  previousAmount: number;
  currentCount: number;
  previousCount: number;
}

export interface ComparativeKPIs {
  currentTotal: number;
  previousTotal: number;
  variationPercent: number;
  currentCount: number;
  previousCount: number;
  countVariationPercent: number;
  comparedDays: number;
}

async function fetchPaginated(
  buildQuery: (page: number, pageSize: number) => any
): Promise<any[]> {
  const pageSize = 1000;
  let all: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let result: any;
    try {
      result = await buildQuery(page, pageSize);
    } catch (err) {
      console.error('fetchPaginated query error:', err);
      break;
    }
    const { data, error } = result;
    if (error) {
      console.error('fetchPaginated data error:', error);
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

export type ComparisonMode = 'mes_anterior' | 'anio_anterior';

export function useComparativeData(
  selectedMonth: number,
  selectedYear: number,
  filters: ComparativeFilters,
  comparisonMode: ComparisonMode = 'mes_anterior'
) {
  const { profile, role } = useAuth();

  const currentPeriod = useMemo(() => {
    const start = startOfMonth(new Date(selectedYear, selectedMonth - 1));
    const end = endOfMonth(new Date(selectedYear, selectedMonth - 1));
    return { start, end, daysInMonth: getDaysInMonth(start) };
  }, [selectedMonth, selectedYear]);

  const previousPeriod = useMemo(() => {
    let prevDate: Date;
    if (comparisonMode === 'anio_anterior') {
      prevDate = new Date(selectedYear - 1, selectedMonth - 1);
    } else {
      prevDate = subMonths(new Date(selectedYear, selectedMonth - 1), 1);
    }
    const start = startOfMonth(prevDate);
    const end = endOfMonth(prevDate);
    return { start, end, daysInMonth: getDaysInMonth(start) };
  }, [selectedMonth, selectedYear, comparisonMode]);

  // Helper to apply shared filters to a query
  const applyFilters = (query: any) => {
    if (role === 'asesor_comercial' && profile?.codigo_asesor) {
      query = query.eq('codigo_asesor', profile.codigo_asesor);
    } else if (role === 'jefe_ventas' && profile?.codigo_jefe) {
      query = query.eq('codigo_jefe', profile.codigo_jefe);
    }
    if (filters.codigosAsesor.length > 0) {
      query = query.in('codigo_asesor', filters.codigosAsesor);
    }
    if (filters.codigoJefe) {
      query = query.eq('codigo_jefe', filters.codigoJefe);
    }
    if (filters.tipoVenta.length > 0) {
      const normalizedTypes = filters.tipoVenta.map(t => t === 'ALIADOS' ? 'CONVENIO' : t);
      query = query.in('tipo_venta', [...new Set([...filters.tipoVenta, ...normalizedTypes])]);
    }
    return query;
  };

  // Fetch current & previous period sales IN PARALLEL
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['comparative-sales', selectedMonth, selectedYear, filters, profile?.codigo_asesor, profile?.codigo_jefe, profile?.regional_id, role, comparisonMode],
    queryFn: async () => {
      try {
        const currentStart = format(currentPeriod.start, 'yyyy-MM-dd');
        const currentEnd = format(currentPeriod.end, 'yyyy-MM-dd');
        const prevStart = format(previousPeriod.start, 'yyyy-MM-dd');
        const prevEnd = format(previousPeriod.end, 'yyyy-MM-dd');

        const selectCols = 'fecha, vtas_ant_i, codigo_asesor, tipo_venta';

        const [currentData, prevData] = await Promise.all([
          fetchPaginated((page, pageSize) => {
            let q = dataService
              .from('ventas')
              .select(selectCols)
              .gte('fecha', currentStart)
              .lte('fecha', currentEnd)
              .neq('tipo_venta', 'OTROS')
              .range(page * pageSize, (page + 1) * pageSize - 1);
            return applyFilters(q);
          }),
          fetchPaginated((page, pageSize) => {
            let q = dataService
              .from('ventas')
              .select(selectCols)
              .gte('fecha', prevStart)
              .lte('fecha', prevEnd)
              .neq('tipo_venta', 'OTROS')
              .range(page * pageSize, (page + 1) * pageSize - 1);
            return applyFilters(q);
          }),
        ]);

        return { currentData, prevData };
      } catch (err) {
        console.error('useComparativeData queryFn error:', err);
        return { currentData: [], prevData: [] };
      }
    },
    enabled: !!profile,
  });

  // Fetch profiles for tipo_asesor filter
  const { data: profilesData } = useQuery({
    queryKey: ['comparative-profiles', filters.tipoAsesor, filters.regionalIds, role, profile?.regional_id],
    queryFn: async () => {
      let query = dataService
        .from('profiles')
        .select('codigo_asesor, tipo_asesor, regional_id')
        .eq('activo', true)
        .not('codigo_asesor', 'is', null);

      if (role === 'lider_zona' && profile?.regional_id) {
        query = query.eq('regional_id', profile.regional_id);
      } else if (filters.regionalIds.length > 0) {
        query = query.in('regional_id', filters.regionalIds);
      }

      if (filters.tipoAsesor.length > 0) {
        query = query.in('tipo_asesor', filters.tipoAsesor);
      }

      const { data, error } = await (query as any);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

  // Process data into daily aggregates
  const processedData = useMemo(() => {
    if (!salesData || !profilesData) return { daily: [], kpis: null };

    const validCodigos = filters.tipoAsesor.length > 0
      ? new Set(profilesData.map((p: any) => p.codigo_asesor))
      : null;

    // Group by day
    const dailyMap = new Map<number, DailySalesData>();
    const maxDays = Math.max(currentPeriod.daysInMonth, previousPeriod.daysInMonth);
    for (let d = 1; d <= maxDays; d++) {
      dailyMap.set(d, { day: d, currentAmount: 0, previousAmount: 0, currentCount: 0, previousCount: 0 });
    }

    const currentUniqueSales = new Map<string, Set<number>>();
    const previousUniqueSales = new Map<string, Set<number>>();

    // Process current period
    salesData.currentData.forEach((sale: any) => {
      if (validCodigos && !validCodigos.has(sale.codigo_asesor)) return;
      const day = parseInt(sale.fecha.split('-')[2]);
      const entry = dailyMap.get(day);
      if (!entry) return;
      entry.currentAmount += sale.vtas_ant_i || 0;
      const clientId = sale.codigo_asesor;
      if (!currentUniqueSales.has(clientId)) currentUniqueSales.set(clientId, new Set());
      if (!currentUniqueSales.get(clientId)!.has(day)) {
        currentUniqueSales.get(clientId)!.add(day);
        entry.currentCount += 1;
      }
    });

    // Process previous period
    salesData.prevData.forEach((sale: any) => {
      if (validCodigos && !validCodigos.has(sale.codigo_asesor)) return;
      const day = parseInt(sale.fecha.split('-')[2]);
      const entry = dailyMap.get(day);
      if (!entry) return;
      entry.previousAmount += sale.vtas_ant_i || 0;
      const clientId = sale.codigo_asesor;
      if (!previousUniqueSales.has(clientId)) previousUniqueSales.set(clientId, new Set());
      if (!previousUniqueSales.get(clientId)!.has(day)) {
        previousUniqueSales.get(clientId)!.add(day);
        entry.previousCount += 1;
      }
    });

    const daily = Array.from(dailyMap.values()).sort((a, b) => a.day - b.day);

    // Fair comparison: only up to last day with current data
    const lastDayWithCurrentData = daily.reduce((maxDay, d) => {
      if (d.currentAmount > 0 || d.currentCount > 0) return Math.max(maxDay, d.day);
      return maxDay;
    }, 0);

    const comparableDays = daily.filter(d => d.day <= lastDayWithCurrentData);
    const currentTotal = comparableDays.reduce((sum, d) => sum + d.currentAmount, 0);
    const previousTotal = comparableDays.reduce((sum, d) => sum + d.previousAmount, 0);
    const currentCount = comparableDays.reduce((sum, d) => sum + d.currentCount, 0);
    const previousCount = comparableDays.reduce((sum, d) => sum + d.previousCount, 0);

    const variationPercent = previousTotal !== 0
      ? ((currentTotal - previousTotal) / Math.abs(previousTotal)) * 100
      : currentTotal > 0 ? 100 : 0;

    const countVariationPercent = previousCount !== 0
      ? ((currentCount - previousCount) / previousCount) * 100
      : currentCount > 0 ? 100 : 0;

    const kpis: ComparativeKPIs = {
      currentTotal,
      previousTotal,
      variationPercent,
      currentCount,
      previousCount,
      countVariationPercent,
      comparedDays: lastDayWithCurrentData,
    };

    return { daily, kpis };
  }, [salesData, profilesData, currentPeriod, previousPeriod, filters.tipoAsesor]);

  return {
    dailyData: processedData.daily,
    kpis: processedData.kpis,
    isLoading,
    currentPeriod,
    previousPeriod,
  };
}
