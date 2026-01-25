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
import { Plus, RefreshCw, Eye, EyeOff, Loader2, Download, Pencil } from "lucide-react";
import { roleLabels, UserRole } from "@/types/auth";
import { UserEditDialog } from "@/components/usuarios/UserEditDialog";
import * as XLSX from "xlsx";

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

const ROLES: UserRole[] = [
  'asesor_comercial',
  'jefe_ventas',
  'lider_zona',
  'coordinador_comercial',
  'administrativo',
  'administrador',
];

const ZONAS = ['norte', 'sur', 'centro', 'oriente'];

export default function Usuarios() {
  const { role } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [regionales, setRegionales] = useState<Regional[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
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
  });
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);

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

  const handleDownloadExcel = () => {
    const excelData = users.map((user) => ({
      'Rol': user.role ? roleLabels[user.role] : 'Sin rol',
      'Tipo': user.tipo_asesor || '-',
      'Email': user.correo || '-',
      'Cédula': user.cedula,
      'Nombre': user.nombre_completo,
      'Teléfono': user.telefono || '-',
      'Regional': user.regional_nombre || '-',
      'Zona': user.zona ? user.zona.charAt(0).toUpperCase() + user.zona.slice(1) : '-',
      'Estado': user.activo ? 'Activo' : 'Inactivo',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
    
    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `usuarios_${date}.xlsx`);
    toast.success('Archivo Excel descargado');
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
                      onValueChange={(value) => setFormData({ ...formData, regional_id: value })}
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

                  {/* Código Asesor - solo si rol es asesor */}
                  {formData.role === 'asesor_comercial' && (
                    <div className="grid gap-2">
                      <Label htmlFor="codigo_asesor">Código Asesor</Label>
                      <Input
                        id="codigo_asesor"
                        placeholder="ASE001"
                        value={formData.codigo_asesor}
                        onChange={(e) => setFormData({ ...formData, codigo_asesor: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Código Jefe - solo si rol es jefe */}
                  {formData.role === 'jefe_ventas' && (
                    <div className="grid gap-2">
                      <Label htmlFor="codigo_jefe">Código Jefe</Label>
                      <Input
                        id="codigo_jefe"
                        placeholder="JEF001"
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
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <p className="text-muted-foreground">No hay usuarios registrados</p>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
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
