import { useQuery } from '@tanstack/react-query';
import { dataService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X } from 'lucide-react';
import type { MapFiltersState } from './types';

interface MapFiltersProps {
  filters: MapFiltersState;
  onChange: (filters: MapFiltersState) => void;
  onClear: () => void;
}

export function MapFilters({ filters, onChange, onClear }: MapFiltersProps) {
  const { role, profile } = useAuth();

  const canViewAllRegionales = role === 'administrador' || role === 'coordinador_comercial';
  const canViewJefes = role === 'administrador' || role === 'coordinador_comercial' || role === 'lider_zona';

  // Fetch regionales
  const { data: regionales = [] } = useQuery({
    queryKey: ['map-filter-regionales'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('regionales')
        .select('*')
        .eq('activo', true)
        .order('nombre') as any);
      if (error) throw error;
      return data || [];
    },
    enabled: canViewAllRegionales,
  });

  // Fetch jefes de ventas
  const { data: jefesVentas = [] } = useQuery({
    queryKey: ['map-filter-jefes', filters.regionalId, profile?.regional_id, role],
    queryFn: async () => {
      let query = dataService
        .from('jefes_ventas')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (role === 'lider_zona' && profile?.regional_id) {
        query = query.eq('regional_id', profile.regional_id);
      } else if (filters.regionalId && filters.regionalId !== 'todos') {
        query = query.eq('regional_id', filters.regionalId);
      }

      const { data, error } = await (query as any);
      if (error) throw error;
      return data || [];
    },
    enabled: canViewJefes,
  });

  const hasActiveFilters = 
    filters.dateFrom || 
    filters.dateTo || 
    (filters.regionalId && filters.regionalId !== 'todos') ||
    (filters.jefeId && filters.jefeId !== 'todos') ||
    (filters.tipoActividad && filters.tipoActividad !== 'todos');

  const updateFilter = (key: keyof MapFiltersState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    
    // Reset jefe when regional changes
    if (key === 'regionalId') {
      newFilters.jefeId = 'todos';
    }
    
    onChange(newFilters);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros del Mapa
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Date from */}
          <div className="space-y-2">
            <Label>Desde</Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
            />
          </div>

          {/* Date to */}
          <div className="space-y-2">
            <Label>Hasta</Label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
            />
          </div>

          {/* Regional filter */}
          {canViewAllRegionales && (
            <div className="space-y-2">
              <Label>Regional</Label>
              <Select 
                value={filters.regionalId || 'todos'} 
                onValueChange={(v) => updateFilter('regionalId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las regionales</SelectItem>
                  {regionales.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Jefe filter */}
          {canViewJefes && jefesVentas.length > 0 && (
            <div className="space-y-2">
              <Label>Jefe de Ventas</Label>
              <Select 
                value={filters.jefeId || 'todos'} 
                onValueChange={(v) => updateFilter('jefeId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los jefes</SelectItem>
                  {jefesVentas.map((j) => (
                    <SelectItem key={j.id} value={j.codigo}>{j.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Activity type filter */}
          <div className="space-y-2">
            <Label>Tipo de Actividad</Label>
            <Select 
              value={filters.tipoActividad || 'todos'} 
              onValueChange={(v) => updateFilter('tipoActividad', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="punto">Punto Fijo</SelectItem>
                <SelectItem value="correria">Correría</SelectItem>
                <SelectItem value="libre">Libre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
