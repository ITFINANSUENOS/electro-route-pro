import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Save, SkipForward, Trash2, Eye, EyeOff, Loader2, AlertTriangle, Download } from 'lucide-react';
import { PendingAdvisor, usePendingAdvisors } from '@/hooks/usePendingAdvisors';
import { dataService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { getZonaByRegional } from '@/types/auth';
import ExcelJS from 'exceljs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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

const TIPOS_ASESOR = ['INTERNO', 'EXTERNO', 'CORRETAJE'];

interface PendingAdvisorsWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export default function PendingAdvisorsWizard({ open, onOpenChange, onComplete }: PendingAdvisorsWizardProps) {
  const { user } = useAuth();
  const { pendingList, markAsCreated, markAsDiscarded } = usePendingAdvisors();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [discardTarget, setDiscardTarget] = useState<string | null>(null);

  // Local form state for editable fields
  const [formOverrides, setFormOverrides] = useState<Record<string, {
    email: string;
    password: string;
    telefono: string;
    tipo_asesor: string;
    codigo_jefe: string;
  }>>({});

  const { data: regionales = [] } = useQuery({
    queryKey: ['regionales-wizard'],
    queryFn: async () => {
      const { data, error } = await dataService.from('regionales').select('id, nombre, codigo').eq('activo', true).order('nombre');
      if (error) throw error;
      return data as Regional[];
    },
    enabled: open,
  });

  const { data: jefesVentas = [] } = useQuery({
    queryKey: ['jefes-ventas-wizard'],
    queryFn: async () => {
      const { data, error } = await dataService.from('jefes_ventas').select('id, codigo, nombre, regional_id').order('nombre');
      if (error) throw error;
      return data as JefeVentas[];
    },
    enabled: open,
  });

  if (pendingList.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Sin asesores pendientes</DialogTitle>
            <DialogDescription>No hay asesores pendientes por crear.</DialogDescription>
          </DialogHeader>
          <Button onClick={() => { onOpenChange(false); onComplete?.(); }}>Cerrar</Button>
        </DialogContent>
      </Dialog>
    );
  }

  const safeIndex = Math.min(currentIndex, pendingList.length - 1);
  const advisor = pendingList[safeIndex];
  if (!advisor) return null;

  const getForm = (a: PendingAdvisor) => formOverrides[a.codigo_asesor] || {
    email: a.email || '',
    password: '',
    telefono: a.telefono || '',
    tipo_asesor: a.tipo_asesor || '',
    codigo_jefe: a.codigo_jefe || '',
  };

  const form = getForm(advisor);
  const setForm = (fields: Partial<typeof form>) => {
    setFormOverrides(prev => ({
      ...prev,
      [advisor.codigo_asesor]: { ...form, ...fields },
    }));
  };

  const regionalName = regionales.find(r => r.id === advisor.regional_id)?.nombre || 
    regionales.find(r => r.codigo === advisor.cod_region)?.nombre || null;
  
  const filteredJefes = jefesVentas.filter(j => !advisor.regional_id || j.regional_id === advisor.regional_id);

  // Only password and tipo_asesor are required now
  const canSave = form.password && form.password.length >= 6 && form.tipo_asesor;

  const handleDownloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Asesores Pendientes');

    ws.columns = [
      { header: 'Código Asesor', key: 'codigo', width: 15 },
      { header: 'Cédula', key: 'cedula', width: 15 },
      { header: 'Nombre', key: 'nombre', width: 35 },
      { header: 'Regional', key: 'regional', width: 18 },
      { header: 'Sede', key: 'sede', width: 18 },
      { header: 'Cod Región', key: 'cod_region', width: 12 },
      { header: 'Ventas', key: 'ventas', width: 10 },
      { header: 'Mes Detección', key: 'mes', width: 15 },
    ];

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED8936' } };

    pendingList.forEach(a => {
      const regName = regionales.find(r => r.id === a.regional_id)?.nombre ||
        regionales.find(r => r.codigo === a.cod_region)?.nombre || '-';
      ws.addRow({
        codigo: a.codigo_asesor,
        cedula: a.cedula || '-',
        nombre: a.nombre_completo || '-',
        regional: regName,
        sede: a.sede || '-',
        cod_region: a.cod_region ?? '-',
        ventas: a.num_ventas ?? 0,
        mes: a.mes_deteccion && a.anio_deteccion ? `${a.mes_deteccion}/${a.anio_deteccion}` : '-',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asesores_pendientes_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Excel descargado');
  };

  const handleSave = async () => {
    if (!canSave || !user) return;
    setCreating(true);
    try {
      // 1. Create user via edge function (email optional)
      const response = await dataService.functions.invoke<{ error?: string; user?: { id: string } }>('create-user', {
        body: {
          email: form.email || undefined,
          password: form.password,
          cedula: advisor.cedula || '',
          nombre_completo: advisor.nombre_completo || '',
          telefono: form.telefono || undefined,
          zona: regionalName ? getZonaByRegional(regionalName) || undefined : undefined,
          role: 'asesor_comercial',
        },
      });

      if (response.error) {
        let errorMsg = 'Error creando usuario';
        try {
          const errObj = response.error as any;
          const errorBody = await errObj?.context?.json?.();
          if (errorBody?.error) errorMsg = errorBody.error;
          else errorMsg = response.error.message;
        } catch { errorMsg = response.error.message; }
        throw new Error(errorMsg);
      }

      if (response.data?.error) throw new Error(response.data.error);

      const newUserId = response.data?.user?.id;
      if (!newUserId) throw new Error('No se recibió ID del usuario creado');

      // 2. Update profile with additional fields
      const { error: updateError } = await dataService
        .from('profiles')
        .update({
          regional_id: advisor.regional_id || null,
          codigo_asesor: advisor.codigo_asesor,
          codigo_jefe: form.codigo_jefe || null,
          tipo_asesor: form.tipo_asesor || null,
          correo: form.email || null,
        })
        .eq('user_id', newUserId);

      if (updateError) console.error('Error updating profile:', updateError);

      // 3. Mark as created
      await markAsCreated(advisor.codigo_asesor, user.id);

      toast.success(`${advisor.nombre_completo || advisor.codigo_asesor} creado exitosamente`);

      // Move to next or close
      if (pendingList.length <= 1) {
        onOpenChange(false);
        onComplete?.();
      } else {
        setCurrentIndex(prev => Math.min(prev, pendingList.length - 2));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error creando usuario';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDiscard = async () => {
    if (!discardTarget || !user) return;
    try {
      await markAsDiscarded(discardTarget, user.id);
      toast.success('Asesor descartado');
      setDiscardTarget(null);
      if (pendingList.length <= 1) {
        onOpenChange(false);
        onComplete?.();
      } else {
        setCurrentIndex(prev => Math.min(prev, pendingList.length - 2));
      }
    } catch {
      toast.error('Error descartando asesor');
    }
  };

  const goNext = () => setCurrentIndex(prev => Math.min(prev + 1, pendingList.length - 1));
  const goPrev = () => setCurrentIndex(prev => Math.max(prev - 1, 0));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Crear Asesores Pendientes</DialogTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadExcel} title="Descargar Excel">
                  <Download className="h-4 w-4" />
                </Button>
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  {safeIndex + 1} / {pendingList.length}
                </Badge>
              </div>
            </div>
            <DialogDescription>
              Complete los datos faltantes para registrar al asesor en el sistema.
            </DialogDescription>
          </DialogHeader>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={goPrev} disabled={safeIndex === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button variant="ghost" size="sm" onClick={goNext} disabled={safeIndex === pendingList.length - 1}>
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Readonly fields from CSV */}
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Datos del informe (no editables)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Nombre</Label>
                  <p className="text-sm font-medium">{advisor.nombre_completo || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cédula</Label>
                  <p className="text-sm font-medium">{advisor.cedula || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Código Asesor</Label>
                  <p className="text-sm font-medium">{advisor.codigo_asesor}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Regional</Label>
                  <p className="text-sm font-medium">{regionalName || <span className="text-orange-500">Sin regional</span>}</p>
                </div>
                {advisor.sede && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Sede (CSV)</Label>
                    <p className="text-sm font-medium">{advisor.sede}</p>
                  </div>
                )}
                {!regionalName && advisor.cod_region && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Cod Región (CSV)</Label>
                    <p className="text-sm font-medium text-orange-500">{advisor.cod_region}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Ventas detectadas</Label>
                  <p className="text-sm font-medium">{advisor.num_ventas}</p>
                </div>
              </div>
            </div>

            {/* Editable fields */}
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="wiz-email">Email <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <Input
                  id="wiz-email"
                  type="email"
                  placeholder="asesor@empresa.com"
                  value={form.email}
                  onChange={e => setForm({ email: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="wiz-password">Contraseña *</Label>
                <div className="relative">
                  <Input
                    id="wiz-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={e => setForm({ password: e.target.value })}
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

              <div className="grid gap-2">
                <Label htmlFor="wiz-tipo">Tipo Asesor *</Label>
                <Select value={form.tipo_asesor} onValueChange={v => setForm({ tipo_asesor: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_ASESOR.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="wiz-telefono">Teléfono <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <Input
                  id="wiz-telefono"
                  placeholder="3001234567"
                  value={form.telefono}
                  onChange={e => setForm({ telefono: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="wiz-jefe">Jefe de Ventas</Label>
                <Select
                  value={form.codigo_jefe || '__none__'}
                  onValueChange={v => setForm({ codigo_jefe: v === '__none__' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione jefe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin asignar</SelectItem>
                    {filteredJefes.map(j => (
                      <SelectItem key={j.id} value={j.codigo}>
                        {j.nombre} ({j.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDiscardTarget(advisor.codigo_asesor)}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Descartar
              </Button>
              <Button variant="ghost" size="sm" onClick={goNext} disabled={safeIndex === pendingList.length - 1}>
                <SkipForward className="h-4 w-4 mr-1" /> Saltar
              </Button>
            </div>
            <Button onClick={handleSave} disabled={!canSave || creating}>
              {creating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Guardar y Crear
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discard confirmation */}
      <AlertDialog open={!!discardTarget} onOpenChange={open => !open && setDiscardTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar descarte
            </AlertDialogTitle>
            <AlertDialogDescription>
              Este asesor será descartado y no aparecerá de nuevo como pendiente. ¿Está seguro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
