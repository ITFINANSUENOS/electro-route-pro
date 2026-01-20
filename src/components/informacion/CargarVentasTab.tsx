import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

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
  // Tipo documento
  'tipo': 'tipo_docum',
  // Región
  'cod_region': 'cod_region',
  'codregion': 'cod_region',
  // Sede
  'sede': 'sede',
  // Centro de costo
  'codigo_cco': 'codigo_cco',
  'cod_cco': 'codigo_cco',
  // Nombre centro costo
  'nombre_cco': 'nombre_cco',
  // Cliente
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
  // Documento
  'tipo_docum': 'tipo_documento',
  'numero_doc': 'numero_doc',
  'nro_doc': 'numero_doc',
  'fecha_fact': 'fecha',
  'fecha': 'fecha',
  // Destino
  'destino': 'destino',
  'dnonombre': 'destino_nombre',
  // Forma pago
  'cod_forma_': 'cod_forma_pago',
  'forma1pago': 'forma1_pago',
  'formapago': 'forma_pago',
  // Regional/Zona
  'regional': 'regional',
  'zona': 'zona',
  // Asesor
  'cedula_ase': 'cedula_asesor',
  'cedula': 'cedula_asesor',
  'codigo_ase': 'codigo_asesor',
  'cod_asesor': 'codigo_asesor',
  'asesor': 'asesor_nombre',
  'nombre_asesor': 'asesor_nombre',
  // Jefe
  'codigo_jef': 'codigo_jefe',
  'cod_jefe': 'codigo_jefe',
  'jefe_venta': 'jefe_ventas',
  'jefe': 'jefe_ventas',
  // Producto
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
  // Valores numéricos
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
  // Otros
  'motivodev': 'motivo_dev',
  'ccostopadr': 'ccosto_asesor',
  'tipo_venta': 'tipo_venta',
};

const NUMERIC_FIELDS = ['cantidad', 'subtotal', 'iva', 'total', 'vtas_ant_i', 'cod_region'];

export default function CargarVentasTab() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: uploadHistory, refetch } = useQuery({
    queryKey: ['upload-history-ventas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carga_archivos')
        .select('*')
        .eq('tipo', 'ventas')
        .order('created_at', { ascending: false })
        .limit(10);
      
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

  const detectDelimiter = (line: string): string => {
    const semicolons = (line.match(/;/g) || []).length;
    const commas = (line.match(/,/g) || []).length;
    return semicolons > commas ? ';' : ',';
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

  const parseNumber = (value: string): number => {
    if (!value?.trim()) return 0;
    const cleaned = value.replace(/\./g, '').replace(',', '.').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const parseDate = (value: string): string => {
    if (!value?.trim()) return new Date().toISOString().split('T')[0];
    const clean = value.trim();
    
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    
    // DD/MM/YYYY or DD-MM-YYYY
    const parts = clean.split(/[\/\-]/);
    if (parts.length === 3) {
      const [first, second, third] = parts;
      if (first.length === 4) return `${first}-${second.padStart(2, '0')}-${third.padStart(2, '0')}`;
      return `${third.length === 2 ? '20' + third : third}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
    }
    return new Date().toISOString().split('T')[0];
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    setUploadProgress(5);
    setUploadStatus('Leyendo archivo...');

    let cargaId: string | null = null;

    try {
      const text = await file.text();
      setUploadProgress(10);

      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) throw new Error('El archivo CSV está vacío');

      const delimiter = detectDelimiter(lines[0]);
      const headers = parseCSVLine(lines[0], delimiter);
      
      // Build column mapping
      const columnMapping: Record<number, string> = {};
      headers.forEach((h, i) => {
        const normalized = normalizeHeader(h);
        const dbField = HEADER_MAP[normalized];
        if (dbField) columnMapping[i] = dbField;
      });

      console.log('Mapped columns:', Object.keys(columnMapping).length, 'of', headers.length);

      setUploadProgress(15);
      setUploadStatus('Registrando carga...');

      // Create upload record
      const { data: cargaRecord, error: cargaError } = await supabase
        .from('carga_archivos')
        .insert({ nombre_archivo: file.name, tipo: 'ventas', estado: 'procesando', cargado_por: user.id })
        .select()
        .single();

      if (cargaError) throw cargaError;
      cargaId = cargaRecord.id;

      setUploadProgress(20);
      setUploadStatus('Procesando filas...');

      // Process all data rows at once
      const dataRows = lines.slice(1);
      const ventas: Record<string, unknown>[] = [];

      for (const line of dataRows) {
        if (!line.trim()) continue;
        const values = parseCSVLine(line, delimiter);
        if (values.length < 5) continue;

        const venta: Record<string, unknown> = { carga_id: cargaId, cargado_por: user.id };

        values.forEach((val, idx) => {
          const field = columnMapping[idx];
          if (field && val.trim()) {
            if (NUMERIC_FIELDS.includes(field)) {
              venta[field] = parseNumber(val);
            } else if (field === 'fecha') {
              venta[field] = parseDate(val);
            } else {
              venta[field] = val.trim();
            }
          }
        });

        // Required fields
        if (!venta.codigo_asesor) venta.codigo_asesor = (venta.cedula_asesor as string) || 'SIN_CODIGO';
        if (!venta.fecha) venta.fecha = new Date().toISOString().split('T')[0];
        if (venta.vtas_ant_i == null) venta.vtas_ant_i = 0;

        ventas.push(venta);
      }

      if (ventas.length === 0) throw new Error('No se encontraron registros válidos');

      setUploadProgress(40);
      setUploadStatus(`Insertando ${ventas.length} registros...`);

      // Insert in batches of 1000 for speed
      const batchSize = 1000;
      let inserted = 0;

      for (let i = 0; i < ventas.length; i += batchSize) {
        const batch = ventas.slice(i, i + batchSize);
        const { error } = await supabase.from('ventas').insert(batch as never[]);
        
        if (error) {
          console.error('Batch error:', error);
          throw new Error(`Error en lote ${Math.floor(i/batchSize) + 1}: ${error.message}`);
        }
        
        inserted += batch.length;
        setUploadProgress(40 + Math.round((inserted / ventas.length) * 55));
        setUploadStatus(`Insertados ${inserted} de ${ventas.length}...`);
      }

      // Mark complete
      await supabase.from('carga_archivos')
        .update({ estado: 'completado', registros_procesados: inserted })
        .eq('id', cargaId);

      setUploadProgress(100);
      setUploadStatus('¡Completado!');

      toast({ title: '¡Carga exitosa!', description: `${inserted} registros insertados` });
      setFile(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (error) {
      console.error('Upload error:', error);
      if (cargaId) {
        await supabase.from('carga_archivos')
          .update({ estado: 'error', mensaje_error: (error as Error).message })
          .eq('id', cargaId);
      }
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
      refetch();
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  const removeFile = () => setFile(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
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
                   <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.nombre_archivo}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                </div>
                <div className="mt-2 text-xs">
                  {item.estado === 'completado' && <span className="text-success font-medium">{item.registros_procesados} registros</span>}
                  {item.estado === 'error' && <span className="text-danger font-medium">{item.mensaje_error}</span>}
                  {item.estado === 'procesando' && <span className="text-primary">Procesando...</span>}
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No hay cargas registradas</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
