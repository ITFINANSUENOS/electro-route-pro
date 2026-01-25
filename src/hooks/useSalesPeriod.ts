import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SalesPeriod {
  id: string;
  anio: number;
  mes: number;
  estado: 'abierto' | 'cerrado';
  fecha_cierre: string | null;
  cerrado_por: string | null;
  registros_totales: number;
  monto_total: number;
  created_at: string;
  updated_at: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] || '';
}

/**
 * Determines which month sales data should be assigned to based on current date logic:
 * - Day 1 of any month: Data belongs to PREVIOUS month (until closed)
 * - Days 2-31: Data belongs to CURRENT month
 */
export function getTargetMonth(currentDate: Date = new Date()): { month: number; year: number } {
  const day = currentDate.getDate();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();

  // On day 1, data goes to previous month (until closed)
  if (day === 1) {
    if (currentMonth === 1) {
      return { month: 12, year: currentYear - 1 };
    }
    return { month: currentMonth - 1, year: currentYear };
  }

  return { month: currentMonth, year: currentYear };
}

/**
 * Check if today is day 1 of the month (close period prompt should appear)
 */
export function isClosingDay(currentDate: Date = new Date()): boolean {
  return currentDate.getDate() === 1;
}

export function useSalesPeriod() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all periods
  const { data: periods, isLoading, refetch } = useQuery({
    queryKey: ['sales-periods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periodos_ventas')
        .select('*')
        .order('anio', { ascending: false })
        .order('mes', { ascending: false });
      
      if (error) throw error;
      return data as SalesPeriod[];
    },
  });

  // Get or create a period for a specific month
  const getOrCreatePeriod = async (month: number, year: number): Promise<SalesPeriod> => {
    const { data: existing, error: fetchError } = await supabase
      .from('periodos_ventas')
      .select('*')
      .eq('anio', year)
      .eq('mes', month)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (existing) return existing as SalesPeriod;

    // Create new period
    const { data: newPeriod, error: insertError } = await supabase
      .from('periodos_ventas')
      .insert({ anio: year, mes: month, estado: 'abierto' })
      .select()
      .single();

    if (insertError) throw insertError;
    return newPeriod as SalesPeriod;
  };

  // Close a period
  const closePeriodMutation = useMutation({
    mutationFn: async ({ month, year, totalRecords, totalAmount }: { 
      month: number; 
      year: number; 
      totalRecords: number; 
      totalAmount: number 
    }) => {
      const { data, error } = await supabase
        .from('periodos_ventas')
        .update({
          estado: 'cerrado',
          fecha_cierre: new Date().toISOString(),
          cerrado_por: user?.id,
          registros_totales: totalRecords,
          monto_total: totalAmount
        })
        .eq('anio', year)
        .eq('mes', month)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-periods'] });
    }
  });

  // Check if a specific month is closed
  const isPeriodClosed = (month: number, year: number): boolean => {
    const period = periods?.find(p => p.mes === month && p.anio === year);
    return period?.estado === 'cerrado';
  };

  // Get current target period (where data should go)
  const getCurrentTargetPeriod = (): { month: number; year: number; isClosingDay: boolean } => {
    const now = new Date();
    const target = getTargetMonth(now);
    
    // If it's day 1 but the previous month is already closed, use current month
    if (isClosingDay(now) && isPeriodClosed(target.month, target.year)) {
      return { 
        month: now.getMonth() + 1, 
        year: now.getFullYear(), 
        isClosingDay: false 
      };
    }

    return { ...target, isClosingDay: isClosingDay(now) };
  };

  return {
    periods,
    isLoading,
    refetch,
    getOrCreatePeriod,
    closePeriod: closePeriodMutation.mutateAsync,
    isClosingPeriod: closePeriodMutation.isPending,
    isPeriodClosed,
    getCurrentTargetPeriod,
    getMonthName
  };
}
