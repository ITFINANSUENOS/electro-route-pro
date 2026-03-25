import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Filter, X } from 'lucide-react';
import { MetaTypeToggle, type MetaType } from '@/components/dashboard/MetaTypeToggle';
import type { HistoricoFiltersState } from '@/hooks/useHistoricoData';
import type { UserRole } from '@/types/auth';

interface Props {
  role: UserRole | null;
  jefes: Array<{ codigo: string; nombre: string; regional_id: string | null }>;
  advisorOptions: Array<{ value: string; label: string }>;
  periodos: Array<{ mes: number; anio: number }>;
  filters: HistoricoFiltersState;
  onFiltersChange: (f: HistoricoFiltersState) => void;
  metaType: MetaType;
  onMetaTypeChange: (v: MetaType) => void;
  comparableMode: boolean;
  onComparableModeChange: (v: boolean) => void;
}

const MONTH_NAMES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function HistoricoFilters({
  role, jefes, advisorOptions, periodos, filters, onFiltersChange,
  metaType, onMetaTypeChange, comparableMode, onComparableModeChange,
}: Props) {
  const canSeeJefe = role && ['lider_zona', 'coordinador_comercial', 'administrador'].includes(role);
  const canSeeAsesor = role && ['jefe_ventas', 'lider_zona', 'coordinador_comercial', 'administrador'].includes(role);

  const monthOptions = periodos.map(p => ({
    value: `${p.anio}-${String(p.mes).padStart(2, '0')}`,
    label: `${MONTH_NAMES[p.mes]} ${p.anio}`,
  }));

  const hasActiveFilters = !!(filters.codigoJefe || (filters.codigosAsesor && filters.codigosAsesor.length > 0) || filters.monthRange);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Meta type toggle */}
      <MetaTypeToggle value={metaType} onChange={onMetaTypeChange} />

      {/* Comparable mode toggle */}
      <div className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5">
        <Label htmlFor="comparable-mode" className="text-xs cursor-pointer whitespace-nowrap">
          Sin FNZ
        </Label>
        <Switch
          id="comparable-mode"
          checked={comparableMode}
          onCheckedChange={onComparableModeChange}
          className="scale-75"
        />
      </div>

      {/* Jefe filter */}
      {canSeeJefe && (
        <Select
          value={filters.codigoJefe || '_all'}
          onValueChange={v => onFiltersChange({
            ...filters,
            codigoJefe: v === '_all' ? undefined : v,
            codigosAsesor: undefined,
          })}
        >
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Jefe de ventas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los jefes</SelectItem>
            {jefes.map(j => (
              <SelectItem key={j.codigo} value={j.codigo}>{j.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Asesor filter */}
      {canSeeAsesor && advisorOptions.length > 0 && (
        <Select
          value={filters.codigosAsesor?.[0] || '_all'}
          onValueChange={v => onFiltersChange({
            ...filters,
            codigosAsesor: v === '_all' ? undefined : [v],
          })}
        >
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Asesor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los asesores</SelectItem>
            {advisorOptions.map(a => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Month range: start */}
      {monthOptions.length > 2 && (
        <div className="inline-flex items-center gap-1">
          <Select
            value={filters.monthRange?.start || '_all'}
            onValueChange={v => {
              if (v === '_all') {
                onFiltersChange({ ...filters, monthRange: undefined });
              } else {
                onFiltersChange({
                  ...filters,
                  monthRange: {
                    start: v,
                    end: filters.monthRange?.end || monthOptions[monthOptions.length - 1].value,
                  },
                });
              }
            }}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Desde" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Desde inicio</SelectItem>
              {monthOptions.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">—</span>
          <Select
            value={filters.monthRange?.end || '_all'}
            onValueChange={v => {
              if (v === '_all') {
                onFiltersChange({ ...filters, monthRange: undefined });
              } else {
                onFiltersChange({
                  ...filters,
                  monthRange: {
                    start: filters.monthRange?.start || monthOptions[0].value,
                    end: v,
                  },
                });
              }
            }}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Hasta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Hasta fin</SelectItem>
              {monthOptions.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs gap-1"
          onClick={() => onFiltersChange({})}
        >
          <X className="h-3 w-3" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
