import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataService } from '@/services';
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
 * - Days 1-2 of any month: Data can go to PREVIOUS month (grace period for final upload)
 * - Days 3-31: Data belongs to CURRENT month only
 */
export function getTargetMonth(currentDate: Date = new Date()): { month: number; year: number } {
  const day = currentDate.getDate();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();

  // Within 2-day grace period, target previous month (if not yet closed)
  if (day <= 2) {
    if (currentMonth === 1) {
      return { month: 12, year: currentYear - 1 };
    }
    return { month: currentMonth - 1, year: currentYear };
  }

  return { month: currentMonth, year: currentYear };
}

/**
 * Check if we're in the grace period (days 1-2) where previous month can still receive data
 */
export function isGracePeriod(currentDate: Date = new Date()): boolean {
  return currentDate.getDate() <= 2;
}

export function useSalesPeriod() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all periods
  const { data: periods, isLoading, refetch } = useQuery({
    queryKey: ['sales-periods'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('periodos_ventas')
        .select('*')
        .order('anio', { ascending: false })
        .order('mes', { ascending: false }) as any);
      
      if (error) throw error;
      return data as SalesPeriod[];
    },
  });

  // Get or create a period for a specific month
  const getOrCreatePeriod = async (month: number, year: number): Promise<SalesPeriod> => {
    const { data: existing, error: fetchError } = await (dataService
      .from('periodos_ventas')
      .select('*')
      .eq('anio', year)
      .eq('mes', month)
      .maybeSingle() as any);

    if (fetchError) throw fetchError;
    if (existing) return existing as SalesPeriod;

    // Create new period
    const { data: newPeriod, error: insertError } = await (dataService
      .from('periodos_ventas')
      .insert({ anio: year, mes: month, estado: 'abierto' })
      .select()
      .single() as any);

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
      const { data, error } = await (dataService
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
        .single() as any);

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
    const inGrace = isGracePeriod(now);
    
    // If in grace period but previous month is already closed, use current month
    if (inGrace && isPeriodClosed(target.month, target.year)) {
      return { 
        month: now.getMonth() + 1, 
        year: now.getFullYear(), 
        isClosingDay: false 
      };
    }

    return { ...target, isClosingDay: inGrace };
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
