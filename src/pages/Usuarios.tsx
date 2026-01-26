import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, RefreshCw, Eye, EyeOff, Loader2, Download, Pencil, Search, X, Upload, KeyRound } from "lucide-react";
import { roleLabels, UserRole } from "@/types/auth";
import { UserEditDialog } from "@/components/usuarios/UserEditDialog";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import ExcelJS from "exceljs";

interface UserWithRole {
  id: string;
  user_id: string;
  cedula: string;
  nombre_completo: string;
  telefono: string | null;
  zona: string | null;
  correo: string | null;
  activo: boolean;
  created_at: string;
  role: UserRole | null;
  regional_nombre: string | null;
  regional_id: string | null;
  codigo_asesor: string | null;
  codigo_jefe: string | null;
  tipo_asesor: string | null;
}

interface Regional {
  id: string;
  nombre: string;
  codigo: number;
}

interface JefeVentas {
  id: string;
  codigo: string;
  nombre: string;
  regional_id: string | null;
}

const ROLES: UserRole[] = [
  'asesor_comercial',
  'jefe_ventas',
  'lider_zona',
  'coordinador_comercial',
  'administrativo',
  'administrador',
];

const ZONAS = ['norte', 'sur', 'centro', 'oriente'];
const TIPOS_ASESOR = ['INTERNO', 'EXTERNO', 'CORRETAJE'];

// Regionales that have jefes de ventas
const REGIONALES_CON_JEFES = ['SANTANDER', 'POPAYAN', 'AMBIENTA', 'BORDO'];

