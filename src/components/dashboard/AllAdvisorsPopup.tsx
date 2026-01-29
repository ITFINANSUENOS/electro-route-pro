import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';

interface AdvisorData {
  codigo: string;
  nombre: string;
  total: number;
  meta: number;
  byType: Record<string, number>;
  metaByType?: Record<string, number>;
  tipoAsesor?: string;
  regional?: string;
}

interface AllAdvisorsPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advisors: AdvisorData[];
  showRegional?: boolean;
  onDownload?: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const tiposVentaLabels: Record<string, string> = {
  CONTADO: 'Contado',
  CREDICONTADO: 'Credi Contado',
  CREDITO: 'Crédito',
  CONVENIO: 'Convenio',
};

const tiposVentaColors: Record<string, string> = {
  CONTADO: 'bg-success/20 text-success',
  CREDICONTADO: 'bg-warning/20 text-warning',
  CREDITO: 'bg-primary/20 text-primary',
  CONVENIO: 'bg-secondary/20 text-secondary',
};

const tipoAsesorLabels: Record<string, string> = {
  'INTERNO': 'Interno',
  'EXTERNO': 'Externo',
  'CORRETAJE': 'Corretaje',
};

const tipoAsesorColors: Record<string, string> = {
  'INTERNO': 'bg-primary/20 text-primary border-primary/30',
  'EXTERNO': 'bg-success/20 text-success border-success/30',
  'CORRETAJE': 'bg-warning/20 text-warning border-warning/30',
};

