import { useMemo } from 'react';
import { Filter, Download, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { exportRankingToExcel, RankingAdvisor as ExportAdvisor } from '@/utils/exportRankingExcel';

export interface RankingAdvisor {
  codigo: string;
  nombre: string;
  tipoAsesor: string;
  cedula?: string;
  regional?: string;
  total: number;
  meta: number;
  byType: Record<string, number>;
  filteredTotal?: number;
  salesCount?: number;
  salesCountByType?: Record<string, number>;
}

export type TipoVentaKey = 'CONTADO' | 'CREDICONTADO' | 'CREDITO' | 'CONVENIO';

export const tiposVentaLabels: Record<string, string> = {
  CONTADO: 'Contado',
  CREDICONTADO: 'Credi Contado',
  CREDITO: 'Crédito',
  CONVENIO: 'Convenio',
};

const tiposVentaShortLabels: Record<string, string> = {
  CONTADO: 'Contado',
  CREDICONTADO: 'C. Contado',
  CREDITO: 'Crédito',
  CONVENIO: 'Convenio',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyCompact = (value: number) => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

interface RankingTableProps {
  ranking: RankingAdvisor[];
  selectedFilters: TipoVentaKey[];
  onToggleFilter: (tipo: TipoVentaKey) => void;
  onExportExcel?: () => void;
  maxRows?: number;
  includeRegional?: boolean;
  title?: string;
  description?: string;
  salesCountByAdvisor?: Record<string, { totalCount: number; byType: Record<string, { count: number; value: number }> }>;
}

export function RankingTable({
  ranking,
  selectedFilters,
  onToggleFilter,
  onExportExcel,
  maxRows = 15,
  includeRegional = false,
  title = 'Ranking de Asesores',
  description = 'Ordenados por ventas según filtro',
  salesCountByAdvisor,
}: RankingTableProps) {
  // Calculate totals for selected types
  const typeTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    selectedFilters.forEach(tipo => {
      totals[tipo] = ranking.reduce((sum, advisor) => sum + (advisor.byType[tipo] || 0), 0);
    });
    return totals;
  }, [ranking, selectedFilters]);

  // Calculate total for ranking
  const rankingTotal = useMemo(() => {
    return ranking.reduce((sum, advisor) => {
      const displayTotal = selectedFilters.length > 0 
        ? (advisor.filteredTotal ?? advisor.total) 
        : advisor.total;
      return sum + displayTotal;
    }, 0);
  }, [ranking, selectedFilters]);

  const displayRanking = ranking.slice(0, maxRows);

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
              {title}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
          </div>
          {onExportExcel && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onExportExcel}
              className="flex items-center gap-2 self-start sm:self-auto"
            >
              <Download className="h-4 w-4" />
              <span className="hidden xs:inline">Descargar Excel</span>
              <span className="xs:hidden">Excel</span>
            </Button>
          )}
        </div>
        {/* Filters */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mt-3">
          <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
            <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
            Filtrar:
          </span>
          {(Object.keys(tiposVentaLabels) as TipoVentaKey[]).map((tipo) => (
            <label
              key={tipo}
              className="flex items-center gap-1.5 sm:gap-2 cursor-pointer"
            >
              <Checkbox
                checked={selectedFilters.includes(tipo)}
                onCheckedChange={() => onToggleFilter(tipo)}
                className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              />
              <span className="text-xs sm:text-sm">{tiposVentaLabels[tipo]}</span>
            </label>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ScrollArea className="max-h-[350px] sm:max-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b">
                  <th className="text-left py-2 px-1 sm:py-3 sm:px-2 font-medium text-muted-foreground whitespace-nowrap">Pos.</th>
                  <th className="text-left py-2 px-1 sm:py-3 sm:px-2 font-medium text-muted-foreground">Asesor</th>
                  {/* Dynamic columns for selected sale types */}
                  {selectedFilters.map(tipo => (
                    <th key={tipo} className="text-right py-2 px-1 sm:py-3 sm:px-2 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">
                      {tiposVentaShortLabels[tipo]}
                    </th>
                  ))}
                  <th className="text-right py-2 px-1 sm:py-3 sm:px-2 font-medium text-muted-foreground whitespace-nowrap">Ventas</th>
                  <th className="text-right py-2 px-1 sm:py-3 sm:px-2 font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">Meta</th>
                  <th className="text-right py-2 px-1 sm:py-3 sm:px-2 font-medium text-muted-foreground whitespace-nowrap">%</th>
                </tr>
              </thead>
              <tbody>
                {displayRanking.map((advisor, index) => {
                  const displayTotal = selectedFilters.length > 0 
                    ? (advisor.filteredTotal ?? advisor.total) 
                    : advisor.total;
                  const compliancePercent = advisor.meta > 0 
                    ? Math.round((displayTotal / advisor.meta) * 100) 
                    : 0;

                  return (
                    <tr key={advisor.codigo} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-2 px-1 sm:py-3 sm:px-2">
                        <span className={`inline-flex items-center justify-center h-5 w-5 sm:h-6 sm:w-6 rounded-full text-[10px] sm:text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-2 px-1 sm:py-3 sm:px-2 font-medium">
                        <span className="block truncate max-w-[100px] sm:max-w-[150px] lg:max-w-[200px]">
                          {advisor.nombre}
                        </span>
                      </td>
                      {/* Dynamic columns for selected sale types */}
                      {selectedFilters.map(tipo => {
                        const typeValue = advisor.byType[tipo] || 0;
                        const advisorSalesCount = salesCountByAdvisor?.[advisor.codigo];
                        const typeCount = advisorSalesCount?.byType[tipo]?.count || 0;
                        
                        return (
                          <td key={tipo} className="py-2 px-1 sm:py-3 sm:px-2 text-right text-muted-foreground hidden md:table-cell whitespace-nowrap">
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-pointer hover:underline">
                                    {formatCurrencyCompact(typeValue)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-popover border shadow-lg p-2">
                                  <div className="text-xs">
                                    <p className="font-medium">{formatCurrency(typeValue)}</p>
                                    <p className="text-muted-foreground">{typeCount} {typeCount === 1 ? 'venta' : 'ventas'}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                        );
                      })}
                      <td className="py-2 px-1 sm:py-3 sm:px-2 text-right whitespace-nowrap">
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-pointer hover:underline">
                                <span className="hidden sm:inline">{formatCurrency(displayTotal)}</span>
                                <span className="sm:hidden">{formatCurrencyCompact(displayTotal)}</span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-popover border shadow-lg p-2">
                              <div className="text-xs">
                                <p className="font-medium">{formatCurrency(displayTotal)}</p>
                                <p className="text-muted-foreground">
                                  {salesCountByAdvisor?.[advisor.codigo]?.totalCount || 0} {(salesCountByAdvisor?.[advisor.codigo]?.totalCount || 0) === 1 ? 'venta' : 'ventas'}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className="py-2 px-1 sm:py-3 sm:px-2 text-right text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                        {advisor.meta > 0 ? formatCurrencyCompact(advisor.meta) : '-'}
                      </td>
                      <td className="py-2 px-1 sm:py-3 sm:px-2 text-right">
                        {advisor.meta > 0 ? (
                          <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                            compliancePercent >= 100 ? 'bg-success/10 text-success' :
                            compliancePercent >= 80 ? 'bg-warning/10 text-warning' :
                            'bg-danger/10 text-danger'
                          }`}>
                            {compliancePercent}%
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="sticky bottom-0 bg-card border-t-2 z-10">
                <tr className="font-bold text-xs sm:text-sm">
                  <td className="py-2 px-1 sm:py-3 sm:px-2" colSpan={2}>TOTAL</td>
                  {/* Dynamic totals for selected sale types */}
                  {selectedFilters.map(tipo => (
                    <td key={tipo} className="py-2 px-1 sm:py-3 sm:px-2 text-right text-muted-foreground hidden md:table-cell whitespace-nowrap">
                      {formatCurrencyCompact(typeTotals[tipo] || 0)}
                    </td>
                  ))}
                  <td className="py-2 px-1 sm:py-3 sm:px-2 text-right text-primary whitespace-nowrap">
                    <span className="hidden sm:inline">{formatCurrency(rankingTotal)}</span>
                    <span className="sm:hidden">{formatCurrencyCompact(rankingTotal)}</span>
                  </td>
                  <td className="py-2 px-1 sm:py-3 sm:px-2 text-right hidden sm:table-cell">-</td>
                  <td className="py-2 px-1 sm:py-3 sm:px-2 text-right">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
