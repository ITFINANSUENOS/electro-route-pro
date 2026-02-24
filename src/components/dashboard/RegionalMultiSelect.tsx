import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Building2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Regional {
  id: string;
  codigo: number;
  nombre: string;
}

interface RegionalMultiSelectProps {
  regionales: Regional[];
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
  className?: string;
}

export function RegionalMultiSelect({
  regionales,
  selectedCodes,
  onChange,
  className,
}: RegionalMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (codigo: string) => {
    if (selectedCodes.includes(codigo)) {
      onChange(selectedCodes.filter(c => c !== codigo));
    } else {
      onChange([...selectedCodes, codigo]);
    }
  };

  const handleSelectAll = () => {
    if (selectedCodes.length === regionales.length) {
      onChange([]);
    } else {
      onChange(regionales.map(r => r.codigo.toString()));
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  const getDisplayText = () => {
    if (selectedCodes.length === 0) {
      return 'Todas las regionales';
    }
    if (selectedCodes.length === 1) {
      const reg = regionales.find(r => r.codigo.toString() === selectedCodes[0]);
      return reg?.nombre || selectedCodes[0];
    }
    return `${selectedCodes.length} regionales`;
  };

  const selectedRegionalNames = selectedCodes.map(code => {
    const reg = regionales.find(r => r.codigo.toString() === code);
    return reg?.nombre || code;
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-9 px-3 justify-between bg-card text-sm", className)}
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{getDisplayText()}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="flex items-center justify-between">
            <button
              onClick={handleSelectAll}
              className="text-xs text-primary hover:underline"
            >
              {selectedCodes.length === regionales.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
            {selectedCodes.length > 0 && (
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
          {regionales.map((regional) => {
            const isSelected = selectedCodes.includes(regional.codigo.toString());
            return (
              <div
                key={regional.id}
                onClick={() => handleToggle(regional.codigo.toString())}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  isSelected && "bg-accent/50"
                )}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  {isSelected && <Check className="h-4 w-4" />}
                </span>
                {regional.nombre}
              </div>
            );
          })}
        </div>
        {selectedCodes.length > 1 && (
          <div className="p-2 border-t">
            <div className="flex flex-wrap gap-1">
              {selectedRegionalNames.slice(0, 3).map((name, idx) => (
                <Badge key={idx} variant="secondary" className="text-[10px]">
                  {name.length > 10 ? name.slice(0, 10) + '...' : name}
                </Badge>
              ))}
              {selectedRegionalNames.length > 3 && (
                <Badge variant="outline" className="text-[10px]">
                  +{selectedRegionalNames.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