export default function Usuarios() {
  const { role } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [regionales, setRegionales] = useState<Regional[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Filter states
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterNombre, setFilterNombre] = useState('');
  const [filterRegional, setFilterRegional] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    cedula: '',
    nombre_completo: '',
    telefono: '',
    zona: '',
    role: '' as UserRole | '',
    regional_id: '',
    codigo_asesor: '',
    codigo_jefe: '',
    tipo_asesor: '',
  });
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);

  // Fetch jefes de ventas
  const { data: jefesVentas = [] } = useQuery({
    queryKey: ['jefes-ventas-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jefes_ventas')
        .select('id, codigo, nombre, regional_id')
        .order('nombre');
      if (error) throw error;
      return data as JefeVentas[];
    },
  });

  // Filter jefes by selected regional
  const filteredJefes = jefesVentas.filter(jefe => 
    !formData.regional_id || jefe.regional_id === formData.regional_id
  );

  // Check if selected regional has jefes
  const selectedRegionalName = regionales.find(r => r.id === formData.regional_id)?.nombre || '';
  const regionalHasJefes = REGIONALES_CON_JEFES.some(r => 
    selectedRegionalName.toUpperCase().includes(r)
  );
  
  // Filtered users
  const filteredUsers = users.filter((user) => {
    // Filter by role
    if (filterRole !== 'all' && user.role !== filterRole) return false;
    
    // Filter by name (case insensitive)
    if (filterNombre && !user.nombre_completo.toLowerCase().includes(filterNombre.toLowerCase())) return false;
    
    // Filter by regional
    if (filterRegional !== 'all' && user.regional_id !== filterRegional) return false;
    
    // Filter by estado
    if (filterEstado === 'activo' && !user.activo) return false;
    if (filterEstado === 'inactivo' && user.activo) return false;
    
    return true;
  });
  
  const clearFilters = () => {
    setFilterRole('all');
    setFilterNombre('');
    setFilterRegional('all');
    setFilterEstado('all');
  };
  
  const hasActiveFilters = filterRole !== 'all' || filterNombre !== '' || filterRegional !== 'all' || filterEstado !== 'all';

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles_with_roles')
        .select('*')
        .order('nombre_completo');

      if (error) throw error;
      setUsers(data as UserWithRole[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegionales = async () => {
    try {
      const { data, error } = await supabase
        .from('regionales')
        .select('id, nombre, codigo')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setRegionales(data || []);
    } catch (error) {
      console.error('Error fetching regionales:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRegionales();
  }, []);

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      cedula: '',
      nombre_completo: '',
      telefono: '',
      zona: '',
      role: '',
      regional_id: '',
      codigo_asesor: '',
      codigo_jefe: '',
      tipo_asesor: '',
    });
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.cedula || !formData.nombre_completo || !formData.role) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    setCreating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('Sesión expirada');
        return;
      }

      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          cedula: formData.cedula,
          nombre_completo: formData.nombre_completo,
          telefono: formData.telefono || undefined,
          zona: formData.zona || undefined,
          role: formData.role,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Update profile with additional fields if needed
      if (formData.regional_id || formData.codigo_asesor || formData.codigo_jefe) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            regional_id: formData.regional_id || null,
            codigo_asesor: formData.codigo_asesor || null,
            codigo_jefe: formData.codigo_jefe || null,
            correo: formData.email,
          })
          .eq('user_id', response.data.user.id);

        if (updateError) {
          console.error('Error updating profile:', updateError);
        }
      }

      toast.success('Usuario creado exitosamente');
      setDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error creando usuario';
      toast.error(message);
      console.error('Error creating user:', error);
    } finally {
      setCreating(false);
    }
  };

  const getRoleBadgeVariant = (userRole: UserRole | null) => {
    switch (userRole) {
      case 'administrador':
        return 'destructive';
      case 'coordinador_comercial':
        return 'default';
      case 'lider_zona':
        return 'secondary';
      case 'jefe_ventas':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleDownloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Usuarios');
    
    // Define columns
    worksheet.columns = [
      { header: 'Rol', key: 'rol', width: 20 },
      { header: 'Tipo', key: 'tipo', width: 12 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Cédula', key: 'cedula', width: 15 },
      { header: 'Nombre', key: 'nombre', width: 35 },
      { header: 'Teléfono', key: 'telefono', width: 15 },
      { header: 'Regional', key: 'regional', width: 15 },
      { header: 'Zona', key: 'zona', width: 12 },
      { header: 'Estado', key: 'estado', width: 10 },
    ];
    
    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // Add data
    users.forEach((user) => {
      worksheet.addRow({
        rol: user.role ? roleLabels[user.role] : 'Sin rol',
        tipo: user.tipo_asesor || '-',
        email: user.correo || '-',
        cedula: user.cedula,
        nombre: user.nombre_completo,
        telefono: user.telefono || '-',
        regional: user.regional_nombre || '-',
        zona: user.zona ? user.zona.charAt(0).toUpperCase() + user.zona.slice(1) : '-',
        estado: user.activo ? 'Activo' : 'Inactivo',
      });
    });
    
    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `usuarios_${date}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo Excel descargado');
  };

  const handleSyncPasswords = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      setSyncing(true);
      try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error('El archivo CSV está vacío o no tiene el formato esperado');
          return;
        }
        
        // Parse header
        const header = lines[0].split(';').map(h => h.trim().toUpperCase());
        const cedulaIdx = header.findIndex(h => h.includes('CEDULA') || h.includes('USUARIO'));
        const correoIdx = header.findIndex(h => h.includes('CORREO'));
        const passwordIdx = header.findIndex(h => h.includes('CONTRASE') || h.includes('PASSWORD'));
        const nombreIdx = header.findIndex(h => h.includes('NOMBRE'));
        const rolIdx = header.findIndex(h => h.includes('ROL'));
        const zonaIdx = header.findIndex(h => h.includes('REGIONAL') || h.includes('ZONA'));
        
        if (cedulaIdx === -1 || passwordIdx === -1 || nombreIdx === -1) {
          toast.error('El CSV debe tener columnas: Cédula, Contraseña, Nombre');
          return;
        }
        
        const users = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(';').map(v => v.trim());
          if (values.length < 3) continue;
          
          users.push({
            cedula: values[cedulaIdx] || '',
            correo: correoIdx >= 0 ? values[correoIdx] || '' : '',
            password: values[passwordIdx] || '',
            nombre: values[nombreIdx] || '',
            rol: rolIdx >= 0 ? values[rolIdx] || 'ASESOR' : 'ASESOR',
            zona: zonaIdx >= 0 ? values[zonaIdx] || '' : '',
          });
        }
        
        if (users.length === 0) {
          toast.error('No se encontraron usuarios válidos en el CSV');
          return;
        }
        
        toast.info(`Sincronizando ${users.length} usuarios...`);
        
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          toast.error('Sesión expirada');
          return;
        }
        
        const response = await supabase.functions.invoke('sync-passwords', {
          body: { users },
        });
        
        if (response.error) {
          throw new Error(response.error.message);
        }
        
        if (response.data?.error) {
          throw new Error(response.data.error);
        }
        
        const stats = response.data?.stats;
        toast.success(`Sincronización completada: ${stats?.created || 0} creados, ${stats?.updated || 0} actualizados`);
        
        if (stats?.errors?.length > 0) {
          console.warn('Errores durante sincronización:', stats.errors);
        }
        
        fetchUsers();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error sincronizando contraseñas';
        toast.error(message);
        console.error('Error syncing passwords:', error);
      } finally {
        setSyncing(false);
      }
    };
    
    input.click();
  };

  const handleDownloadCSV = () => {
    const headers = ['Rol', 'Tipo', 'Email', 'Cédula', 'Nombre', 'Teléfono', 'Regional', 'Zona', 'Estado'];
    const rows = users.map((user) => [
      user.role ? roleLabels[user.role] : 'Sin rol',
      user.tipo_asesor || '-',
      user.correo || '-',
      user.cedula,
      user.nombre_completo,
      user.telefono || '-',
      user.regional_nombre || '-',
      user.zona ? user.zona.charAt(0).toUpperCase() + user.zona.slice(1) : '-',
      user.activo ? 'Activo' : 'Inactivo',
    ]);
    
    // Escape values with semicolons or quotes
    const escapeCSV = (val: string) => {
      if (val.includes(';') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(escapeCSV).join(';'))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `usuarios_${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo CSV descargado');
  };

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  if (role !== 'administrador') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">No tienes permisos para ver esta página</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncPasswords} disabled={syncing}>
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4 mr-2" />
            )}
            Sincronizar Contraseñas
          </Button>
          <Button variant="outline" onClick={handleDownloadCSV} disabled={loading || users.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Descargar CSV
          </Button>
          <Button variant="outline" onClick={handleDownloadExcel} disabled={loading || users.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Descargar Excel
          </Button>
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                <DialogDescription>
                  Complete los datos para crear un nuevo usuario en el sistema.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  {/* Email */}
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@electrocreditos.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="grid gap-2">
                    <Label htmlFor="password">Contraseña *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Cédula */}
                  <div className="grid gap-2">
                    <Label htmlFor="cedula">Cédula *</Label>
                    <Input
                      id="cedula"
                      placeholder="1234567890"
                      value={formData.cedula}
                      onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                      required
                    />
                  </div>

                  {/* Nombre Completo */}
                  <div className="grid gap-2">
                    <Label htmlFor="nombre_completo">Nombre Completo *</Label>
                    <Input
                      id="nombre_completo"
                      placeholder="Juan Pérez García"
                      value={formData.nombre_completo}
                      onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                      required
                    />
                  </div>

                  {/* Teléfono */}
                  <div className="grid gap-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      placeholder="3001234567"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    />
                  </div>

                  {/* Rol */}
                  <div className="grid gap-2">
                    <Label htmlFor="role">Rol *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {roleLabels[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Zona */}
                  <div className="grid gap-2">
                    <Label htmlFor="zona">Zona</Label>
                    <Select
                      value={formData.zona}
                      onValueChange={(value) => setFormData({ ...formData, zona: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione zona" />
                      </SelectTrigger>
                      <SelectContent>
                        {ZONAS.map((z) => (
                          <SelectItem key={z} value={z}>
                            {z.charAt(0).toUpperCase() + z.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Regional */}
                  <div className="grid gap-2">
                    <Label htmlFor="regional_id">Regional</Label>
                    <Select
                      value={formData.regional_id}
                      onValueChange={(value) => setFormData({ 
                        ...formData, 
                        regional_id: value,
                        // Reset codigo_jefe when regional changes if it doesn't match
                        codigo_jefe: jefesVentas.find(j => j.codigo === formData.codigo_jefe && j.regional_id === value) 
                          ? formData.codigo_jefe 
                          : ''
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione regional" />
                      </SelectTrigger>
                      <SelectContent>
                        {regionales.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.nombre} ({r.codigo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tipo Asesor - solo si rol es asesor */}
                  {formData.role === 'asesor_comercial' && (
                    <div className="grid gap-2">
                      <Label htmlFor="tipo_asesor">Tipo Asesor</Label>
                      <Select
                        value={formData.tipo_asesor}
                        onValueChange={(value) => setFormData({ ...formData, tipo_asesor: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_ASESOR.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Código Asesor - solo si rol es asesor */}
                  {formData.role === 'asesor_comercial' && (
                    <div className="grid gap-2">
                      <Label htmlFor="codigo_asesor">Código Asesor</Label>
                      <Input
                        id="codigo_asesor"
                        placeholder="12345"
                        value={formData.codigo_asesor}
                        onChange={(e) => setFormData({ ...formData, codigo_asesor: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Jefe de Ventas - solo si rol es asesor y regional tiene jefes */}
                  {formData.role === 'asesor_comercial' && formData.regional_id && regionalHasJefes && (
                    <div className="grid gap-2">
                      <Label htmlFor="jefe_ventas">Jefe de Ventas</Label>
                      <Select
                        value={formData.codigo_jefe}
                        onValueChange={(value) => setFormData({ ...formData, codigo_jefe: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione jefe de ventas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sin asignar</SelectItem>
                          {filteredJefes.map((jefe) => (
                            <SelectItem key={jefe.id} value={jefe.codigo}>
                              {jefe.nombre} ({jefe.codigo})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        El jefe de ventas determina el grupo al que pertenece el asesor
                      </p>
                    </div>
                  )}

                  {/* Código Jefe - solo si rol es jefe */}
                  {formData.role === 'jefe_ventas' && (
                    <div className="grid gap-2">
                      <Label htmlFor="codigo_jefe">Código Jefe</Label>
                      <Input
                        id="codigo_jefe"
                        placeholder="69334"
                        value={formData.codigo_jefe}
                        onChange={(e) => setFormData({ ...formData, codigo_jefe: e.target.value })}
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Crear Usuario
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros avanzados */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            {/* Filtro por Rol */}
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">Rol</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos los roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabels[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Nombre */}
            <div className="flex flex-col gap-1.5 min-w-[200px] flex-1 max-w-xs">
              <Label className="text-xs text-muted-foreground">Nombre</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre..."
                  value={filterNombre}
                  onChange={(e) => setFilterNombre(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>

            {/* Filtro por Regional */}
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">Regional</Label>
              <Select value={filterRegional} onValueChange={setFilterRegional}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas las regionales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las regionales</SelectItem>
                  {regionales.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Estado */}
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <Label className="text-xs text-muted-foreground">Estado</Label>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botón limpiar filtros */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
          
          {/* Contador de resultados */}
          {hasActiveFilters && (
            <p className="text-sm text-muted-foreground mt-3">
              Mostrando {filteredUsers.length} de {users.length} usuarios
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabla de usuarios */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rol</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Regional</TableHead>
              <TableHead>Zona</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[50px]">Editar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="text-muted-foreground mt-2">Cargando usuarios...</p>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <p className="text-muted-foreground">
                    {hasActiveFilters ? 'No hay usuarios que coincidan con los filtros' : 'No hay usuarios registrados'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role ? roleLabels[user.role] : 'Sin rol'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.tipo_asesor ? (
                      <Badge variant="outline" className="text-xs">
                        {user.tipo_asesor}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {user.correo || '-'}
                  </TableCell>
                  <TableCell>{user.cedula}</TableCell>
                  <TableCell className="font-medium">{user.nombre_completo}</TableCell>
                  <TableCell>{user.telefono || '-'}</TableCell>
                  <TableCell>{user.regional_nombre || '-'}</TableCell>
                  <TableCell className="capitalize">{user.zona || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={user.activo ? 'default' : 'secondary'}>
                      {user.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditUser(user)}
                      title="Editar usuario"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Stats */}
      {!loading && users.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Total: {users.length} usuarios
        </div>
      )}

      {/* Edit Dialog */}
      <UserEditDialog
        user={editingUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        regionales={regionales}
        onUserUpdated={fetchUsers}
      />
    </div>
  );
}
