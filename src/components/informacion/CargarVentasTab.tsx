import { useState, useCallback, useMemo } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Clock, Loader2, CalendarCheck, Lock, AlertTriangle, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { dataService } from '@/services';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesPeriod, getMonthName, isClosingDay } from '@/hooks/useSalesPeriod';
import MonthCloseDialog from './MonthCloseDialog';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const AVAILABLE_YEARS = [2025, 2026];

interface UploadHistory {
  id: string;
  nombre_archivo: string;
  created_at: string;
  registros_procesados: number | null;
  estado: string | null;
  mensaje_error: string | null;
}

// Mapeo completo de nombres de columna CSV a campos de la tabla ventas
const HEADER_MAP: Record<string, string> = {
  'tipo': 'tipo_docum',
  'cod_region': 'cod_region',
  'codregion': 'cod_region',
  'sede': 'sede',
  'codigo_cco': 'codigo_cco',
  'cod_cco': 'codigo_cco',
  'nombre_cco': 'nombre_cco',
  'identifica': 'cliente_identificacion',
  'identificacion': 'cliente_identificacion',
  'cli_identificacion': 'cliente_identificacion',
  'cliente': 'cliente_nombre',
  'cli_nombre': 'cliente_nombre',
  'nombre_cliente': 'cliente_nombre',
  'telefono': 'cliente_telefono',
  'cli_telefono': 'cliente_telefono',
  'direccion': 'cliente_direccion',
  'cli_direccion': 'cliente_direccion',
  'correoe': 'cliente_email',
  'email': 'cliente_email',
  'cli_email': 'cliente_email',
  'tipo_docum': 'tipo_documento',
  'numero_doc': 'numero_doc',
  'nro_doc': 'numero_doc',
  'fecha_fact': 'fecha',
  'fecha': 'fecha',
  'destino': 'destino',
  'dnonombre': 'destino_nombre',
  'cod_forma_': 'cod_forma_pago',
  'forma1pago': 'forma1_pago',
  'formapago': 'forma_pago',
  'regional': 'regional',
  'zona': 'zona',
  'cedula_ase': 'cedula_asesor',
  'cedula': 'cedula_asesor',
  'codigo_ase': 'codigo_asesor',
  'cod_asesor': 'codigo_asesor',
  'asesor': 'asesor_nombre',
  'nombre_asesor': 'asesor_nombre',
  'codigo_jef': 'codigo_jefe',
  'cod_jefe': 'codigo_jefe',
  'jefe_venta': 'jefe_ventas',
  'jefe': 'jefe_ventas',
  'codigo_ean': 'codigo_ean',
  'ean': 'codigo_ean',
  'nombre_pro': 'producto',
  'producto': 'producto',
  'referencia': 'referencia',
  'nombre_cor': 'nombre_corto',
  'categoria2': 'categoria',
  'categoria': 'categoria',
  'codmarca': 'cod_marca',
  'marca': 'marca',
  'codlinea': 'cod_linea',
  'nombre_lin': 'linea',
  'linea': 'linea',
  'lote': 'lote',
  'serial2': 'serial',
  'serial': 'serial',
  'mcnclase': 'mcn_clase',
  'cantidad': 'cantidad',
  'subtcontad': 'subtotal',
  'subtotal': 'subtotal',
  'ivacontado': 'iva',
  'iva': 'iva',
  'totcontado': 'total',
  'totventa': 'total',
  'total': 'total',
  'vtas_ant_i': 'vtas_ant_i',
  'vtasanti': 'vtas_ant_i',
  'motivodev': 'motivo_dev',
  'tipo_venta': 'tipo_venta',
};

const NUMERIC_FIELDS = ['cantidad', 'subtotal', 'iva', 'total', 'vtas_ant_i', 'cod_region'];

