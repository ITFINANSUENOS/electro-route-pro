import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, RefreshCw, Shield, Check, X } from "lucide-react";

interface PermisoRol {
  id: string;
  rol: string;
  permiso: string;
  habilitado: boolean;
  categoria: string;
  created_at: string;
  updated_at: string;
}

const ROLES = [
  { value: 'asesor_comercial', label: 'Asesor Comercial', color: 'bg-blue-100 text-blue-800' },
  { value: 'jefe_ventas', label: 'Jefe de Ventas', color: 'bg-green-100 text-green-800' },
  { value: 'lider_zona', label: 'Líder de Zona', color: 'bg-purple-100 text-purple-800' },
  { value: 'coordinador_comercial', label: 'Coordinador Comercial', color: 'bg-orange-100 text-orange-800' },
  { value: 'administrativo', label: 'Administrativo', color: 'bg-gray-100 text-gray-800' },
  { value: 'administrador', label: 'Administrador', color: 'bg-red-100 text-red-800' },
];

const CATEGORIAS = [
  { value: 'Dashboard', icon: '📊' },
  { value: 'Programación', icon: '📅' },
  { value: 'Actividades', icon: '📝' },
  { value: 'Ventas', icon: '💰' },
  { value: 'Información', icon: '📁' },
  { value: 'Reportes', icon: '📈' },
  { value: 'Mapa', icon: '🗺️' },
  { value: 'Usuarios', icon: '👥' },
  { value: 'Configuración', icon: '⚙️' },
];

const PERMISO_LABELS: Record<string, string> = {
  ver_dashboard_propio: 'Ver dashboard propio',
  ver_dashboard_equipo: 'Ver dashboard del equipo',
  ver_dashboard_zona: 'Ver dashboard de zona',
  ver_dashboard_regional: 'Ver dashboard regional',
  ver_dashboard_global: 'Ver dashboard global',
  ver_programacion: 'Ver programación',
  editar_programacion: 'Editar programación',
  crear_programacion: 'Crear programación',
  registrar_actividad: 'Registrar actividad',
  ver_ventas_propias: 'Ver ventas propias',
  ver_ventas_equipo: 'Ver ventas del equipo',
  ver_ventas_zona: 'Ver ventas de zona',
  ver_ventas_regional: 'Ver ventas regionales',
  ver_ventas_global: 'Ver ventas globales',
  cargar_ventas: 'Cargar ventas',
  cargar_metas: 'Cargar metas',
  exportar_reportes: 'Exportar reportes',
  ver_mapa: 'Ver mapa',
  ver_ubicacion_asesores: 'Ver ubicación de asesores',
  ver_evidencias_asesores: 'Ver evidencias de asesores',
  ver_usuarios: 'Ver usuarios',
  editar_usuarios: 'Editar usuarios',
  crear_usuarios: 'Crear usuarios',
  activar_desactivar_usuarios: 'Activar/Desactivar usuarios',
  ver_configuracion: 'Ver configuración',
  editar_configuracion: 'Editar configuración',
};

