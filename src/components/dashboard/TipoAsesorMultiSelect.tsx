import { useState } from 'react';
import { Check, ChevronDown, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TipoAsesor {
  value: string;
  label: string;
}

const TIPOS_ASESOR: TipoAsesor[] = [
  { value: 'INTERNO', label: 'Internos' },
  { value: 'EXTERNO', label: 'Externos' },
  { value: 'CORRETAJE', label: 'Corretaje' },
];

interface TipoAsesorMultiSelectProps {
  selectedTypes: string[];
  onChange: (types: string[]) => void;
  className?: string;
}

export function TipoAsesorMultiSelect({
  selectedTypes,
  onChange,
  className,
}: TipoAsesorMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (value: string) => {
    if (selectedTypes.includes(value)) {
      onChange(selectedTypes.filter(t => t !== value));
    } else {
      onChange([...selectedTypes, value]);
    }
  };

  const handleSelectAll = () => {
    if (selectedTypes.length === TIPOS_ASESOR.length) {
      onChange([]);
    } else {
      onChange(TIPOS_ASESOR.map(t => t.value));
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  const getDisplayText = () => {
    if (selectedTypes.length === 0) {
      return 'Todos los tipos';
    }
    if (selectedTypes.length === 1) {
      const tipo = TIPOS_ASESOR.find(t => t.value === selectedTypes[0]);
      return tipo?.label || selectedTypes[0];
    }
    return `${selectedTypes.length} tipos`;
  };

  const selectedLabels = selectedTypes.map(value => {
    const tipo = TIPOS_ASESOR.find(t => t.value === value);
    return tipo?.label || value;
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-9 px-3 justify-between bg-card text-sm", className)}
          size="sm"
        >
          <div className="flex items-center gap-1.5 truncate">
            <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{getDisplayText()}</span>
          </div>
          <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="flex items-center justify-between">
            <button
              onClick={handleSelectAll}
              className="text-xs text-primary hover:underline"
            >
              {selectedTypes.length === TIPOS_ASESOR.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
            {selectedTypes.length > 0 && (
              <button
                onClick={handleClear}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Limpiar
              </button>
            )}
          </div>
        </div>
        <div className="max-h-[200px] overflow-auto p-1">
          {TIPOS_ASESOR.map((tipo) => {
            const isSelected = selectedTypes.includes(tipo.value);
            return (
              <div
                key={tipo.value}
                onClick={() => handleToggle(tipo.value)}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  isSelected && "bg-accent/50"
                )}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  {isSelected && <Check className="h-4 w-4" />}
                </span>
                {tipo.label}
              </div>
            );
          })}
        </div>
        {selectedTypes.length > 1 && (
          <div className="p-2 border-t">
            <div className="flex flex-wrap gap-1">
              {selectedLabels.map((label, idx) => (
                <Badge key={idx} variant="secondary" className="text-[10px]">
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
