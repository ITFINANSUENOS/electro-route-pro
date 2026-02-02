import { Calendar, Lock, CheckCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Period } from '@/hooks/usePeriodSelector';

interface PeriodSelectorProps {
  value: string;
  onChange: (value: string) => void;
  periods: Period[];
  isLoading?: boolean;
  className?: string;
}

export function PeriodSelector({
  value,
  onChange,
  periods,
  isLoading = false,
  className,
}: PeriodSelectorProps) {
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <Calendar className="h-4 w-4" />
        <span>Cargando períodos...</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Seleccionar período" />
        </SelectTrigger>
        <SelectContent>
          {periods.map((period) => {
            const periodValue = `${period.anio}-${period.mes}`;
            return (
              <SelectItem key={periodValue} value={periodValue}>
                <div className="flex items-center gap-2">
                  {period.estado === 'cerrado' ? (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <CheckCircle className="h-3 w-3 text-success" />
                  )}
                  <span>{period.label}</span>
                  {period.estado === 'abierto' && (
                    <span className="text-xs text-muted-foreground">(activo)</span>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
