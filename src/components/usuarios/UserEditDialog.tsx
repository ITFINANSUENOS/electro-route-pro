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
import { dataService } from "@/services";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { roleLabels, UserRole, getZonaByRegional } from "@/types/auth";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

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

interface UserEditDialogProps {
  user: UserWithRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regionales: Regional[];
  onUserUpdated: () => void;
  limitedEdit?: boolean; // For leaders/coordinators who can only edit limited fields
}

const ROLES: UserRole[] = [
  'asesor_comercial',
  'jefe_ventas',
  'lider_zona',
  'coordinador_comercial',
  'administrativo',
  'administrador',
];

const TIPOS_ASESOR = ['INTERNO', 'EXTERNO', 'CORRETAJE'];

// Regionales that have jefes de ventas
const REGIONALES_CON_JEFES = ['SANTANDER', 'POPAYAN', 'AMBIENTA', 'BORDO'];

export function UserEditDialog({ 
  user, 
  open, 
  onOpenChange, 
  regionales,
  onUserUpdated,
  limitedEdit = false,
}: UserEditDialogProps) {
  const { profile: currentUserProfile } = useAuth();
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

  // Track original values for historial
  const [originalData, setOriginalData] = useState<typeof formData | null>(null);

  // Fetch jefes de ventas
  const { data: jefesVentas = [] } = useQuery({
    queryKey: ['jefes-ventas-all'],
    queryFn: async () => {
      const { data, error } = await dataService
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

  useEffect(() => {
    if (user) {
      const data = {
        nombre_completo: user.nombre_completo || '',
        telefono: user.telefono || '',
        zona: user.zona || '',
        correo: user.correo || '',
        activo: user.activo,
        role: (user.role || '') as UserRole | '',
        regional_id: user.regional_id || '',
        codigo_asesor: user.codigo_asesor || '',
        codigo_jefe: user.codigo_jefe || '',
        tipo_asesor: user.tipo_asesor || '',
      };
      setFormData(data);
      setOriginalData(data);
    }
  }, [user]);

  // Log change to historial_ediciones
  const logChange = async (campo: string, valorAnterior: string | null, valorNuevo: string | null) => {
    if (!user) return;
    
    try {
      await dataService.from('historial_ediciones').insert({
        tabla: 'profiles',
        registro_id: user.id,
        campo_editado: campo,
        valor_anterior: valorAnterior,
        valor_nuevo: valorNuevo,
        modificado_por: currentUserProfile?.user_id || null,
      });
    } catch (error) {
      console.error('Error logging change:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !originalData) return;

    setSaving(true);
    try {
      // Prepare update data based on limited vs full edit
      const updateData: Record<string, unknown> = {};
      
      if (limitedEdit) {
        // Limited edit: only telefono, activo, codigo_jefe
        updateData.telefono = formData.telefono || null;
        updateData.activo = formData.activo;
        updateData.codigo_jefe = formData.codigo_jefe || null;
      } else {
        // Full edit
        updateData.nombre_completo = formData.nombre_completo;
        updateData.telefono = formData.telefono || null;
        updateData.zona = formData.zona || null;
        updateData.correo = formData.correo || null;
        updateData.activo = formData.activo;
        updateData.regional_id = formData.regional_id || null;
        updateData.codigo_asesor = formData.codigo_asesor || null;
        updateData.codigo_jefe = formData.codigo_jefe || null;
        updateData.tipo_asesor = formData.tipo_asesor || null;
      }

      // Update profile
      const { error: profileError } = await dataService
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Log changes to historial
      if (originalData.telefono !== formData.telefono) {
        await logChange('telefono', originalData.telefono, formData.telefono);
      }
      if (originalData.activo !== formData.activo) {
        await logChange('activo', originalData.activo ? 'Activo' : 'Inactivo', formData.activo ? 'Activo' : 'Inactivo');
      }
      if (originalData.codigo_jefe !== formData.codigo_jefe) {
        await logChange('codigo_jefe', originalData.codigo_jefe, formData.codigo_jefe);
      }
      
      // Log additional changes for full edit
      if (!limitedEdit) {
        if (originalData.nombre_completo !== formData.nombre_completo) {
          await logChange('nombre_completo', originalData.nombre_completo, formData.nombre_completo);
        }
        if (originalData.zona !== formData.zona) {
          await logChange('zona', originalData.zona, formData.zona);
        }
        if (originalData.correo !== formData.correo) {
          await logChange('correo', originalData.correo, formData.correo);
        }
        if (originalData.regional_id !== formData.regional_id) {
          await logChange('regional_id', originalData.regional_id, formData.regional_id);
        }
        if (originalData.codigo_asesor !== formData.codigo_asesor) {
          await logChange('codigo_asesor', originalData.codigo_asesor, formData.codigo_asesor);
        }
        if (originalData.tipo_asesor !== formData.tipo_asesor) {
          await logChange('tipo_asesor', originalData.tipo_asesor, formData.tipo_asesor);
        }
      }

      // Update role if changed (only for full edit)
      if (!limitedEdit && formData.role && formData.role !== user.role) {
        // First delete existing role
        await dataService
          .from('user_roles')
          .delete()
          .eq('user_id', user.user_id);

        // Then insert new role
        const { error: roleError } = await dataService
          .from('user_roles')
          .insert({
            user_id: user.user_id,
            role: formData.role,
          });

        if (roleError) throw roleError;
        
        await logChange('role', user.role || '', formData.role);
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

  // Calculate zona from regional for display
  const zonaCalculada = formData.regional_id 
    ? getZonaByRegional(regionales.find(r => r.id === formData.regional_id)?.nombre || '')
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {limitedEdit ? 'Editar Datos del Usuario' : 'Editar Usuario'}
          </DialogTitle>
          <DialogDescription>
            {limitedEdit 
              ? 'Puedes modificar el teléfono, estado y jefe de ventas del usuario.'
              : `Modifique los datos del usuario. Cédula: ${user.cedula}`
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Nombre Completo - Read-only for limited edit */}
            <div className="grid gap-2">
              <Label htmlFor="edit_nombre">Nombre Completo {!limitedEdit && '*'}</Label>
              {limitedEdit ? (
                <div className="h-10 px-3 py-2 border rounded-md bg-muted text-muted-foreground">
                  {formData.nombre_completo}
                </div>
              ) : (
                <Input
                  id="edit_nombre"
                  value={formData.nombre_completo}
                  onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                  required
                />
              )}
            </div>

            {/* Cédula - Read-only always */}
            <div className="grid gap-2">
              <Label>Cédula</Label>
              <div className="h-10 px-3 py-2 border rounded-md bg-muted text-muted-foreground">
                {user.cedula}
              </div>
            </div>

            {/* Email - Read-only for limited edit */}
            {!limitedEdit && (
              <div className="grid gap-2">
                <Label htmlFor="edit_correo">Email</Label>
                <Input
                  id="edit_correo"
                  type="email"
                  value={formData.correo}
                  onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                />
              </div>
            )}

            {/* Teléfono - Editable */}
            <div className="grid gap-2">
              <Label htmlFor="edit_telefono">Teléfono</Label>
              <Input
                id="edit_telefono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>

            {/* Rol - Only for full edit */}
            {!limitedEdit && (
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
            )}

            {/* Tipo Asesor - Only for full edit and if role is asesor */}
            {!limitedEdit && formData.role === 'asesor_comercial' && (
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

            {/* Regional - Only for full edit */}
            {!limitedEdit && (
              <div className="grid gap-2">
                <Label htmlFor="edit_regional">Regional</Label>
                <Select
                  value={formData.regional_id}
                  onValueChange={(value) => {
                    const regional = regionales.find(r => r.id === value);
                    const zona = regional ? getZonaByRegional(regional.nombre) : '';
                    setFormData({ 
                      ...formData, 
                      regional_id: value,
                      zona: zona || '',
                      // Reset codigo_jefe when regional changes if it doesn't match
                      codigo_jefe: jefesVentas.find(j => j.codigo === formData.codigo_jefe && j.regional_id === value) 
                        ? formData.codigo_jefe 
                        : ''
                    });
                  }}
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
            )}

            {/* Zona - Display only (auto-calculated from regional) */}
            <div className="grid gap-2">
              <Label>Zona</Label>
              <div className="h-10 px-3 py-2 border rounded-md bg-muted text-muted-foreground">
                {zonaCalculada ? zonaCalculada.charAt(0).toUpperCase() + zonaCalculada.slice(1) : (formData.zona ? formData.zona.charAt(0).toUpperCase() + formData.zona.slice(1) : 'Sin zona')}
              </div>
              {!limitedEdit && (
                <p className="text-xs text-muted-foreground">
                  La zona se asigna automáticamente según la regional
                </p>
              )}
            </div>

            {/* Código Asesor - Only for full edit and if role is asesor */}
            {!limitedEdit && formData.role === 'asesor_comercial' && (
              <div className="grid gap-2">
                <Label htmlFor="edit_codigo_asesor">Código Asesor</Label>
                <Input
                  id="edit_codigo_asesor"
                  value={formData.codigo_asesor}
                  onChange={(e) => setFormData({ ...formData, codigo_asesor: e.target.value })}
                />
              </div>
            )}

            {/* Jefe de Ventas - Editable for limited edit (only if regional has jefes) */}
            {(formData.role === 'asesor_comercial' || (limitedEdit && user.role === 'asesor_comercial')) && 
             formData.regional_id && regionalHasJefes && (
              <div className="grid gap-2">
                <Label htmlFor="edit_jefe_ventas">Jefe de Ventas</Label>
                <Select
                  value={formData.codigo_jefe || '__none__'}
                  onValueChange={(value) => setFormData({ ...formData, codigo_jefe: value === '__none__' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione jefe de ventas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin asignar</SelectItem>
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

            {/* Código Jefe - Only for full edit and if role is jefe */}
            {!limitedEdit && formData.role === 'jefe_ventas' && (
              <div className="grid gap-2">
                <Label htmlFor="edit_codigo_jefe">Código Jefe</Label>
                <Input
                  id="edit_codigo_jefe"
                  value={formData.codigo_jefe}
                  onChange={(e) => setFormData({ ...formData, codigo_jefe: e.target.value })}
                />
              </div>
            )}

            {/* Estado - Editable */}
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
