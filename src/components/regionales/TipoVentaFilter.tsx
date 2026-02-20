import { useState, useRef, useEffect } from 'react';
import { Filter, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const TIPOS_VENTA = [
  { value: 'CONTADO', label: 'Contado' },
  { value: 'FINANSUEÑOS', label: 'Crédito' },
  { value: 'CONVENIO', label: 'Aliados' },
  { value: 'CREDICONTADO', label: 'CrediContado' },
];

interface Props {
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export function TipoVentaFilter({ selected, onChange, className }: Props) {
  const allSelected = selected.length === 0 || selected.length === TIPOS_VENTA.length;

  const toggle = (value: string) => {
    if (allSelected) {
      // From "all" → select only this one
      onChange([value]);
    } else if (selected.includes(value)) {
      const next = selected.filter(v => v !== value);
      onChange(next.length === 0 ? [] : next); // empty = all
    } else {
      const next = [...selected, value];
      onChange(next.length === TIPOS_VENTA.length ? [] : next);
    }
  };

  const label = allSelected
    ? 'Todos los tipos'
    : selected.map(s => TIPOS_VENTA.find(t => t.value === s)?.label || s).join(', ');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-1.5 text-xs h-8', className)}>
          <Filter className="h-3.5 w-3.5" />
          <span className="max-w-[140px] truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end">
        <button
          className="flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded hover:bg-accent"
          onClick={() => onChange([])}
        >
          <Check className={cn('h-3.5 w-3.5', allSelected ? 'opacity-100' : 'opacity-0')} />
          Todos
        </button>
        {TIPOS_VENTA.map(t => {
          const isSelected = !allSelected && selected.includes(t.value);
          return (
            <button
              key={t.value}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded hover:bg-accent"
              onClick={() => toggle(t.value)}
            >
              <Check className={cn('h-3.5 w-3.5', isSelected ? 'opacity-100' : 'opacity-0')} />
              {t.label}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