export function AllAdvisorsPopup({
  open,
  onOpenChange,
  advisors,
  showRegional = false,
  onDownload,
}: AllAdvisorsPopupProps) {
  const [expandedAdvisor, setExpandedAdvisor] = useState<string | null>(null);

  // Filter out GERENCIA entries and sort by total sales descending
  const sortedAdvisors = useMemo(() => {
    return [...advisors]
      .filter(a => {
        const isGerencia = a.codigo === '01' || a.codigo === '00001' || 
          a.nombre?.toUpperCase().includes('GENERAL') || a.nombre?.toUpperCase().includes('GERENCIA');
        return !isGerencia;
      })
      .sort((a, b) => b.total - a.total);
  }, [advisors]);

  // Calculate totals for the header
  const totalSales = useMemo(() => 
    sortedAdvisors.reduce((sum, a) => sum + a.total, 0), 
    [sortedAdvisors]
  );
  
  const totalMeta = useMemo(() => 
    sortedAdvisors.reduce((sum, a) => sum + a.meta, 0), 
    [sortedAdvisors]
  );

  const overallCompliance = totalMeta > 0 ? (totalSales / totalMeta) * 100 : 0;

  // Project compliance calculation
  const dayOfMonth = new Date().getDate();
  const daysInMonth = 31;
  const projectionFactor = daysInMonth / Math.max(dayOfMonth, 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader className="pr-8">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Todos los Asesores
            </DialogTitle>
            {onDownload && sortedAdvisors.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDownload}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Descargar</span>
              </Button>
            )}
          </div>
          <DialogDescription>
            {sortedAdvisors.length} asesores • {formatCurrency(totalSales)} vendido • {overallCompliance.toFixed(1)}% de cumplimiento
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(85vh-120px)] pr-2">
          {sortedAdvisors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted" />
              <p className="text-lg font-medium">Sin asesores</p>
              <p>No hay asesores activos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedAdvisors.map((advisor) => {
                const isExpanded = expandedAdvisor === advisor.codigo;
                const compliance = advisor.meta > 0 ? (advisor.total / advisor.meta) * 100 : 0;
                const projected = advisor.total * projectionFactor;
                const projectedCompliance = advisor.meta > 0 ? (projected / advisor.meta) * 100 : 0;
                const willMeetGoal = advisor.meta > 0 && projected >= advisor.meta;
                const tipoAsesor = (advisor.tipoAsesor || 'EXTERNO').toUpperCase();
                
                // Sort sale types by value descending
                const sortedSaleTypes = Object.entries(advisor.byType)
                  .sort(([, a], [, b]) => b - a);
                
                return (
                  <div
                    key={advisor.codigo}
                    className={`p-3 sm:p-4 rounded-lg border transition-all cursor-pointer bg-card hover:bg-muted/30 ${
                      isExpanded ? 'ring-1 ring-border' : ''
                    }`}
                    onClick={() => setExpandedAdvisor(isExpanded ? null : advisor.codigo)}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm sm:text-base truncate">{advisor.nombre}</span>
                          {/* Tipo Asesor Badge */}
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-1.5 py-0 h-5 ${tipoAsesorColors[tipoAsesor] || 'bg-muted'}`}
                          >
                            {tipoAsesorLabels[tipoAsesor] || tipoAsesor}
                          </Badge>
                          {/* Regional Badge - Only for coordinador/admin */}
                          {showRegional && advisor.regional && (
                            <Badge 
                              variant="outline" 
                              className="text-[10px] px-1.5 py-0 h-5 bg-muted/50 text-muted-foreground border-muted"
                            >
                              {advisor.regional}
                            </Badge>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>Actual: {formatCurrency(advisor.total)}</span>
                          <span>•</span>
                          <span>Meta: {formatCurrency(advisor.meta)}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge 
                          status={
                            compliance >= 100 ? 'success' :
                            willMeetGoal ? 'warning' : 
                            compliance >= 50 ? 'warning' : 'danger'
                          } 
                          label={`${compliance.toFixed(1)}%`} 
                          size="sm" 
                        />
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Proyección: {projectedCompliance.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            compliance >= 100 ? 'bg-success' :
                            willMeetGoal ? 'bg-warning' :
                            compliance >= 50 ? 'bg-warning' : 'bg-danger'
                          }`}
                          style={{ width: `${Math.min(compliance, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Expanded Details - Sorted by sales value */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        <p className="text-xs font-medium text-foreground">Detalle por tipo de venta (ordenado por valor):</p>
                        <div className="grid grid-cols-2 gap-2">
                          {sortedSaleTypes.map(([tipo, value]) => {
                            const meta = advisor.metaByType?.[tipo] || 0;
                            const typeCompliance = meta > 0 ? ((value / meta) * 100) : 0;
                            const typeProjected = value * projectionFactor;
                            const typeWillMeet = meta > 0 && typeProjected >= meta;
                            
                            return (
                              <div key={tipo} className="p-2 rounded bg-background/50 border border-border/50">
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline" className={tiposVentaColors[tipo] || 'bg-muted'}>
                                    {tiposVentaLabels[tipo] || tipo}
                                  </Badge>
                                  {meta > 0 && (
                                    <span className={`text-xs font-medium ${
                                      typeCompliance >= 100 ? 'text-success' :
                                      typeWillMeet ? 'text-warning' :
                                      typeCompliance >= 50 ? 'text-warning' :
                                      'text-danger'
                                    }`}>
                                      {typeCompliance.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-medium mt-1">{formatCurrency(value)}</p>
                                {meta > 0 && (
                                  <p className="text-[10px] text-muted-foreground">Meta: {formatCurrency(meta)}</p>
                                )}
                              </div>
                            );
                          })}
                          {/* Show sale types with 0 value if they have a meta */}
                          {['CONTADO', 'CREDICONTADO', 'CREDITO', 'CONVENIO']
                            .filter(tipo => 
                              !sortedSaleTypes.some(([t]) => t === tipo) && 
                              (advisor.metaByType?.[tipo] || 0) > 0
                            )
                            .map(tipo => {
                              const meta = advisor.metaByType?.[tipo] || 0;
                              return (
                                <div key={tipo} className="p-2 rounded bg-background/50 border border-border/50">
                                  <div className="flex items-center justify-between">
                                    <Badge variant="outline" className={tiposVentaColors[tipo] || 'bg-muted'}>
                                      {tiposVentaLabels[tipo] || tipo}
                                    </Badge>
                                    <span className="text-xs font-medium text-danger">0%</span>
                                  </div>
                                  <p className="text-sm font-medium mt-1">{formatCurrency(0)}</p>
                                  <p className="text-[10px] text-muted-foreground">Meta: {formatCurrency(meta)}</p>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
