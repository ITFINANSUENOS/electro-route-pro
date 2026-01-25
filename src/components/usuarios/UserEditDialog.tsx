import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { roleLabels, UserRole } from "@/types/auth";

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

interface UserEditDialogProps {
  user: UserWithRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regionales: Regional[];
  onUserUpdated: () => void;
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

export function UserEditDialog({ 
  user, 
  open, 
  onOpenChange, 
  regionales,
  onUserUpdated 
}: UserEditDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre_completo: '',
    telefono: '',
    zona: '',
    correo: '',
    activo: true,
    role: '' as UserRole | '',
    regional_id: '',
    codigo_asesor: '',
    codigo_jefe: '',
    tipo_asesor: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nombre_completo: user.nombre_completo || '',
        telefono: user.telefono || '',
        zona: user.zona || '',
        correo: user.correo || '',
        activo: user.activo,
        role: user.role || '',
        regional_id: user.regional_id || '',
        codigo_asesor: user.codigo_asesor || '',
        codigo_jefe: user.codigo_jefe || '',
        tipo_asesor: user.tipo_asesor || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nombre_completo: formData.nombre_completo,
          telefono: formData.telefono || null,
          zona: formData.zona || null,
          correo: formData.correo || null,
          activo: formData.activo,
          regional_id: formData.regional_id || null,
          codigo_asesor: formData.codigo_asesor || null,
          codigo_jefe: formData.codigo_jefe || null,
          tipo_asesor: formData.tipo_asesor || null,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update role if changed
      if (formData.role && formData.role !== user.role) {
        // First delete existing role
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.user_id);

        // Then insert new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.user_id,
            role: formData.role,
          });

        if (roleError) throw roleError;
      }

      toast.success('Usuario actualizado exitosamente');
      onOpenChange(false);
      onUserUpdated();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error al actualizar usuario');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>
            Modifique los datos del usuario. Cédula: {user.cedula}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Nombre Completo */}
            <div className="grid gap-2">
              <Label htmlFor="edit_nombre">Nombre Completo *</Label>
              <Input
                id="edit_nombre"
                value={formData.nombre_completo}
                onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                required
              />
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="edit_correo">Email</Label>
              <Input
                id="edit_correo"
                type="email"
                value={formData.correo}
                onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
              />
            </div>

            {/* Teléfono */}
            <div className="grid gap-2">
              <Label htmlFor="edit_telefono">Teléfono</Label>
              <Input
                id="edit_telefono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>

            {/* Rol */}
            <div className="grid gap-2">
              <Label htmlFor="edit_role">Rol *</Label>
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

            {/* Tipo Asesor - solo si rol es asesor */}
            {formData.role === 'asesor_comercial' && (
              <div className="grid gap-2">
                <Label htmlFor="edit_tipo_asesor">Tipo Asesor</Label>
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

            {/* Zona */}
            <div className="grid gap-2">
              <Label htmlFor="edit_zona">Zona</Label>
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
              <Label htmlFor="edit_regional">Regional</Label>
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
                <Label htmlFor="edit_codigo_asesor">Código Asesor</Label>
                <Input
                  id="edit_codigo_asesor"
                  value={formData.codigo_asesor}
                  onChange={(e) => setFormData({ ...formData, codigo_asesor: e.target.value })}
                />
              </div>
            )}

            {/* Código Jefe - solo si rol es jefe */}
            {formData.role === 'jefe_ventas' && (
              <div className="grid gap-2">
                <Label htmlFor="edit_codigo_jefe">Código Jefe</Label>
                <Input
                  id="edit_codigo_jefe"
                  value={formData.codigo_jefe}
                  onChange={(e) => setFormData({ ...formData, codigo_jefe: e.target.value })}
                />
              </div>
            )}

            {/* Estado */}
            <div className="grid gap-2">
              <Label htmlFor="edit_activo">Estado</Label>
              <Select
                value={formData.activo ? 'activo' : 'inactivo'}
                onValueChange={(value) => setFormData({ ...formData, activo: value === 'activo' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
