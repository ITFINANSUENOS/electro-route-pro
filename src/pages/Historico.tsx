import { useState } from 'react';
import { ChartLine } from 'lucide-react';
import { useHistoricoData, type HistoricoFiltersState } from '@/hooks/useHistoricoData';
import { HistoricoKPICards } from '@/components/historico/HistoricoKPICards';
import { HistoricoBarChart } from '@/components/historico/HistoricoBarChart';
import { HistoricoCantidadChart } from '@/components/historico/HistoricoCantidadChart';
import { HistoricoTablaDetalle } from '@/components/historico/HistoricoTablaDetalle';
import { HistoricoRegionalGrid } from '@/components/historico/HistoricoRegionalGrid';
import { HistoricoFilters } from '@/components/historico/HistoricoFilters';
import { RegionalMultiSelect } from '@/components/dashboard/RegionalMultiSelect';
import { Skeleton } from '@/components/ui/skeleton';
import type { MetaType } from '@/components/dashboard/MetaTypeToggle';

export default function Historico() {
  const [tipoFilter, setTipoFilter] = useState<string[]>([]);
  const [selectedRegionalIds, setSelectedRegionalIds] = useState<string[]>([]);
  const [metaType, setMetaType] = useState<MetaType>('comercial');
  const [comparableMode, setComparableMode] = useState(false);
  const [filters, setFilters] = useState<HistoricoFiltersState>({});

  const {
    months, regionalRows, availableMonths, regionales, jefes, advisorOptions,
    isLoading, isGlobalRole, role, periodos,
  } = useHistoricoData(selectedRegionalIds, tipoFilter, metaType, comparableMode, filters);

  const monthLabels: Record<string, string> = {};
  months.forEach(m => { monthLabels[m.key] = m.label; });

  const showRegionalFilter = (role === 'coordinador_comercial' || role === 'administrador');

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-accent p-2">
            <ChartLine className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Histórico de Ventas</h1>
            <p className="text-sm text-muted-foreground">
              Evolución de {months.length} meses con datos cargados
              {comparableMode && <span className="ml-1 text-warning">(sin complementos FNZ)</span>}
            </p>
          </div>
        </div>
        {showRegionalFilter && (
          <RegionalMultiSelect
            regionales={regionales}
            selectedCodes={selectedRegionalIds}
            onChange={setSelectedRegionalIds}
          />
        )}
      </div>

      {/* Filters row */}
      <HistoricoFilters
        role={role}
        jefes={jefes}
        advisorOptions={advisorOptions}
        periodos={periodos}
        filters={filters}
        onFiltersChange={setFilters}
        metaType={metaType}
        onMetaTypeChange={setMetaType}
        comparableMode={comparableMode}
        onComparableModeChange={setComparableMode}
      />

      {months.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No hay datos históricos disponibles.
        </div>
      ) : (
        <>
          <HistoricoKPICards months={months} />
          <HistoricoBarChart months={months} tipoFilter={tipoFilter} onTipoFilterChange={setTipoFilter} />
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
            <HistoricoCantidadChart months={months} />
          </div>
          <HistoricoTablaDetalle months={months} />
          {isGlobalRole && (
            <HistoricoRegionalGrid
              regionalRows={regionalRows}
              availableMonths={availableMonths}
              monthLabels={monthLabels}
            />
          )}
        </>
      )}
    </div>
  );
}
