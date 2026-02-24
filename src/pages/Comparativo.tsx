 import { useState, useMemo } from 'react';
 import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, CalendarDays, History } from 'lucide-react';
 import { format, subMonths } from 'date-fns';
 import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
 import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
 import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
 import { usePeriodSelector } from '@/hooks/usePeriodSelector';
 import { useComparativeData, ComparativeFilters as FiltersType, ComparisonMode } from '@/hooks/useComparativeData';
 import { ComparativeFilters } from '@/components/comparativo/ComparativeFilters';
 import { ComparativeChart } from '@/components/comparativo/ComparativeChart';
 import { ComparativeKPICards } from '@/components/comparativo/ComparativeKPICards';
import { ComparativeTable } from '@/components/comparativo/ComparativeTable';
import { ComparativePieCharts } from '@/components/comparativo/ComparativePieCharts';
 import { useAuth } from '@/contexts/AuthContext';
 
 export default function Comparativo() {
   const { role } = useAuth();
  const { 
    selectedPeriod, 
    periodValue, 
    handlePeriodChange, 
    availablePeriods, 
    isLoading: periodsLoading 
  } = usePeriodSelector();
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('mes_anterior');
  const [showAmount, setShowAmount] = useState(true);
  const [showCount, setShowCount] = useState(true);
   const [filters, setFilters] = useState<FiltersType>({
     tipoAsesor: [],
     tipoVenta: [],
     codigoJefe: null,
     codigosAsesor: [],
     regionalIds: [],
   });
 
  const { dailyData, kpis, salesByType, isLoading, currentPeriod, previousPeriod } = useComparativeData(
    selectedPeriod.mes,
    selectedPeriod.anio,
    filters,
    comparisonMode
  );
 
   const currentMonthLabel = useMemo(() => {
     return format(currentPeriod.start, 'MMMM yyyy', { locale: es });
   }, [currentPeriod]);
 
   const previousMonthLabel = useMemo(() => {
     return format(previousPeriod.start, 'MMMM yyyy', { locale: es });
   }, [previousPeriod]);
 
  const comparisonLabel = comparisonMode === 'mes_anterior' ? 'vs mes anterior' : 'vs año anterior';

  return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       className="space-y-6"
     >
       {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Comparativo</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Ventas día a día entre períodos ({comparisonLabel})
                </p>
              </div>
            </div>
          <div className="flex items-center gap-3">
            {/* Comparison mode toggle */}
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setComparisonMode('mes_anterior')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  comparisonMode === 'mes_anterior'
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Mes anterior
              </button>
              <button
                onClick={() => setComparisonMode('anio_anterior')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  comparisonMode === 'anio_anterior'
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                <History className="h-3.5 w-3.5" />
                Año anterior
              </button>
            </div>
            <PeriodSelector
              value={periodValue}
              onChange={handlePeriodChange}
              periods={availablePeriods}
              isLoading={periodsLoading}
            />
          </div>
         </div>
 
         {/* Filters */}
         <ComparativeFilters filters={filters} onFiltersChange={setFilters} />
       </div>
 
       {/* KPIs */}
       {isLoading ? (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           {[...Array(4)].map((_, i) => (
             <Skeleton key={i} className="h-24" />
           ))}
         </div>
       ) : kpis ? (
         <ComparativeKPICards
           kpis={kpis}
           currentMonthLabel={currentMonthLabel}
           previousMonthLabel={previousMonthLabel}
         />
       ) : null}
 
       {/* Chart */}
       <Card>
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-lg flex items-center gap-2">
             <TrendingUp className="h-5 w-5 text-secondary" />
             Comparativo Día a Día
           </CardTitle>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="show-amount"
                checked={showAmount}
                onCheckedChange={setShowAmount}
              />
              <Label htmlFor="show-amount" className="text-xs font-medium">
                Monto ($)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-count"
                checked={showCount}
                onCheckedChange={setShowCount}
              />
              <Label htmlFor="show-count" className="text-xs font-medium">
                Cantidad (Q)
              </Label>
            </div>
          </div>
         </CardHeader>
         <CardContent>
           {isLoading ? (
             <Skeleton className="h-[400px] w-full" />
           ) : (
             <ComparativeChart
               data={dailyData}
              showAmount={showAmount}
              showCount={showCount}
               currentMonthLabel={currentMonthLabel}
               previousMonthLabel={previousMonthLabel}
             />
           )}
         </CardContent>
       </Card>
 
        {/* Pie Charts by Type */}
        {!isLoading && salesByType && (
          <ComparativePieCharts
            data={salesByType}
            currentMonthLabel={currentMonthLabel}
            previousMonthLabel={previousMonthLabel}
          />
        )}

        {/* Table */}
        {!isLoading && (
          <ComparativeTable
            data={dailyData}
            currentMonthLabel={currentMonthLabel}
            previousMonthLabel={previousMonthLabel}
          />
        )}
     </motion.div>
   );
 }