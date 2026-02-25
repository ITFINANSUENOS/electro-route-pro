import { useMemo, useState } from 'react';
import { Filter, Download, Users, ArrowUpDown, ArrowUp, ArrowDown, Maximize2, Minimize2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { formatCurrencyFull as formatCurrencyFullUtil, formatCurrencyThousands as formatCurrencyThousandsUtil } from '@/utils/formatCurrency';

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
  isGerencia?: boolean; // Flag to identify GERENCIA entries (not counted as advisors)
  activo?: boolean; // Whether the advisor is currently active
}

export type TipoVentaKey = 'CONTADO' | 'CREDICONTADO' | 'CREDITO' | 'ALIADOS';
export type TipoAsesorFilter = 'TODOS' | 'INTERNO' | 'EXTERNO' | 'CORRETAJE';

export const tiposVentaLabels: Record<string, string> = {
  CONTADO: 'Contado',
  CREDICONTADO: 'Credi Contado',
  CREDITO: 'Crédito',
  ALIADOS: 'Aliados',
};

const tiposVentaShortLabels: Record<string, string> = {
  CONTADO: 'Contado',
  CREDICONTADO: 'C. Contado',
  CREDITO: 'Crédito',
  ALIADOS: 'Aliados',
};

const tipoAsesorConfig: Record<string, { label: string; letter: string; bgColor: string; textColor: string }> = {
  INTERNO: { label: 'Interno', letter: 'i', bgColor: 'bg-primary', textColor: 'text-primary-foreground' },
  EXTERNO: { label: 'Externo', letter: 'e', bgColor: 'bg-success', textColor: 'text-success-foreground' },
  CORRETAJE: { label: 'Corretaje', letter: 'c', bgColor: 'bg-warning', textColor: 'text-warning-foreground' },
};

