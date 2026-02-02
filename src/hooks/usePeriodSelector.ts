import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Period {
  mes: number;
  anio: number;
  estado: 'abierto' | 'cerrado';
  label: string;
}

interface UsePeriodSelectorOptions {
  defaultToCurrent?: boolean;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] || '';
}

export function formatPeriodLabel(mes: number, anio: number): string {
  return `${getMonthName(mes)} ${anio}`;
}

/**
 * Calculate date range for a given month/year period
 */
export function getPeriodDateRange(mes: number, anio: number): { startDate: string; endDate: string } {
  const startDate = new Date(anio, mes - 1, 1);
  const endDate = new Date(anio, mes, 0); // Last day of the month
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

export function usePeriodSelector(options: UsePeriodSelectorOptions = {}) {
  const { defaultToCurrent = true } = options;
  
  // Get current date info
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // State for selected period
  const [selectedPeriod, setSelectedPeriod] = useState<{ mes: number; anio: number }>({
    mes: currentMonth,
    anio: currentYear,
  });

  // Fetch available periods from database
  const { data: dbPeriods, isLoading } = useQuery({
    queryKey: ['sales-periods-selector'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periodos_ventas')
        .select('mes, anio, estado')
        .order('anio', { ascending: false })
        .order('mes', { ascending: false });
      
      if (error) throw error;
      return data as Array<{ mes: number; anio: number; estado: string }>;
    },
  });

  // Build available periods list
  const availablePeriods = useMemo((): Period[] => {
    const periodsMap = new Map<string, Period>();
    
    // Add periods from database
    dbPeriods?.forEach(p => {
      const key = `${p.anio}-${p.mes}`;
      periodsMap.set(key, {
        mes: p.mes,
        anio: p.anio,
        estado: p.estado as 'abierto' | 'cerrado',
        label: formatPeriodLabel(p.mes, p.anio),
      });
    });
    
    // Add current period if not exists
    const currentKey = `${currentYear}-${currentMonth}`;
    if (!periodsMap.has(currentKey)) {
      periodsMap.set(currentKey, {
        mes: currentMonth,
        anio: currentYear,
        estado: 'abierto',
        label: formatPeriodLabel(currentMonth, currentYear),
      });
    }
    
    // Sort by date descending
    return Array.from(periodsMap.values()).sort((a, b) => {
      if (a.anio !== b.anio) return b.anio - a.anio;
      return b.mes - a.mes;
    });
  }, [dbPeriods, currentMonth, currentYear]);

  // Get selected period details
  const selectedPeriodDetails = useMemo((): Period | undefined => {
    return availablePeriods.find(
      p => p.mes === selectedPeriod.mes && p.anio === selectedPeriod.anio
    );
  }, [availablePeriods, selectedPeriod]);

  // Calculate date range for selected period
  const dateRange = useMemo(() => {
    return getPeriodDateRange(selectedPeriod.mes, selectedPeriod.anio);
  }, [selectedPeriod]);

  // Handler for period change
  const handlePeriodChange = useCallback((value: string) => {
    const [anio, mes] = value.split('-').map(Number);
    setSelectedPeriod({ mes, anio });
  }, []);

  // Get value for select component
  const periodValue = useMemo(() => {
    return `${selectedPeriod.anio}-${selectedPeriod.mes}`;
  }, [selectedPeriod]);

  return {
    // Current selection
    selectedPeriod,
    setSelectedPeriod,
    periodValue,
    handlePeriodChange,
    
    // Available options
    availablePeriods,
    isLoading,
    
    // Computed values
    dateRange,
    isPeriodClosed: selectedPeriodDetails?.estado === 'cerrado',
    periodLabel: selectedPeriodDetails?.label || formatPeriodLabel(selectedPeriod.mes, selectedPeriod.anio),
    
    // Current period info
    currentMonth,
    currentYear,
    isCurrentPeriod: selectedPeriod.mes === currentMonth && selectedPeriod.anio === currentYear,
  };
}
