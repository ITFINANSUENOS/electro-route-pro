import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { MessageSquare, FileText, Maximize2, Minimize2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdvisorConsultasData {
  userId: string;
  nombre: string;
  codigo: string;
  consultas: number;
  solicitudes: number;
}

interface ConsultasDetailPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advisorData: AdvisorConsultasData[];
  title: string;
  type: 'consultas' | 'solicitudes';
  total: number;
}

export function ConsultasDetailPopup({
  open,
  onOpenChange,
  advisorData,
  title,
  type,
  total,
}: ConsultasDetailPopupProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  const sortedData = useMemo(() => {
    return [...advisorData]
      .filter(a => type === 'consultas' ? a.consultas > 0 : a.solicitudes > 0)
      .sort((a, b) => {
        const valueA = type === 'consultas' ? a.consultas : a.solicitudes;
        const valueB = type === 'consultas' ? b.consultas : b.solicitudes;
        return valueB - valueA;
      });
  }, [advisorData, type]);

  const Icon = type === 'consultas' ? MessageSquare : FileText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'transition-all duration-300',
          isMaximized
            ? 'w-[95vw] max-w-[95vw] h-[90vh] max-h-[90vh]'
            : 'w-full max-w-lg'
        )}
      >
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMaximized(!isMaximized)}
            className="h-8 w-8"
          >
            {isMaximized ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-bold text-primary">{total}</span>
          </div>

          {/* Advisors count */}
          <p className="text-sm text-muted-foreground">
            {sortedData.length} {sortedData.length === 1 ? 'asesor' : 'asesores'} con {type}
          </p>

          {/* Advisor list */}
          <ScrollArea
            className={cn(
              'rounded-lg border',
              isMaximized ? 'h-[calc(90vh-200px)]' : 'h-[300px]'
            )}
          >
            <div className="p-2 space-y-2">
              {sortedData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay {type} registradas
                </div>
              ) : (
                sortedData.map((advisor, index) => {
                  const value = type === 'consultas' ? advisor.consultas : advisor.solicitudes;
                  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

                  return (
                    <div
                      key={advisor.userId}
                      className="flex items-center justify-between p-3 rounded-lg bg-card hover:bg-muted/30 transition-colors border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium truncate max-w-[200px]">
                            {advisor.nombre}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Código: {advisor.codigo}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-lg font-bold text-foreground">{value}</span>
                          <span className="text-xs text-muted-foreground ml-1">({percentage}%)</span>
                        </div>
                        {/* Visual bar */}
                        <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
