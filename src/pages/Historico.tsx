import { useState } from 'react';
import { History } from 'lucide-react';
import { useHistoricoData } from '@/hooks/useHistoricoData';
import { HistoricoKPICards } from '@/components/historico/HistoricoKPICards';
import { HistoricoBarChart } from '@/components/historico/HistoricoBarChart';
import { HistoricoCantidadChart } from '@/components/historico/HistoricoCantidadChart';
import { HistoricoTablaDetalle } from '@/components/historico/HistoricoTablaDetalle';
import { HistoricoRegionalGrid } from '@/components/historico/HistoricoRegionalGrid';
import { RegionalMultiSelect } from '@/components/dashboard/RegionalMultiSelect';
import { Skeleton } from '@/components/ui/skeleton';

export default function Historico() {
  const [tipoFilter, setTipoFilter] = useState<string[]>([]);
  const [selectedRegionalIds, setSelectedRegionalIds] = useState<string[]>([]);

  const { months, regionalRows, availableMonths, regionales, isLoading, isGlobalRole, role } = useHistoricoData(selectedRegionalIds, tipoFilter);

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
            <History className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Histórico de Ventas</h1>
            <p className="text-sm text-muted-foreground">
              Evolución de {months.length} meses con datos cargados
            </p>
          </div>
        </div>
        {showRegionalFilter && (
          <RegionalMultiSelect
            regionales={regionales}
            selectedIds={selectedRegionalIds}
            onChange={setSelectedRegionalIds}
          />
        )}
      </div>

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
