import { useState, useEffect } from "react";
import { dataService } from "@/services";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, RefreshCw, ArrowRight, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface HistorialEdicion {
  id: string;
  tabla: string;
  registro_id: string;
  campo_editado: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  modificado_por: string | null;
  created_at: string;
}

interface ProfileInfo {
  [key: string]: string;
}

const TABLAS = [
  { value: 'regionales', label: 'Regionales' },
  { value: 'formas_pago', label: 'Formas de Pago' },
  { value: 'profiles', label: 'Perfiles' },
  { value: 'user_roles', label: 'Roles de Usuario' },
];

export function HistorialCambios() {
  const [historial, setHistorial] = useState<HistorialEdicion[]>([]);
  const [profiles, setProfiles] = useState<ProfileInfo>({});
  const [loading, setLoading] = useState(true);
  const [filterTabla, setFilterTabla] = useState<string>('all');

  const fetchHistorial = async () => {
    setLoading(true);
    try {
      const { data, error } = await dataService
        .from('historial_ediciones')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setHistorial((data || []) as HistorialEdicion[]);

      // Fetch profile names for modificado_por
      const userIds = [...new Set((data as HistorialEdicion[])?.map(h => h.modificado_por).filter(Boolean) as string[])];
      if (userIds.length > 0) {
        const { data: profilesData } = await dataService
          .from('profiles')
          .select('user_id, nombre_completo')
          .in('user_id', userIds);

        const profileMap: ProfileInfo = {};
        (profilesData as { user_id: string; nombre_completo: string }[])?.forEach(p => {
          profileMap[p.user_id] = p.nombre_completo;
        });
        setProfiles(profileMap);
      }
    } catch (error) {
      console.error('Error fetching historial:', error);
      toast.error('Error cargando historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorial();
  }, []);

  const filteredHistorial = filterTabla === 'all' 
    ? historial 
    : historial.filter(h => h.tabla === filterTabla);

  const hasActiveFilters = filterTabla !== 'all';

  const getTablaLabel = (tabla: string) => {
    const tablaInfo = TABLAS.find(t => t.value === tabla);
    return tablaInfo ? tablaInfo.label : tabla;
  };

  const getTablaBadgeVariant = (tabla: string) => {
    switch (tabla) {
      case 'regionales': return 'default';
      case 'formas_pago': return 'secondary';
      case 'profiles': return 'outline';
      default: return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy, HH:mm", { locale: es });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Historial de Cambios</CardTitle>
            <CardDescription>
              Registro de todas las modificaciones realizadas en las tablas de configuración
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchHistorial} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter */}
        <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex flex-col gap-1.5 min-w-[180px]">
            <Label className="text-xs text-muted-foreground">Filtrar por Tabla</Label>
            <Select value={filterTabla} onValueChange={setFilterTabla}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las tablas</SelectItem>
                {TABLAS.map((tabla) => (
                  <SelectItem key={tabla.value} value={tabla.value}>
                    {tabla.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={() => setFilterTabla('all')} className="h-9">
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {hasActiveFilters && (
          <p className="text-sm text-muted-foreground">
            Mostrando {filteredHistorial.length} de {historial.length} registros
          </p>
        )}

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Fecha</TableHead>
                <TableHead className="w-[120px]">Tabla</TableHead>
                <TableHead className="w-[120px]">Campo</TableHead>
                <TableHead>Cambio</TableHead>
                <TableHead className="w-[150px]">Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredHistorial.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {hasActiveFilters 
                      ? 'No hay cambios registrados para esta tabla' 
                      : 'No hay cambios registrados'
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredHistorial.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(item.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTablaBadgeVariant(item.tabla)}>
                        {getTablaLabel(item.tabla)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.campo_editado}
                    </TableCell>
                    <TableCell>
                      {item.campo_editado === 'creacion' ? (
                        <span className="text-sm text-green-600">{item.valor_nuevo}</span>
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground line-through">
                            {item.valor_anterior || '(vacío)'}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">
                            {item.valor_nuevo || '(vacío)'}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.modificado_por 
                        ? profiles[item.modificado_por] || 'Usuario desconocido'
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && historial.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            Mostrando los últimos 100 cambios
          </p>
        )}
      </CardContent>
    </Card>
  );
}
