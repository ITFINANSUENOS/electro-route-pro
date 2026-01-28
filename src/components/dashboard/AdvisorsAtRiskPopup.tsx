import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, Info } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AdvisorAtRisk {
  codigo: string;
  nombre: string;
  total: number;
  meta: number;
  compliance: number;
  projectedCompliance: number;
  byType: Record<string, number>;
  metaByType?: Record<string, number>;
}

interface AdvisorsAtRiskPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advisorsAtRisk: AdvisorAtRisk[];
  title?: string;
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

export function AdvisorsAtRiskPopup({
  open,
  onOpenChange,
  advisorsAtRisk,
  title = 'Asesores en Riesgo',
}: AdvisorsAtRiskPopupProps) {
  const [selectedAdvisor, setSelectedAdvisor] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(85vh-100px)] pr-2">
          {advisorsAtRisk.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingDown className="h-12 w-12 mx-auto mb-4 text-success" />
              <p className="text-lg font-medium">¡Excelente!</p>
              <p>Todos los asesores proyectan cumplir su meta</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                {advisorsAtRisk.length} {advisorsAtRisk.length === 1 ? 'asesor no proyecta' : 'asesores no proyectan'} cumplir la meta al ritmo actual
              </p>
              
              {advisorsAtRisk.map((advisor) => {
                const isExpanded = selectedAdvisor === advisor.codigo;
                
                return (
                  <TooltipProvider key={advisor.codigo} delayDuration={300}>
                    <div
                      className={`p-3 sm:p-4 rounded-lg border transition-all cursor-pointer ${
                        isExpanded 
                          ? 'bg-danger/10 border-danger/30 ring-1 ring-danger/30' 
                          : 'bg-danger/5 border-danger/20 hover:bg-danger/10'
                      }`}
                      onClick={() => setSelectedAdvisor(isExpanded ? null : advisor.codigo)}
                    >
                      {/* Header Row */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm sm:text-base truncate">{advisor.nombre}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs p-3 bg-popover border shadow-lg">
                                <p className="text-xs font-medium mb-2">Desglose por tipo de venta:</p>
                                <div className="space-y-1.5">
                                  {Object.entries(advisor.byType)
                                    .filter(([_, value]) => value !== 0)
                                    .map(([tipo, value]) => {
                                      const meta = advisor.metaByType?.[tipo] || 0;
                                      const typeCompliance = meta > 0 ? ((value / meta) * 100).toFixed(1) : 0;
                                      return (
                                        <div key={tipo} className="flex items-center justify-between gap-3 text-xs">
                                          <span className={`px-1.5 py-0.5 rounded ${tiposVentaColors[tipo] || 'bg-muted'}`}>
                                            {tiposVentaLabels[tipo] || tipo}
                                          </span>
                                          <div className="text-right">
                                            <span className="font-medium">{formatCurrency(value)}</span>
                                            {meta > 0 && (
                                              <span className={`ml-2 ${
                                                Number(typeCompliance) >= 80 ? 'text-success' :
                                                Number(typeCompliance) >= 50 ? 'text-warning' :
                                                'text-danger'
                                              }`}>
                                                ({typeCompliance}%)
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                                {advisor.metaByType && Object.keys(advisor.metaByType).length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-border">
                                    <p className="text-xs text-muted-foreground">Metas por tipo:</p>
                                    {Object.entries(advisor.metaByType)
                                      .filter(([_, value]) => value > 0)
                                      .map(([tipo, value]) => (
                                        <div key={tipo} className="flex justify-between text-xs mt-1">
                                          <span>{tiposVentaLabels[tipo] || tipo}:</span>
                                          <span className="text-muted-foreground">{formatCurrency(value)}</span>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>Actual: {formatCurrency(advisor.total)}</span>
                            <span>•</span>
                            <span>Meta: {formatCurrency(advisor.meta)}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                          <StatusBadge 
                            status={advisor.compliance < 50 ? 'danger' : 'warning'} 
                            label={`${advisor.compliance.toFixed(1)}%`} 
                            size="sm" 
                          />
                          <span className="text-[10px] text-muted-foreground">
                            Proyección: {advisor.projectedCompliance.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-2">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              advisor.compliance < 50 ? 'bg-danger' : 'bg-warning'
                            }`}
                            style={{ width: `${Math.min(advisor.compliance, 100)}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                          <p className="text-xs font-medium text-foreground">Detalle por tipo de venta:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(advisor.byType)
                              .filter(([_, value]) => value !== 0)
                              .map(([tipo, value]) => {
                                const meta = advisor.metaByType?.[tipo] || 0;
                                const typeCompliance = meta > 0 ? ((value / meta) * 100).toFixed(1) : 0;
                                return (
                                  <div key={tipo} className="p-2 rounded bg-background/50 border border-border/50">
                                    <div className="flex items-center justify-between">
                                      <Badge variant="outline" className={tiposVentaColors[tipo]}>
                                        {tiposVentaLabels[tipo] || tipo}
                                      </Badge>
                                      {meta > 0 && (
                                        <span className={`text-xs font-medium ${
                                          Number(typeCompliance) >= 80 ? 'text-success' :
                                          Number(typeCompliance) >= 50 ? 'text-warning' :
                                          'text-danger'
                                        }`}>
                                          {typeCompliance}%
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
                          </div>
                        </div>
                      )}
                    </div>
                  </TooltipProvider>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
