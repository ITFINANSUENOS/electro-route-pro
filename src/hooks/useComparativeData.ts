 import { useState, useMemo } from 'react';
 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
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
 
// Helper function to fetch all records with pagination
async function fetchAllSalesWithPagination(
  baseQuery: any,
  prevStart: string,
  currentEnd: string
): Promise<any[]> {
  const pageSize = 1000;
  let allData: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await baseQuery
      .gte('fecha', prevStart)
      .lte('fecha', currentEnd)
      .neq('tipo_venta', 'OTROS')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

 export function useComparativeData(
   selectedMonth: number,
   selectedYear: number,
   filters: ComparativeFilters
 ) {
   const { profile, role } = useAuth();
   
   // Calculate date ranges
   const currentPeriod = useMemo(() => {
     const start = startOfMonth(new Date(selectedYear, selectedMonth - 1));
     const end = endOfMonth(new Date(selectedYear, selectedMonth - 1));
     return { start, end, daysInMonth: getDaysInMonth(start) };
   }, [selectedMonth, selectedYear]);
   
   const previousPeriod = useMemo(() => {
     const prevDate = subMonths(new Date(selectedYear, selectedMonth - 1), 1);
     const start = startOfMonth(prevDate);
     const end = endOfMonth(prevDate);
     return { start, end, daysInMonth: getDaysInMonth(start) };
   }, [selectedMonth, selectedYear]);
   
   // Fetch sales data
   const { data: salesData, isLoading } = useQuery({
     queryKey: ['comparative-sales', selectedMonth, selectedYear, filters, profile?.codigo_asesor, profile?.codigo_jefe, profile?.regional_id, role],
     queryFn: async () => {
       const prevStart = format(previousPeriod.start, 'yyyy-MM-dd');
        const currentEnd = format(currentPeriod.end, 'yyyy-MM-dd');

        // Build base query
        let baseQuery = supabase
         .from('ventas')
         .select(`
           fecha,
           vtas_ant_i,
           codigo_asesor,
           tipo_venta,
           codigo_jefe,
           cliente_identificacion
          `);

       // Apply role-based filters
       if (role === 'asesor_comercial' && profile?.codigo_asesor) {
          baseQuery = baseQuery.eq('codigo_asesor', profile.codigo_asesor);
       } else if (role === 'jefe_ventas' && profile?.codigo_jefe) {
          baseQuery = baseQuery.eq('codigo_jefe', profile.codigo_jefe);
       }

       // Apply user filters
       if (filters.codigosAsesor.length > 0) {
          baseQuery = baseQuery.in('codigo_asesor', filters.codigosAsesor);
       }

       if (filters.codigoJefe) {
          baseQuery = baseQuery.eq('codigo_jefe', filters.codigoJefe);
       }

       if (filters.tipoVenta.length > 0) {
         const normalizedTypes = filters.tipoVenta.map(t => 
           t === 'ALIADOS' ? 'CONVENIO' : t
         );
          baseQuery = baseQuery.in('tipo_venta', [...new Set([...filters.tipoVenta, ...normalizedTypes])]);
       }

        // Fetch all data with pagination
        const pageSize = 1000;
        let allData: any[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          let pageQuery = supabase
            .from('ventas')
            .select(`
              fecha,
              vtas_ant_i,
              codigo_asesor,
              tipo_venta,
              codigo_jefe,
              cliente_identificacion
            `)
            .gte('fecha', prevStart)
            .lte('fecha', currentEnd)
            .neq('tipo_venta', 'OTROS')
            .range(page * pageSize, (page + 1) * pageSize - 1);

          // Apply role-based filters
          if (role === 'asesor_comercial' && profile?.codigo_asesor) {
            pageQuery = pageQuery.eq('codigo_asesor', profile.codigo_asesor);
          } else if (role === 'jefe_ventas' && profile?.codigo_jefe) {
            pageQuery = pageQuery.eq('codigo_jefe', profile.codigo_jefe);
          }

          // Apply user filters
          if (filters.codigosAsesor.length > 0) {
            pageQuery = pageQuery.in('codigo_asesor', filters.codigosAsesor);
          }

          if (filters.codigoJefe) {
            pageQuery = pageQuery.eq('codigo_jefe', filters.codigoJefe);
          }

          if (filters.tipoVenta.length > 0) {
            const normalizedTypes = filters.tipoVenta.map(t => 
              t === 'ALIADOS' ? 'CONVENIO' : t
            );
            pageQuery = pageQuery.in('tipo_venta', [...new Set([...filters.tipoVenta, ...normalizedTypes])]);
          }

          const { data, error } = await pageQuery;

          if (error) throw error;

          if (data && data.length > 0) {
            allData = [...allData, ...data];
            hasMore = data.length === pageSize;
            page++;
          } else {
            hasMore = false;
          }
        }

        return allData;
     },
     enabled: !!profile,
   });
   
   // Fetch profiles for tipo_asesor filter
   const { data: profilesData } = useQuery({
     queryKey: ['comparative-profiles', filters.tipoAsesor, filters.regionalIds, role, profile?.regional_id],
     queryFn: async () => {
       let query = supabase
         .from('profiles')
         .select('codigo_asesor, tipo_asesor, regional_id')
         .eq('activo', true)
         .not('codigo_asesor', 'is', null);
       
       // Regional filter for leaders
       if (role === 'lider_zona' && profile?.regional_id) {
         query = query.eq('regional_id', profile.regional_id);
       } else if (filters.regionalIds.length > 0) {
         query = query.in('regional_id', filters.regionalIds);
       }
       
       if (filters.tipoAsesor.length > 0) {
         query = query.in('tipo_asesor', filters.tipoAsesor);
       }
       
       const { data, error } = await query;
       if (error) throw error;
       return data || [];
     },
     enabled: !!profile,
   });
   
   // Process data into daily aggregates
   const processedData = useMemo(() => {
     if (!salesData || !profilesData) return { daily: [], kpis: null };
     
     // Filter by tipo_asesor if needed
     const validCodigos = filters.tipoAsesor.length > 0
       ? new Set(profilesData.map(p => p.codigo_asesor))
       : null;
     
     const currentStart = format(currentPeriod.start, 'yyyy-MM-dd');
     const currentEnd = format(currentPeriod.end, 'yyyy-MM-dd');
     const prevStart = format(previousPeriod.start, 'yyyy-MM-dd');
     const prevEnd = format(previousPeriod.end, 'yyyy-MM-dd');
     
     // Group by day
     const dailyMap = new Map<number, DailySalesData>();
     
     // Initialize all days
     const maxDays = Math.max(currentPeriod.daysInMonth, previousPeriod.daysInMonth);
     for (let d = 1; d <= maxDays; d++) {
       dailyMap.set(d, {
         day: d,
         currentAmount: 0,
         previousAmount: 0,
         currentCount: 0,
         previousCount: 0,
       });
     }
     
     // Track unique sales (by cliente_identificacion + day)
     const currentUniqueSales = new Map<string, Set<number>>();
     const previousUniqueSales = new Map<string, Set<number>>();
     
     salesData.forEach(sale => {
       // Filter by tipo_asesor
       if (validCodigos && !validCodigos.has(sale.codigo_asesor)) return;
       
       const saleDate = sale.fecha;
       const day = parseInt(saleDate.split('-')[2]);
       const amount = sale.vtas_ant_i || 0;
       const clientId = sale.cliente_identificacion || sale.codigo_asesor;
       
       const entry = dailyMap.get(day);
       if (!entry) return;
       
       if (saleDate >= currentStart && saleDate <= currentEnd) {
         entry.currentAmount += amount;
         // Count unique sales
         if (!currentUniqueSales.has(clientId)) {
           currentUniqueSales.set(clientId, new Set());
         }
         if (!currentUniqueSales.get(clientId)!.has(day)) {
           currentUniqueSales.get(clientId)!.add(day);
           entry.currentCount += 1;
         }
       } else if (saleDate >= prevStart && saleDate <= prevEnd) {
         entry.previousAmount += amount;
         // Count unique sales
         if (!previousUniqueSales.has(clientId)) {
           previousUniqueSales.set(clientId, new Set());
         }
         if (!previousUniqueSales.get(clientId)!.has(day)) {
           previousUniqueSales.get(clientId)!.add(day);
           entry.previousCount += 1;
         }
       }
     });
     
     const daily = Array.from(dailyMap.values()).sort((a, b) => a.day - b.day);
     
      // Find the last day with current month data for fair comparison
      const lastDayWithCurrentData = daily.reduce((maxDay, d) => {
        if (d.currentAmount > 0 || d.currentCount > 0) {
          return Math.max(maxDay, d.day);
        }
        return maxDay;
      }, 0);
      
      // Calculate KPIs only up to the last day with current data (fair comparison)
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