// Manual formatting - Intl.NumberFormat produces "millones de dólares" in some browsers
const formatCurrency = (value: number) => formatCurrencyFullUtil(value);
const formatCurrencyThousands = (value: number) => formatCurrencyThousandsUtil(value);

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
  maxRows,
  includeRegional = false,
  title = 'Ranking de Asesores',
  description = 'Ordenados por ventas según filtro',
  salesCountByAdvisor,
}: RankingTableProps) {
  const isMobile = useIsMobile();
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [tipoAsesorFilter, setTipoAsesorFilter] = useState<TipoAsesorFilter>('TODOS');
  const [isMaximized, setIsMaximized] = useState(false);

  // Helper to check if an advisor is GERENCIA (not counted as advisor)
  const isGerenciaEntry = (advisor: RankingAdvisor) => {
    const normalizedCode = advisor.codigo?.replace(/^0+/, '').trim().padStart(5, '0');
    return advisor.codigo === '01' || normalizedCode === '00001' || 
      advisor.nombre?.toUpperCase().includes('GENERAL') || 
      advisor.nombre?.toUpperCase().includes('GERENCIA') ||
      advisor.isGerencia === true;
  };

  // Count only real advisors (excluding GERENCIA entries)
  const realAdvisorCount = useMemo(() => {
    return ranking.filter(a => !isGerenciaEntry(a)).length;
  }, [ranking]);

  // Filter ranking by tipo asesor
  const filteredByTipoAsesor = useMemo(() => {
    if (tipoAsesorFilter === 'TODOS') return ranking;
    return ranking.filter(advisor => advisor.tipoAsesor?.toUpperCase() === tipoAsesorFilter);
  }, [ranking, tipoAsesorFilter]);

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
    if (!sortColumn) return filteredByTipoAsesor;

    return [...filteredByTipoAsesor].sort((a, b) => {
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
  }, [filteredByTipoAsesor, sortColumn, sortDirection, selectedFilters]);

  // Calculate totals for selected types (based on filtered data)
  const typeTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    selectedFilters.forEach(tipo => {
      totals[tipo] = filteredByTipoAsesor.reduce((sum, advisor) => sum + (advisor.byType[tipo] || 0), 0);
    });
    return totals;
  }, [filteredByTipoAsesor, selectedFilters]);

  // Calculate total for ranking (based on filtered data)
  const rankingTotal = useMemo(() => {
    return filteredByTipoAsesor.reduce((sum, advisor) => {
      const displayTotal = selectedFilters.length > 0 
        ? (advisor.filteredTotal ?? advisor.total) 
        : advisor.total;
      return sum + displayTotal;
    }, 0);
  }, [filteredByTipoAsesor, selectedFilters]);

  // Show all advisors if maxRows not specified
  const displayRanking = maxRows ? sortedRanking.slice(0, maxRows) : sortedRanking;

  // Render sort icon
  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === 'desc' 
      ? <ArrowDown className="h-3 w-3 ml-1 text-primary" />
      : <ArrowUp className="h-3 w-3 ml-1 text-primary" />;
  };

  // Count real advisors in filtered view (excluding GERENCIA)
  const filteredRealAdvisorCount = useMemo(() => {
    return filteredByTipoAsesor.filter(a => !isGerenciaEntry(a)).length;
  }, [filteredByTipoAsesor]);

  return (
    <Card className={`card-elevated transition-all duration-300 overflow-hidden ${isMaximized ? 'fixed inset-4 z-50 overflow-auto' : ''}`}>
      {/* Backdrop when maximized */}
      {isMaximized && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsMaximized(false)}
        />
      )}
      <div className={`relative ${isMaximized ? 'z-50 bg-card rounded-lg h-full flex flex-col' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
                {title}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {onExportExcel && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onExportExcel}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden xs:inline">Descargar Excel</span>
                  <span className="xs:hidden">Excel</span>
                </Button>
              )}
              {/* Maximize/Minimize button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsMaximized(!isMaximized)}
                className="flex items-center gap-2"
                title={isMaximized ? 'Minimizar' : 'Maximizar'}
              >
                {isMaximized ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3">
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
            
            {/* Tipo Asesor Filter */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs sm:text-sm text-muted-foreground">T.A:</span>
              <Select value={tipoAsesorFilter} onValueChange={(v) => setTipoAsesorFilter(v as TipoAsesorFilter)}>
                <SelectTrigger className="w-[110px] h-8 text-xs sm:text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="INTERNO">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">i</span>
                      Interno
                    </span>
                  </SelectItem>
                  <SelectItem value="EXTERNO">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-success text-success-foreground text-[10px] font-bold">e</span>
                      Externo
                    </span>
                  </SelectItem>
                  <SelectItem value="CORRETAJE">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-warning text-warning-foreground text-[10px] font-bold">c</span>
                      Corretaje
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className={`px-0 sm:px-4 overflow-hidden ${isMaximized ? 'flex-1 overflow-hidden' : ''}`}>
          <div className={`relative ${isMaximized ? 'h-[calc(100vh-220px)]' : 'h-[400px] sm:h-[500px]'}`}>
            <ScrollArea className="h-full w-full">
              <div className="min-w-[800px] pb-4 pr-4">
                <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-12 text-center">Pos.</TableHead>
                  <TableHead className="w-10 text-center">
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">T.A</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-popover border shadow-lg p-2">
                          <span className="text-xs">Tipo de Asesor</span>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  {/* Regional column - Only visible when maximized AND for coordinador/admin */}
                  {isMaximized && includeRegional && (
                    <TableHead className="min-w-[120px]">Regional</TableHead>
                  )}
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
                    
                  // Calculate meta based on selected filters - if filters active, sum only selected type metas
                  const displayMeta = selectedFilters.length > 0 && advisor.metaByType
                    ? selectedFilters.reduce((sum, tipo) => sum + (advisor.metaByType?.[tipo] || 0), 0)
                    : advisor.meta;
                    
                  const compliancePercent = displayMeta > 0 
                    ? (displayTotal / displayMeta) * 100
                    : 0;

                  // Calculate position in current filtered/sorted ranking
                  const originalIndex = sortColumn === null ? index : filteredByTipoAsesor.findIndex(r => r.codigo === advisor.codigo);

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
                      {/* T.A - Tipo Asesor Column */}
                      <TableCell className="text-center">
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {(() => {
                                const tipoUpper = advisor.tipoAsesor?.toUpperCase() || '';
                                const config = tipoAsesorConfig[tipoUpper];
                                if (config) {
                                  return (
                                    <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${config.bgColor} ${config.textColor}`}>
                                      {config.letter}
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                                    ?
                                  </span>
                                );
                              })()}
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-popover border shadow-lg p-2">
                              <span className="text-xs">{tipoAsesorConfig[advisor.tipoAsesor?.toUpperCase() || '']?.label || 'Sin definir'}</span>
                            </TooltipContent>
                          </Tooltip>
                      </TooltipProvider>
                      </TableCell>
                      {/* Regional column - Only visible when maximized AND for coordinador/admin */}
                      {isMaximized && includeRegional && (
                        <TableCell className="text-muted-foreground">
                          <span className="block whitespace-nowrap text-xs">
                            {advisor.regional || '-'}
                          </span>
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        <span className={`block whitespace-nowrap ${advisor.activo === false ? 'text-muted-foreground opacity-60' : ''}`}>
                          {advisor.nombre}
                          {advisor.activo === false && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Inactivo
                            </span>
                          )}
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
                                    <p className={`font-medium ${
                                      typeMeta > 0
                                        ? typeCompliance >= 100 ? 'text-success' :
                                          typeCompliance >= 80 ? 'text-warning' :
                                          'text-danger'
                                        : 'text-muted-foreground'
                                    }`}>
                                      {typeMeta > 0 ? `${typeCompliance}% cumplimiento` : 'Sin meta asignada'}
                                    </p>
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
                        {displayMeta > 0 ? formatCurrencyThousands(displayMeta) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {displayMeta > 0 ? (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            compliancePercent >= 100 ? 'bg-success/10 text-success' :
                            compliancePercent >= 80 ? 'bg-warning/10 text-warning' :
                            'bg-danger/10 text-danger'
                          }`}>
                            {compliancePercent.toFixed(1)}%
                          </span>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter className="sticky bottom-0 bg-card border-t-2 z-10">
                <TableRow className="font-bold text-sm">
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  {/* Regional column in footer - Only visible when maximized AND includeRegional */}
                  {isMaximized && includeRegional && (
                    <TableCell>-</TableCell>
                  )}
                  <TableCell>TOTAL ({filteredRealAdvisorCount} asesores)</TableCell>
                  {/* Dynamic totals for selected sale types */}
                  {selectedFilters.map(tipo => (
                    <TableCell key={tipo} className="text-right text-muted-foreground whitespace-nowrap">
                      {formatCurrencyThousands(typeTotals[tipo] || 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right text-primary whitespace-nowrap">
                    {isMobile ? formatCurrencyThousands(rankingTotal) : formatCurrency(rankingTotal)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrencyThousands(
                      filteredByTipoAsesor.reduce((sum, a) => {
                        // Calculate meta based on selected filters
                        const metaValue = selectedFilters.length > 0 && a.metaByType
                          ? selectedFilters.reduce((s, tipo) => s + (a.metaByType?.[tipo] || 0), 0)
                          : a.meta;
                        return sum + metaValue;
                      }, 0)
                    )}
                  </TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
              </div>
              <ScrollBar orientation="vertical" />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
