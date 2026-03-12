import { useState, useEffect } from "react";
import { dataService } from "@/services";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, RefreshCw, Search, X } from "lucide-react";

interface FormaPago {
  id: string;
  codigo: string;
  nombre: string;
  tipo_venta: string;
  activo: boolean;
  cod_forma: string | null;
  subcategoria: string | null;
  created_at: string;
}

const TIPOS_VENTA = [
  { value: 'CONTADO', label: 'Contado', color: 'bg-green-100 text-green-800' },
  { value: 'FINANSUENOS', label: 'FinanSueños', color: 'bg-purple-100 text-purple-800' },
  { value: 'ALIADOS', label: 'Aliados', color: 'bg-orange-100 text-orange-800' },
  { value: 'OTROS', label: 'No Aplica', color: 'bg-gray-100 text-gray-800' },
];

const SUBCATEGORIAS = [
  { value: 'LARGO_PLAZO', label: 'Largo Plazo', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'CORTO_PLAZO', label: 'Corto Plazo', color: 'bg-violet-100 text-violet-800' },
];

export function FormasPagoConfig() {
  const { user } = useAuth();
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingForma, setEditingForma] = useState<FormaPago | null>(null);
  
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterSubcat, setFilterSubcat] = useState<string>('all');
  const [filterCodigo, setFilterCodigo] = useState('');
  
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    tipo_venta: '',
    activo: true,
    cod_forma: '',
    subcategoria: '',
  });

  const fetchFormasPago = async () => {
    setLoading(true);
    try {
      const { data, error } = await dataService
        .from('formas_pago')
        .select('*')
        .order('tipo_venta')
        .order('codigo');

      if (error) throw error;
      setFormasPago((data || []) as FormaPago[]);
    } catch (error) {
      console.error('Error fetching formas de pago:', error);
      toast.error('Error cargando formas de pago');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFormasPago(); }, []);

  const filteredFormas = formasPago.filter((forma) => {
    if (filterTipo !== 'all' && forma.tipo_venta !== filterTipo) return false;
    if (filterSubcat !== 'all') {
      if (filterSubcat === 'none' && forma.subcategoria) return false;
      if (filterSubcat !== 'none' && forma.subcategoria !== filterSubcat) return false;
    }
    if (filterCodigo && !forma.codigo.toLowerCase().includes(filterCodigo.toLowerCase()) && 
        !forma.nombre.toLowerCase().includes(filterCodigo.toLowerCase()) &&
        !(forma.cod_forma || '').toLowerCase().includes(filterCodigo.toLowerCase())) return false;
    return true;
  });

  const hasActiveFilters = filterTipo !== 'all' || filterSubcat !== 'all' || filterCodigo !== '';

  const clearFilters = () => {
    setFilterTipo('all');
    setFilterSubcat('all');
    setFilterCodigo('');
  };

  const resetForm = () => {
    setFormData({ codigo: '', nombre: '', tipo_venta: '', activo: true, cod_forma: '', subcategoria: '' });
    setEditingForma(null);
  };

  const openEditDialog = (forma: FormaPago) => {
    setEditingForma(forma);
    setFormData({
      codigo: forma.codigo,
      nombre: forma.nombre,
      tipo_venta: forma.tipo_venta,
      activo: forma.activo ?? true,
      cod_forma: forma.cod_forma || '',
      subcategoria: forma.subcategoria || '',
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const logChange = async (registroId: string, campo: string, valorAnterior: string | null, valorNuevo: string | null) => {
    try {
      await dataService.from('historial_ediciones').insert({
        tabla: 'formas_pago',
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
    if (!formData.codigo || !formData.nombre || !formData.tipo_venta) {
      toast.error('Complete los campos requeridos');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        codigo: formData.codigo,
        nombre: formData.nombre,
        tipo_venta: formData.tipo_venta,
        activo: formData.activo,
        cod_forma: formData.cod_forma || null,
        subcategoria: formData.subcategoria || null,
      };

      if (editingForma) {
        const { error } = await dataService
          .from('formas_pago')
          .update(payload as Record<string, unknown>)
          .eq('id', editingForma.id);
        if (error) throw error;

        // Log changes
        for (const [field, newVal] of Object.entries(payload)) {
          const oldVal = (editingForma as any)[field];
          const oldStr = oldVal == null ? null : String(oldVal);
          const newStr = newVal == null ? null : String(newVal);
          if (oldStr !== newStr) {
            await logChange(editingForma.id, field, oldStr, newStr);
          }
        }
        toast.success('Forma de pago actualizada');
      } else {
        const { data, error } = await dataService
          .from('formas_pago')
          .insert(payload as Record<string, unknown>)
          .select()
          .single();
        if (error) throw error;
        await logChange((data as unknown as FormaPago).id, 'creacion', null, `Forma de pago ${formData.codigo} creada`);
        toast.success('Forma de pago creada');
      }

      setDialogOpen(false);
      resetForm();
      fetchFormasPago();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error guardando forma de pago';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const getTipoVentaBadge = (tipo: string) => {
    const tipoInfo = TIPOS_VENTA.find(t => t.value === tipo);
    return tipoInfo ? <Badge className={tipoInfo.color}>{tipoInfo.label}</Badge> : <Badge variant="outline">{tipo}</Badge>;
  };

  const getSubcategoriaBadge = (subcat: string | null) => {
    if (!subcat) return <span className="text-muted-foreground text-xs">—</span>;
    const info = SUBCATEGORIAS.find(s => s.value === subcat);
    return info ? <Badge variant="outline" className={info.color}>{info.label}</Badge> : <Badge variant="outline">{subcat}</Badge>;
  };

  const summary = TIPOS_VENTA.map(tipo => ({
    ...tipo,
    count: formasPago.filter(f => f.tipo_venta === tipo.value).length,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Clasificación de Formas de Pago</CardTitle>
            <CardDescription>
              Configura cómo se clasifican las formas de pago y sus subcategorías (Largo/Corto Plazo)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchFormasPago} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          {summary.map((tipo) => (
            <Badge key={tipo.value} variant="outline" className="cursor-pointer hover:bg-muted"
              onClick={() => setFilterTipo(filterTipo === tipo.value ? 'all' : tipo.value)}>
              <span className={`w-2 h-2 rounded-full mr-2 ${tipo.color.split(' ')[0]}`} />
              {tipo.label}: {tipo.count}
            </Badge>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <Label className="text-xs text-muted-foreground">Tipo de Venta</Label>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {TIPOS_VENTA.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <Label className="text-xs text-muted-foreground">Subcategoría</Label>
            <Select value={filterSubcat} onValueChange={setFilterSubcat}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {SUBCATEGORIAS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
                <SelectItem value="none">Sin subcategoría</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-[200px] flex-1 max-w-xs">
            <Label className="text-xs text-muted-foreground">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Código, nombre..." value={filterCodigo}
                onChange={(e) => setFilterCodigo(e.target.value)} className="pl-8 h-9" />
            </div>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
              <X className="h-4 w-4 mr-1" /> Limpiar
            </Button>
          )}
        </div>

        {hasActiveFilters && (
          <p className="text-sm text-muted-foreground">
            Mostrando {filteredFormas.length} de {formasPago.length} formas de pago
          </p>
        )}

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-[100px]">COD_FORMA_</TableHead>
                <TableHead className="w-[130px]">Tipo de Venta</TableHead>
                <TableHead className="w-[120px]">Subcategoría</TableHead>
                <TableHead className="w-[80px]">Estado</TableHead>
                <TableHead className="w-[60px]">Editar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredFormas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {hasActiveFilters ? 'No hay formas de pago que coincidan' : 'No hay formas de pago configuradas'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredFormas.map((forma) => (
                  <TableRow key={forma.id}>
                    <TableCell className="font-mono font-medium text-xs">{forma.codigo}</TableCell>
                    <TableCell className="text-sm">{forma.nombre}</TableCell>
                    <TableCell className="font-mono text-muted-foreground text-xs">{forma.cod_forma || '—'}</TableCell>
                    <TableCell>{getTipoVentaBadge(forma.tipo_venta)}</TableCell>
                    <TableCell>{getSubcategoriaBadge(forma.subcategoria)}</TableCell>
                    <TableCell>
                      <Badge variant={forma.activo ? 'default' : 'secondary'}>
                        {forma.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(forma)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingForma ? 'Editar Forma de Pago' : 'Nueva Forma de Pago'}</DialogTitle>
              <DialogDescription>
                {editingForma 
                  ? 'Los cambios serán registrados en el historial.'
                  : 'Ingresa los datos para crear una nueva forma de pago.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="codigo">Código (FORMA1PAGO) *</Label>
                  <Input id="codigo" value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })} required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="nombre">Nombre Descriptivo *</Label>
                  <Input id="nombre" value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cod_forma">COD_FORMA_ (Referencia)</Label>
                  <Input id="cod_forma" placeholder="FS10, PB01..." value={formData.cod_forma}
                    onChange={(e) => setFormData({ ...formData, cod_forma: e.target.value.toUpperCase() })} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tipo_venta">Tipo de Venta *</Label>
                  <Select value={formData.tipo_venta}
                    onValueChange={(value) => setFormData({ ...formData, tipo_venta: value, subcategoria: value !== 'FINANSUENOS' ? '' : formData.subcategoria })}>
                    <SelectTrigger><SelectValue placeholder="Seleccione tipo" /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_VENTA.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.tipo_venta === 'FINANSUENOS' && (
                  <div className="grid gap-2">
                    <Label htmlFor="subcategoria">Subcategoría</Label>
                    <Select value={formData.subcategoria || 'none'}
                      onValueChange={(value) => setFormData({ ...formData, subcategoria: value === 'none' ? '' : value })}>
                      <SelectTrigger><SelectValue placeholder="Sin subcategoría" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin subcategoría</SelectItem>
                        {SUBCATEGORIAS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Define si esta forma de pago es Largo o Corto Plazo para el desglose comparativo
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="activo">Activo</Label>
                  <Switch id="activo" checked={formData.activo}
                    onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingForma ? 'Guardar Cambios' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
