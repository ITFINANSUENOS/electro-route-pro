import { useMemo, useState } from 'react';
import { Filter, Download, Users, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

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
  metaByType?: Record<string, number>;  // Meta per sale type for compliance calculation
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

// Format in thousands with K suffix for better visibility
const formatCurrencyThousands = (value: number) => {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toLocaleString('es-CO', { maximumFractionDigits: 0 })}K`;
  }
  return `$${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
};

type SortColumn = TipoVentaKey | 'total' | 'compliance' | null;
type SortDirection = 'asc' | 'desc';

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
  const isMobile = useIsMobile();
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Handle column header click for sorting
  const handleColumnSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      // New column, default to desc (highest first)
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Sort ranking based on selected column
  const sortedRanking = useMemo(() => {
    if (!sortColumn) return ranking;

    return [...ranking].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      if (sortColumn === 'total') {
        aValue = selectedFilters.length > 0 ? (a.filteredTotal ?? a.total) : a.total;
        bValue = selectedFilters.length > 0 ? (b.filteredTotal ?? b.total) : b.total;
      } else if (sortColumn === 'compliance') {
        aValue = a.meta > 0 ? (a.total / a.meta) * 100 : 0;
        bValue = b.meta > 0 ? (b.total / b.meta) * 100 : 0;
      } else {
        // Sale type column
        aValue = a.byType[sortColumn] || 0;
        bValue = b.byType[sortColumn] || 0;
      }

      return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
    });
  }, [ranking, sortColumn, sortDirection, selectedFilters]);

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

  const displayRanking = sortedRanking.slice(0, maxRows);

  // Render sort icon
  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === 'desc' 
      ? <ArrowDown className="h-3 w-3 ml-1 text-primary" />
      : <ArrowUp className="h-3 w-3 ml-1 text-primary" />;
  };

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
      <CardContent className="px-2 sm:px-4">
        <ScrollArea className="max-h-[400px] sm:max-h-[450px] w-full">
          <div className="min-w-[600px] sm:min-w-[800px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-12 text-center">Pos.</TableHead>
                  <TableHead className="min-w-[200px] sm:min-w-[250px]">Asesor</TableHead>
                  {/* Dynamic columns for selected sale types - sortable */}
                  {selectedFilters.map(tipo => (
                    <TableHead 
                      key={tipo} 
                      className="text-right cursor-pointer hover:bg-muted/50 transition-colors whitespace-nowrap"
                      onClick={() => handleColumnSort(tipo)}
                    >
                      <div className="flex items-center justify-end">
                        {tiposVentaShortLabels[tipo]}
                        {renderSortIcon(tipo)}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50 transition-colors whitespace-nowrap"
                    onClick={() => handleColumnSort('total')}
                  >
                    <div className="flex items-center justify-end">
                      Ventas
                      {renderSortIcon('total')}
                    </div>
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">Meta</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50 transition-colors whitespace-nowrap"
                    onClick={() => handleColumnSort('compliance')}
                  >
                    <div className="flex items-center justify-end">
                      %
                      {renderSortIcon('compliance')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRanking.map((advisor, index) => {
                  const displayTotal = selectedFilters.length > 0 
                    ? (advisor.filteredTotal ?? advisor.total) 
                    : advisor.total;
                  const compliancePercent = advisor.meta > 0 
                    ? Math.round((displayTotal / advisor.meta) * 100) 
                    : 0;

                  // Calculate original position in unsorted ranking
                  const originalIndex = sortColumn === null ? index : ranking.findIndex(r => r.codigo === advisor.codigo);

                  return (
                    <TableRow key={advisor.codigo} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                          originalIndex === 0 ? 'bg-yellow-100 text-yellow-700' :
                          originalIndex === 1 ? 'bg-gray-100 text-gray-700' :
                          originalIndex === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {originalIndex + 1}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className="block whitespace-nowrap">
                          {advisor.nombre}
                        </span>
                      </TableCell>
                      {/* Dynamic columns for selected sale types */}
                      {selectedFilters.map(tipo => {
                        const typeValue = advisor.byType[tipo] || 0;
                        const advisorSalesCount = salesCountByAdvisor?.[advisor.codigo];
                        const typeCount = advisorSalesCount?.byType[tipo]?.count || 0;
                        const typeMeta = advisor.metaByType?.[tipo] || 0;
                        const typeCompliance = typeMeta > 0 ? Math.round((typeValue / typeMeta) * 100) : 0;
                        
                        return (
                          <TableCell key={tipo} className="text-right text-muted-foreground whitespace-nowrap">
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-pointer hover:underline">
                                    {formatCurrencyThousands(typeValue)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-popover border shadow-lg p-2">
                                  <div className="text-xs space-y-1">
                                    <p className="font-medium">{formatCurrency(typeValue)}</p>
                                    <p className="text-muted-foreground">{typeCount} {typeCount === 1 ? 'venta' : 'ventas'}</p>
                                    {typeMeta > 0 && (
                                      <p className={`font-medium ${
                                        typeCompliance >= 100 ? 'text-success' :
                                        typeCompliance >= 80 ? 'text-warning' :
                                        'text-danger'
                                      }`}>
                                        {typeCompliance}% cumplimiento
                                      </p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right whitespace-nowrap font-medium">
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-pointer hover:underline">
                                {isMobile ? formatCurrencyThousands(displayTotal) : formatCurrency(displayTotal)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-popover border shadow-lg p-2">
                              <div className="text-xs space-y-1">
                                <p className="font-medium">{formatCurrency(displayTotal)}</p>
                                <p className="text-muted-foreground">
                                  {salesCountByAdvisor?.[advisor.codigo]?.totalCount || 0} {(salesCountByAdvisor?.[advisor.codigo]?.totalCount || 0) === 1 ? 'venta' : 'ventas'}
                                </p>
                                {advisor.meta > 0 && (
                                  <p className={`font-medium ${
                                    compliancePercent >= 100 ? 'text-success' :
                                    compliancePercent >= 80 ? 'text-warning' :
                                    'text-danger'
                                  }`}>
                                    {compliancePercent}% cumplimiento total
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                        {advisor.meta > 0 ? formatCurrencyThousands(advisor.meta) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {advisor.meta > 0 ? (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            compliancePercent >= 100 ? 'bg-success/10 text-success' :
                            compliancePercent >= 80 ? 'bg-warning/10 text-warning' :
                            'bg-danger/10 text-danger'
                          }`}>
                            {compliancePercent}%
                          </span>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter className="sticky bottom-0 bg-card border-t-2 z-10">
                <TableRow className="font-bold text-sm">
                  <TableCell colSpan={2}>TOTAL</TableCell>
                  {/* Dynamic totals for selected sale types */}
                  {selectedFilters.map(tipo => (
                    <TableCell key={tipo} className="text-right text-muted-foreground whitespace-nowrap">
                      {formatCurrencyThousands(typeTotals[tipo] || 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right text-primary whitespace-nowrap">
                    {isMobile ? formatCurrencyThousands(rankingTotal) : formatCurrency(rankingTotal)}
                  </TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