export default function CargarVentasTab() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showFewerRecordsDialog, setShowFewerRecordsDialog] = useState(false);
  const [fewerRecordsInfo, setFewerRecordsInfo] = useState<{ previous: number; current: number } | null>(null);
  const [pendingUploadData, setPendingUploadData] = useState<{ csvContent: string; cargaId: string } | null>(null);
  
  // Historic mode state
  const [historicMode, setHistoricMode] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  
  const { toast } = useToast();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  
  const { 
    getCurrentTargetPeriod, 
    closePeriod, 
    isClosingPeriod, 
    isPeriodClosed,
    getOrCreatePeriod 
  } = useSalesPeriod();

  const canUseHistoricMode = role === 'administrador' || role === 'coordinador_comercial';

  const autoTargetPeriod = useMemo(() => getCurrentTargetPeriod(), []);
  const autoPeriodClosed = useMemo(() => isPeriodClosed(autoTargetPeriod.month, autoTargetPeriod.year), [autoTargetPeriod]);
  
  const targetPeriod = historicMode && canUseHistoricMode
    ? { month: selectedMonth, year: selectedYear, isClosingDay: false }
    : autoTargetPeriod;
  const periodClosed = historicMode ? false : autoPeriodClosed;

  const { data: uploadHistory, refetch } = useQuery({
    queryKey: ['upload-history-ventas'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('carga_archivos')
        .select('*')
        .eq('tipo', 'ventas')
        .order('created_at', { ascending: false })
        .limit(10) as any);
      
      if (error) throw error;
      return data as UploadHistory[];
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files?.[0]) validateAndSetFile(files[0]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) validateAndSetFile(files[0]);
  };

  const validateAndSetFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({ title: 'Formato no válido', description: 'Solo se aceptan archivos .CSV', variant: 'destructive' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'Archivo muy grande', description: 'Máximo 20MB', variant: 'destructive' });
      return;
    }
    setFile(file);
  };

  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const normalizeHeader = (header: string): string => {
    return header.toLowerCase().trim()
      .replace(/[\s\-\.]/g, '_')
      .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e')
      .replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o')
      .replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
      .replace(/_+/g, '_').replace(/^_|_$/g, '');
  };

  const parseDate = (value: string): string => {
    if (!value?.trim()) return new Date().toISOString().split('T')[0];
    const clean = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    const parts = clean.split(/[\/\-]/);
    if (parts.length === 3) {
      const [first, second, third] = parts;
      if (first.length === 4) return `${first}-${second.padStart(2, '0')}-${third.padStart(2, '0')}`;
      return `${third.length === 2 ? '20' + third : third}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
    }
    return new Date().toISOString().split('T')[0];
  };

  /** Count how many rows in the CSV correspond to the target month */
  const countRowsInMonth = (csvContent: string, month: number, year: number): { total: number; inMonth: number } => {
    const lines = csvContent.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { total: 0, inMonth: 0 };

    const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
    const headers = parseCSVLine(lines[0], delimiter);
    
    const fechaIdx = headers.findIndex(h => {
      const n = normalizeHeader(h);
      return n === 'fecha_fact' || n === 'fecha';
    });

    if (fechaIdx === -1) return { total: lines.length - 1, inMonth: 0 };

    let inMonth = 0;
    let total = 0;

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      total++;
      const values = parseCSVLine(lines[i], delimiter);
      const dateStr = parseDate(values[fechaIdx] || '');
      const d = new Date(dateStr);
      if (d.getMonth() + 1 === month && d.getFullYear() === year) {
        inMonth++;
      }
    }

    return { total, inMonth };
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    if (periodClosed) {
      toast({ 
        title: 'Período cerrado', 
        description: `El período de ${getMonthName(targetPeriod.month)} ${targetPeriod.year} ya fue cerrado.`, 
        variant: 'destructive' 
      });
      return;
    }

    setUploading(true);
    setUploadProgress(5);
    setUploadStatus('Leyendo archivo...');

    let cargaId: string | null = null;

    try {
      const csvContent = await file.text();
      setUploadProgress(10);
      setUploadStatus('Validando contenido...');

      // Quick validation: count rows
      const rowCount = countRowsInMonth(csvContent, targetPeriod.month, targetPeriod.year);
      
      if (rowCount.total === 0) throw new Error('El archivo CSV está vacío');
      if (rowCount.inMonth < rowCount.total / 2) {
        setUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
        toast({ 
          title: 'Fechas fuera de rango', 
          description: `Menos del 50% de los registros corresponden a ${getMonthName(targetPeriod.month)} ${targetPeriod.year}.`,
          variant: 'destructive' 
        });
        return;
      }

      setUploadProgress(15);
      setUploadStatus('Verificando cargas anteriores...');

      // Check previous record count for THIS specific target period (month/year)
      const monthStart = `${targetPeriod.year}-${String(targetPeriod.month).padStart(2, '0')}-01`;
      const lastDay = new Date(targetPeriod.year, targetPeriod.month, 0).getDate();
      const monthEnd = `${targetPeriod.year}-${String(targetPeriod.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      let previousRecordCount = 0;
      try {
        // Query actual ventas count for the target month - not the last global upload
        // Use head:true with count to avoid fetching rows (bypasses 1000 row limit)
        const countQuery = dataService.from('ventas') as any;
        const { count: ventasCount } = await countQuery
          .select('id', { count: 'exact', head: true })
          .gte('fecha', monthStart)
          .lte('fecha', monthEnd);
        
        if (ventasCount && ventasCount > 0) {
          previousRecordCount = ventasCount;
        }
      } catch {
        // Ignore error
      }

      // Show warning if new file has fewer records than previous load
      if (previousRecordCount > 0 && rowCount.total < previousRecordCount) {
        setFewerRecordsInfo({ previous: previousRecordCount, current: rowCount.total });
        
        // Create upload record first
        const { data: cargaRecord, error: cargaError } = await (dataService
          .from('carga_archivos')
          .insert({ nombre_archivo: file.name, tipo: 'ventas', estado: 'procesando', cargado_por: user.id })
          .select()
          .single() as any);

        if (cargaError) throw cargaError;
        cargaId = cargaRecord.id;

        setPendingUploadData({ csvContent, cargaId });
        setShowFewerRecordsDialog(true);
        // Don't reset uploading - the dialog will handle it
        return;
      }

      setUploadProgress(20);
      setUploadStatus('Registrando carga...');

      await getOrCreatePeriod(targetPeriod.month, targetPeriod.year);

      const { data: cargaRecord, error: cargaError } = await (dataService
        .from('carga_archivos')
        .insert({ nombre_archivo: file.name, tipo: 'ventas', estado: 'procesando', cargado_por: user.id })
        .select()
        .single() as any);

      if (cargaError) throw cargaError;
      cargaId = cargaRecord.id;

      // Send to edge function for reliable processing
      await processUploadViaEdgeFunction(csvContent, cargaId);

    } catch (error) {
      console.error('Upload error:', error);
      if (cargaId) {
        await (dataService.from('carga_archivos')
          .update({ estado: 'error', mensaje_error: (error as Error).message })
          .eq('id', cargaId) as any);
      }
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
      refetch();
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  /** Process upload via edge function (uses service role for reliable delete) */
  const processUploadViaEdgeFunction = async (csvContent: string, cargaId: string) => {
    try {
      setUploadProgress(30);
      setUploadStatus('Enviando al servidor para procesamiento...');

      const { data: result, error } = await dataService.functions.invoke<{
        success: boolean;
        inserted: number;
        deleted: number;
        previous_count: number;
        total_in_db: number;
        invalid_rows: number;
        message: string;
        error?: string;
      }>('load-sales', {
        body: {
          csvContent,
          targetMonth: targetPeriod.month,
          targetYear: targetPeriod.year,
          cargaId,
          cargadoPor: user?.id,
        },
      });

      if (error || !result?.success) {
        const errorMsg = (result as any)?.error || error?.message || 'Error procesando archivo';
        throw new Error(errorMsg);
      }

      // Update carga record
      await (dataService.from('carga_archivos')
        .update({ estado: 'completado', registros_procesados: result.inserted })
        .eq('id', cargaId) as any);

      setUploadProgress(100);
      setUploadStatus('¡Completado!');

      toast({ 
        title: '¡Carga exitosa!', 
        description: `${result.inserted} registros insertados (${result.deleted} anteriores reemplazados)` 
      });
      
      setFile(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['sales-periods'] });

    } catch (error) {
      // Update carga record with error
      await (dataService.from('carga_archivos')
        .update({ estado: 'error', mensaje_error: (error as Error).message })
        .eq('id', cargaId) as any);
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  /** Handle confirmation to proceed with fewer records */
  const handleFewerRecordsConfirm = async () => {
    setShowFewerRecordsDialog(false);
    if (!pendingUploadData) return;

    try {
      setUploadProgress(25);
      setUploadStatus('Procesando carga confirmada...');
      await processUploadViaEdgeFunction(pendingUploadData.csvContent, pendingUploadData.cargaId);
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setPendingUploadData(null);
      setFewerRecordsInfo(null);
    }
  };

  /** Handle cancel of fewer records warning */
  const handleFewerRecordsCancel = async () => {
    setShowFewerRecordsDialog(false);
    setUploading(false);
    setUploadProgress(0);
    setUploadStatus('');

    // Mark the carga as cancelled
    if (pendingUploadData?.cargaId) {
      await (dataService.from('carga_archivos')
        .update({ estado: 'cancelado', mensaje_error: 'Cancelado por el usuario' })
        .eq('id', pendingUploadData.cargaId) as any);
      refetch();
    }

    setPendingUploadData(null);
    setFewerRecordsInfo(null);
    toast({ title: 'Carga cancelada', description: 'El archivo no fue procesado.' });
  };

  const handleCloseMonthConfirm = async () => {
    if (!pendingUploadData) return;

    try {
      await processUploadViaEdgeFunction(pendingUploadData.csvContent, pendingUploadData.cargaId);

      await closePeriod({
        month: targetPeriod.month,
        year: targetPeriod.year,
        totalRecords: 0,
        totalAmount: 0
      });

      toast({ 
        title: '¡Período cerrado!', 
        description: `${getMonthName(targetPeriod.month)} ${targetPeriod.year} ha sido cerrado con éxito.` 
      });

    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setShowCloseDialog(false);
      setPendingUploadData(null);
    }
  };

  const handleCloseMonthCancel = async () => {
    if (!pendingUploadData) return;

    try {
      await processUploadViaEdgeFunction(pendingUploadData.csvContent, pendingUploadData.cargaId);
      toast({ 
        title: '¡Carga exitosa!', 
        description: `Datos cargados. El período de ${getMonthName(targetPeriod.month)} sigue abierto.` 
      });
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setShowCloseDialog(false);
      setPendingUploadData(null);
    }
  };

  const removeFile = () => setFile(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <>
      {/* Fewer Records Warning Dialog */}
      <Dialog open={showFewerRecordsDialog} onOpenChange={setShowFewerRecordsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Alerta: Menor cantidad de registros
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Está subiendo una cantidad <strong>menor</strong> de registros que el cargue pasado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Carga anterior</p>
                <p className="text-2xl font-bold text-foreground">{fewerRecordsInfo?.previous?.toLocaleString('es-CO')}</p>
                <p className="text-xs text-muted-foreground">registros</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Archivo actual</p>
                <p className="text-2xl font-bold text-warning">{fewerRecordsInfo?.current?.toLocaleString('es-CO')}</p>
                <p className="text-xs text-muted-foreground">registros</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Diferencia: <strong>{((fewerRecordsInfo?.previous || 0) - (fewerRecordsInfo?.current || 0)).toLocaleString('es-CO')}</strong> registros menos. 
              ¿Desea continuar con la carga de todas formas?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleFewerRecordsCancel}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleFewerRecordsConfirm}>
              Continuar de todas formas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Month Close Dialog */}
      <MonthCloseDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        monthName={getMonthName(targetPeriod.month)}
        year={targetPeriod.year}
        onConfirm={handleCloseMonthConfirm}
        onCancel={handleCloseMonthCancel}
        isLoading={isClosingPeriod}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Historic Mode Selector - only for admin/coordinador */}
        {canUseHistoricMode && (
          <div className="lg:col-span-3">
            <Card className="border-dashed">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="historic-mode"
                      checked={historicMode}
                      onCheckedChange={setHistoricMode}
                    />
                    <Label htmlFor="historic-mode" className="flex items-center gap-2 cursor-pointer">
                      <History className="h-4 w-4" />
                      Modo Histórico
                    </Label>
                  </div>
                  {historicMode && (
                    <div className="flex items-center gap-2">
                      <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTH_NAMES.map((name, idx) => (
                            <SelectItem key={idx} value={String(idx + 1)}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_YEARS.map((y) => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Period Status Alert */}
        <div className="lg:col-span-3">
          {historicMode && canUseHistoricMode ? (
            <Alert className="border-warning bg-warning/10">
              <History className="h-4 w-4 text-warning" />
              <AlertTitle className="text-warning">Modo Histórico</AlertTitle>
              <AlertDescription>
                Cargando datos para <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong>. 
                Los datos existentes de este período serán reemplazados.
              </AlertDescription>
            </Alert>
          ) : periodClosed ? (
            <Alert variant="destructive">
              <Lock className="h-4 w-4" />
              <AlertTitle>Período Cerrado</AlertTitle>
              <AlertDescription>
                El período de {getMonthName(targetPeriod.month)} {targetPeriod.year} ya fue cerrado y no acepta más cargas de ventas.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CalendarCheck className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                Período Activo: {getMonthName(targetPeriod.month)} {targetPeriod.year}
                <Badge variant="secondary">{targetPeriod.isClosingDay ? 'Día de cierre' : 'Abierto'}</Badge>
              </AlertTitle>
              <AlertDescription>
                {targetPeriod.isClosingDay 
                  ? `Hoy es el día de cierre. Al cargar un archivo, se te preguntará si es el resultado final de ${getMonthName(targetPeriod.month)}.`
                  : `Los archivos cargados se asignarán automáticamente a ${getMonthName(targetPeriod.month)} ${targetPeriod.year}.`
                }
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Card className="card-elevated lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-secondary" />
              Subir Archivo de Ventas
            </CardTitle>
            <CardDescription>
              Formato: INFO_VENTAS.csv (máx 20MB) - Detecta delimitador automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
          <div
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
              dragActive && 'border-primary bg-primary/5',
              file && 'border-success bg-success/5',
              !dragActive && !file && 'border-border hover:border-primary/50'
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !file && document.getElementById('file-upload-ventas')?.click()}
          >
            {file ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="h-12 w-12 text-success" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeFile(); }} disabled={uploading}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {uploading ? (
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p className="text-sm text-muted-foreground">{uploadStatus} ({uploadProgress}%)</p>
                  </div>
                ) : (
                  <Button onClick={(e) => { e.stopPropagation(); handleUpload(); }} className="btn-brand">
                    <Upload className="mr-2 h-4 w-4" />
                    Iniciar Carga
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                  <Upload className="h-8 w-8 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">Arrastra y suelta tu archivo aquí</p>
                  <p className="text-sm text-muted-foreground mt-1">o haz clic para seleccionar</p>
                </div>
                <input type="file" accept=".csv" onChange={handleFileInput} className="hidden" id="file-upload-ventas" />
                <Button asChild variant="outline" onClick={(e) => e.stopPropagation()}>
                  <label htmlFor="file-upload-ventas" className="cursor-pointer">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Seleccionar archivo CSV
                  </label>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-secondary" />
            Historial de Cargas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {uploadHistory?.length ? uploadHistory.map((item) => (
              <div key={item.id} className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2">
                  {item.estado === 'completado' ? <CheckCircle className="h-4 w-4 text-success" /> :
                   item.estado === 'error' ? <AlertCircle className="h-4 w-4 text-danger" /> :
                   item.estado === 'cancelado' ? <AlertCircle className="h-4 w-4 text-muted-foreground" /> :
                   <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.nombre_archivo}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                </div>
                <div className="mt-2 text-xs">
                  {item.estado === 'completado' && <span className="text-success font-medium">{item.registros_procesados} registros</span>}
                  {item.estado === 'error' && <span className="text-danger font-medium">{item.mensaje_error}</span>}
                  {item.estado === 'cancelado' && <span className="text-muted-foreground font-medium">Cancelado</span>}
                  {item.estado === 'procesando' && <span className="text-primary">Procesando...</span>}
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No hay cargas registradas</p>}
          </div>
        </CardContent>
        </Card>
      </div>
    </>
  );
}
