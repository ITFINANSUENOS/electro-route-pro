 import { useState, useMemo } from 'react';
 import { motion } from 'framer-motion';
 import { BarChart3, TrendingUp, DollarSign, Hash } from 'lucide-react';
 import { format, subMonths } from 'date-fns';
 import { es } from 'date-fns/locale';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Skeleton } from '@/components/ui/skeleton';
 import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
 import { usePeriodSelector } from '@/hooks/usePeriodSelector';
 import { useComparativeData, ComparativeFilters as FiltersType } from '@/hooks/useComparativeData';
 import { ComparativeFilters } from '@/components/comparativo/ComparativeFilters';
 import { ComparativeChart } from '@/components/comparativo/ComparativeChart';
 import { ComparativeKPICards } from '@/components/comparativo/ComparativeKPICards';
 import { ComparativeTable } from '@/components/comparativo/ComparativeTable';
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
   const [metric, setMetric] = useState<'amount' | 'count'>('amount');
   const [filters, setFilters] = useState<FiltersType>({
     tipoAsesor: [],
     tipoVenta: [],
     codigoJefe: null,
     codigosAsesor: [],
     regionalIds: [],
   });
 
   const { dailyData, kpis, isLoading, currentPeriod, previousPeriod } = useComparativeData(
    selectedPeriod.mes,
    selectedPeriod.anio,
     filters
   );
 
   const currentMonthLabel = useMemo(() => {
     return format(currentPeriod.start, 'MMMM yyyy', { locale: es });
   }, [currentPeriod]);
 
   const previousMonthLabel = useMemo(() => {
     return format(previousPeriod.start, 'MMMM yyyy', { locale: es });
   }, [previousPeriod]);
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       className="space-y-6"
     >
       {/* Header */}
       <div className="flex flex-col gap-4">
         <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
           <div>
             <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
               <BarChart3 className="h-8 w-8 text-secondary" />
               Comparativo
             </h1>
             <p className="text-muted-foreground mt-1">
               Compara el rendimiento de ventas día a día entre períodos
             </p>
           </div>
          <PeriodSelector
            value={periodValue}
            onChange={handlePeriodChange}
            periods={availablePeriods}
            isLoading={periodsLoading}
          />
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
           <Tabs value={metric} onValueChange={(v) => setMetric(v as 'amount' | 'count')}>
             <TabsList className="h-8">
               <TabsTrigger value="amount" className="text-xs gap-1 px-3">
                 <DollarSign className="h-3 w-3" />
                 Monto
               </TabsTrigger>
               <TabsTrigger value="count" className="text-xs gap-1 px-3">
                 <Hash className="h-3 w-3" />
                 Cantidad
               </TabsTrigger>
             </TabsList>
           </Tabs>
         </CardHeader>
         <CardContent>
           {isLoading ? (
             <Skeleton className="h-[400px] w-full" />
           ) : (
             <ComparativeChart
               data={dailyData}
               metric={metric}
               currentMonthLabel={currentMonthLabel}
               previousMonthLabel={previousMonthLabel}
             />
           )}
         </CardContent>
       </Card>
 
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