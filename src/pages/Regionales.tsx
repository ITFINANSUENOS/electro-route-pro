import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { MetaTypeToggle, MetaType } from '@/components/dashboard/MetaTypeToggle';
import { usePeriodSelector } from '@/hooks/usePeriodSelector';
import { useRegionalesData } from '@/hooks/useRegionalesData';
import { RegionalesRankingTable } from '@/components/regionales/RegionalesRankingTable';
import { RegionalesBarChart } from '@/components/regionales/RegionalesBarChart';
import { RegionalesTipoVentaTable } from '@/components/regionales/RegionalesTipoVentaTable';
import { RegionalesHistoricoChart } from '@/components/regionales/RegionalesHistoricoChart';
import { Skeleton } from '@/components/ui/skeleton';

export default function Regionales() {
  const [metaType, setMetaType] = useState<MetaType>('comercial');
  const {
    selectedPeriod,
    periodValue,
    handlePeriodChange,
    availablePeriods,
    isLoading: periodsLoading,
  } = usePeriodSelector();

  const { ranking, historico, isLoading, prevMonth, prevYear } = useRegionalesData(
    selectedPeriod.mes,
    selectedPeriod.anio,
    metaType,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Regionales</h1>
            <p className="text-sm text-muted-foreground">Comparativo global de todas las regionales</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <MetaTypeToggle value={metaType} onChange={setMetaType} />
          <PeriodSelector
            value={periodValue}
            onChange={handlePeriodChange}
            periods={availablePeriods}
            isLoading={periodsLoading}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Ranking */}
          <RegionalesRankingTable data={ranking} metaType={metaType} />

          {/* Section 2: Bar Chart */}
          <RegionalesBarChart data={ranking} />

          {/* Section 3: Tipo de Venta */}
          <RegionalesTipoVentaTable data={ranking} />

          {/* Section 4: Historico */}
          <RegionalesHistoricoChart
            data={historico}
            currentMonth={selectedPeriod.mes}
            currentYear={selectedPeriod.anio}
            prevMonth={prevMonth}
            prevYear={prevYear}
          />
        </div>
      )}
    </div>
  );
}
