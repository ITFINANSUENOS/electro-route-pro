import { useState, useEffect } from "react";
import { dataService } from "@/services";
import { useAuth } from "@/contexts/AuthContext";
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
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Loader2, RefreshCw, ArrowRightLeft } from "lucide-react";
import { MigrateRegionalDialog } from "./MigrateRegionalDialog";

interface Regional {
  id: string;
  nombre: string;
  codigo: number;
  zona: string | null;
  activo: boolean;
  created_at: string;
}

const ZONAS = ['norte', 'sur', 'centro', 'oriente'];

export function RegionalesConfig() {
  const { user } = useAuth();
  const [regionales, setRegionales] = useState<Regional[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRegional, setEditingRegional] = useState<Regional | null>(null);
  const [migrateDialogOpen, setMigrateDialogOpen] = useState(false);
  const [migratingRegional, setMigratingRegional] = useState<Regional | null>(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    zona: '',
    activo: true,
  });

  const fetchRegionales = async () => {
    setLoading(true);
    try {
      const { data, error } = await dataService
        .from('regionales')
        .select('*')
        .order('codigo');

      if (error) throw error;
      setRegionales((data || []) as Regional[]);
    } catch (error) {
      console.error('Error fetching regionales:', error);
      toast.error('Error cargando regionales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegionales();
  }, []);

  const resetForm = () => {
    setFormData({
      nombre: '',
      codigo: '',
      zona: '',
      activo: true,
    });
    setEditingRegional(null);
  };

  const openEditDialog = (regional: Regional) => {
    setEditingRegional(regional);
    setFormData({
      nombre: regional.nombre,
      codigo: regional.codigo.toString(),
      zona: regional.zona || '',
      activo: regional.activo ?? true,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const logChange = async (
    registroId: string,
    campo: string,
    valorAnterior: string | null,
    valorNuevo: string | null
  ) => {
    try {
      await dataService.from('historial_ediciones').insert({
        tabla: 'regionales',
        registro_id: registroId,
        campo_editado: campo,
        valor_anterior: valorAnterior,
        valor_nuevo: valorNuevo,
        modificado_por: user?.id,
      });
    } catch (error) {
      console.error('Error logging change:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.codigo) {
      toast.error('Complete los campos requeridos');
      return;
    }

    setSaving(true);
    try {
      if (editingRegional) {
        // Update existing
        const { error } = await dataService
          .from('regionales')
          .update({
            nombre: formData.nombre,
            codigo: parseInt(formData.codigo),
            zona: formData.zona || null,
            activo: formData.activo,
          })
          .eq('id', editingRegional.id);

        if (error) throw error;

        // Log changes
        if (editingRegional.nombre !== formData.nombre) {
          await logChange(editingRegional.id, 'nombre', editingRegional.nombre, formData.nombre);
        }
        if (editingRegional.codigo.toString() !== formData.codigo) {
          await logChange(editingRegional.id, 'codigo', editingRegional.codigo.toString(), formData.codigo);
        }
        if (editingRegional.zona !== formData.zona) {
          await logChange(editingRegional.id, 'zona', editingRegional.zona, formData.zona || null);
        }
        if (editingRegional.activo !== formData.activo) {
          await logChange(editingRegional.id, 'activo', editingRegional.activo.toString(), formData.activo.toString());
        }

        toast.success('Regional actualizada');
      } else {
        // Create new
        const { data, error } = await dataService
          .from('regionales')
          .insert({
            nombre: formData.nombre,
            codigo: parseInt(formData.codigo),
            zona: formData.zona || null,
            activo: formData.activo,
          })
          .select()
          .single();

        if (error) throw error;

        // Log creation
        await logChange((data as unknown as Regional).id, 'creacion', null, `Regional ${formData.nombre} creada`);

        toast.success('Regional creada');
      }

      setDialogOpen(false);
      resetForm();
      fetchRegionales();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error guardando regional';
      toast.error(message);
      console.error('Error saving regional:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Regionales</CardTitle>
            <CardDescription>
              Gestiona los códigos y zonas de las regionales del sistema
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchRegionales} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Regional
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead className="w-[100px]">Estado</TableHead>
                <TableHead className="w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : regionales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay regionales configuradas
                  </TableCell>
                </TableRow>
              ) : (
                regionales.map((regional) => (
                  <TableRow key={regional.id}>
                    <TableCell className="font-mono font-medium">{regional.codigo}</TableCell>
                    <TableCell className="font-medium">{regional.nombre}</TableCell>
                    <TableCell className="capitalize">{regional.zona || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={regional.activo ? 'default' : 'secondary'}>
                        {regional.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(regional)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {regional.activo && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Migrar a otra regional"
                            onClick={() => {
                              setMigratingRegional(regional);
                              setMigrateDialogOpen(true);
                            }}
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Dialog para crear/editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRegional ? 'Editar Regional' : 'Nueva Regional'}
              </DialogTitle>
              <DialogDescription>
                {editingRegional 
                  ? 'Modifica los datos de la regional. Los cambios serán registrados en el historial.'
                  : 'Ingresa los datos para crear una nueva regional.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    type="number"
                    placeholder="101"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    placeholder="PASTO"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value.toUpperCase() })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="zona">Zona</Label>
                  <Select
                    value={formData.zona || "none"}
                    onValueChange={(value) => setFormData({ ...formData, zona: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione zona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin zona</SelectItem>
                      {ZONAS.map((z) => (
                        <SelectItem key={z} value={z}>
                          {z.charAt(0).toUpperCase() + z.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="activo">Activo</Label>
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingRegional ? 'Guardar Cambios' : 'Crear Regional'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>

      {/* Migrate Regional Dialog */}
      {migratingRegional && (
        <MigrateRegionalDialog
          open={migrateDialogOpen}
          onOpenChange={setMigrateDialogOpen}
          sourceRegional={migratingRegional}
          allRegionales={regionales}
          onMigrationComplete={fetchRegionales}
        />
      )}
    </Card>
  );
}
