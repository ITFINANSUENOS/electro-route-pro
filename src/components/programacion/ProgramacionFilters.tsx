import { useQuery } from "@tanstack/react-query";
import { dataService } from "@/services";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

interface ProgramacionFiltersProps {
  selectedRegional: string;
  setSelectedRegional: (value: string) => void;
  selectedJefe: string;
  setSelectedJefe: (value: string) => void;
}

export function ProgramacionFilters({
  selectedRegional,
  setSelectedRegional,
  selectedJefe,
  setSelectedJefe,
}: ProgramacionFiltersProps) {
  const { role, profile } = useAuth();

  const isGlobalRole = role === 'coordinador_comercial' || role === 'administrador';
  const isLider = role === 'lider_zona';

  // Fetch regionales
  const { data: regionales = [] } = useQuery({
    queryKey: ['regionales-programacion'],
    queryFn: async () => {
      const { data, error } = await dataService
        .from('regionales')
        .select('*')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return (data || []) as { id: string; nombre: string; activo: boolean }[];
    },
    enabled: isGlobalRole,
  });

  // Fetch jefes de ventas based on regional filter
  const { data: jefesVentas = [] } = useQuery({
    queryKey: ['jefes-ventas-programacion', selectedRegional, profile?.regional_id],
    queryFn: async () => {
      let query = dataService
        .from('jefes_ventas')
        .select('*, regionales(nombre)')
        .eq('activo', true)
        .order('nombre');

      // Filter by regional
      if (isGlobalRole && selectedRegional !== 'todos') {
        query = query.eq('regional_id', selectedRegional);
      } else if (isLider && profile?.regional_id) {
        query = query.eq('regional_id', profile.regional_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as { id: string; codigo: string; nombre: string; regional_id: string | null; regionales: { nombre: string } | null }[];
    },
    enabled: isGlobalRole || isLider,
  });

  // Don't show filters for roles that don't need them
  if (!isGlobalRole && !isLider) {
    return null;
  }

  // For lider, only show jefe filter if there are jefes in their regional
  if (isLider && jefesVentas.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4">
      {/* Regional filter - only for global roles */}
      {isGlobalRole && (
        <div className="space-y-2">
          <Label>Filtrar por Regional</Label>
          <Select value={selectedRegional} onValueChange={(value) => {
            setSelectedRegional(value);
            setSelectedJefe('todos'); // Reset jefe when regional changes
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las regionales" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las regionales</SelectItem>
              {regionales.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Jefe de ventas filter */}
      {(isGlobalRole || isLider) && jefesVentas.length > 0 && (
        <div className="space-y-2">
          <Label>Filtrar por Jefe de Ventas</Label>
          <Select value={selectedJefe} onValueChange={setSelectedJefe}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los jefes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los jefes</SelectItem>
              {jefesVentas.map((j) => (
                <SelectItem key={j.id} value={j.codigo}>
                  {j.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