export function PermisosConfig() {
  const { user } = useAuth();
  const [permisos, setPermisos] = useState<PermisoRol[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedRol, setSelectedRol] = useState<string>('all');

  const fetchPermisos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('permisos_roles')
        .select('*')
        .order('rol')
        .order('categoria')
        .order('permiso');

      if (error) throw error;
      setPermisos(data || []);
    } catch (error) {
      console.error('Error fetching permisos:', error);
      toast.error('Error cargando permisos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermisos();
  }, []);

  const togglePermiso = async (permiso: PermisoRol) => {
    setSaving(permiso.id);
    try {
      const newValue = !permiso.habilitado;
      const { error } = await supabase
        .from('permisos_roles')
        .update({ habilitado: newValue, updated_at: new Date().toISOString() })
        .eq('id', permiso.id);

      if (error) throw error;

      // Log the change
      await supabase.from('historial_ediciones').insert({
        tabla: 'permisos_roles',
        registro_id: permiso.id,
        campo_editado: 'habilitado',
        valor_anterior: permiso.habilitado.toString(),
        valor_nuevo: newValue.toString(),
        modificado_por: user?.id,
      });

      setPermisos(prev => prev.map(p => 
        p.id === permiso.id ? { ...p, habilitado: newValue } : p
      ));
      
      toast.success(`Permiso ${newValue ? 'habilitado' : 'deshabilitado'}`);
    } catch (error) {
      console.error('Error updating permiso:', error);
      toast.error('Error actualizando permiso');
    } finally {
      setSaving(null);
    }
  };

  const filteredPermisos = selectedRol === 'all' 
    ? permisos 
    : permisos.filter(p => p.rol === selectedRol);

  // Group by categoria
  const groupedPermisos = filteredPermisos.reduce((acc, permiso) => {
    if (!acc[permiso.categoria]) {
      acc[permiso.categoria] = [];
    }
    acc[permiso.categoria].push(permiso);
    return acc;
  }, {} as Record<string, PermisoRol[]>);

  const getRolBadge = (rol: string) => {
    const rolInfo = ROLES.find(r => r.value === rol);
    return rolInfo ? (
      <Badge className={rolInfo.color}>{rolInfo.label}</Badge>
    ) : (
      <Badge variant="outline">{rol}</Badge>
    );
  };

  // Summary by rol
  const rolSummary = ROLES.map(rol => ({
    ...rol,
    total: permisos.filter(p => p.rol === rol.value).length,
    enabled: permisos.filter(p => p.rol === rol.value && p.habilitado).length,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Gestión de Permisos por Rol
            </CardTitle>
            <CardDescription>
              Configura qué puede ver y hacer cada rol dentro del sistema
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPermisos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rol Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {rolSummary.map((rol) => (
            <Card 
              key={rol.value} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedRol === rol.value ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedRol(selectedRol === rol.value ? 'all' : rol.value)}
            >
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground truncate">{rol.label}</p>
                <p className="text-lg font-bold">
                  {rol.enabled}/{rol.total}
                </p>
                <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                  <div 
                    className="bg-primary h-1.5 rounded-full transition-all" 
                    style={{ width: `${(rol.enabled / rol.total) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <Select value={selectedRol} onValueChange={setSelectedRol}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filtrar por rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              {ROLES.map((rol) => (
                <SelectItem key={rol.value} value={rol.value}>
                  {rol.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRol !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedRol('all')}>
              <X className="h-4 w-4 mr-1" />
              Limpiar filtro
            </Button>
          )}
        </div>

        {/* Permisos by Category */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {CATEGORIAS.map((cat) => {
              const catPermisos = groupedPermisos[cat.value];
              if (!catPermisos || catPermisos.length === 0) return null;
              
              return (
                <div key={cat.value} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b">
                    <h3 className="font-medium flex items-center gap-2">
                      <span>{cat.icon}</span>
                      {cat.value}
                    </h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Rol</TableHead>
                        <TableHead>Permiso</TableHead>
                        <TableHead className="w-[100px] text-center">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {catPermisos.map((permiso) => (
                        <TableRow key={permiso.id}>
                          <TableCell>{getRolBadge(permiso.rol)}</TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {PERMISO_LABELS[permiso.permiso] || permiso.permiso}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {saving === permiso.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            ) : (
                              <Switch
                                checked={permiso.habilitado}
                                onCheckedChange={() => togglePermiso(permiso)}
                                disabled={permiso.rol === 'administrador' && permiso.permiso === 'ver_configuracion'}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
          <div className="flex items-center gap-1">
            <Check className="h-4 w-4 text-green-600" />
            <span>Habilitado</span>
          </div>
          <div className="flex items-center gap-1">
            <X className="h-4 w-4 text-red-600" />
            <span>Deshabilitado</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
