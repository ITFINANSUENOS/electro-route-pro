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

// Mapeo de nombres de columna CSV a campos de la tabla ventas (case insensitive)
const HEADER_MAP: Record<string, string> = {
  'tipo': 'tipo_docum',
  'tipo_docum': 'tipo_docum',
  'numero_doc': 'numero_doc',
  'nro_doc': 'numero_doc',
  'sede': 'sede',
  'cod_cco': 'codigo_cco',
  'codigo_cco': 'codigo_cco',
  'nombre_cco': 'nombre_cco',
  'cli_identificacion': 'cliente_identificacion',
  'cliente_identificacion': 'cliente_identificacion',
  'identificacion': 'cliente_identificacion',
  'cli_nombre': 'cliente_nombre',
  'cliente_nombre': 'cliente_nombre',
  'nombre_cliente': 'cliente_nombre',
  'cli_telefono': 'cliente_telefono',
  'cliente_telefono': 'cliente_telefono',
  'telefono': 'cliente_telefono',
  'cli_direccion': 'cliente_direccion',
  'cliente_direccion': 'cliente_direccion',
  'direccion': 'cliente_direccion',
  'cli_email': 'cliente_email',
  'cliente_email': 'cliente_email',
  'email': 'cliente_email',
  'destino': 'destino',
  'destino_nombre': 'destino_nombre',
  'cod_forma_pago': 'cod_forma_pago',
  'forma1_pago': 'forma1_pago',
  'forma_pago': 'forma_pago',
  'tipo_venta': 'tipo_venta',
  'cod_region': 'cod_region',
  'regional': 'regional',
  'zona': 'zona',
  'cedula_asesor': 'cedula_asesor',
  'cedula': 'cedula_asesor',
  'codigo_asesor': 'codigo_asesor',
  'cod_asesor': 'codigo_asesor',
  'asesor_nombre': 'asesor_nombre',
  'nombre_asesor': 'asesor_nombre',
  'asesor': 'asesor_nombre',
  'codigo_jefe': 'codigo_jefe',
  'cod_jefe': 'codigo_jefe',
  'jefe_ventas': 'jefe_ventas',
  'jefe': 'jefe_ventas',
  'codigo_ean': 'codigo_ean',
  'ean': 'codigo_ean',
  'producto': 'producto',
  'referencia': 'referencia',
  'nombre_corto': 'nombre_corto',
  'categoria': 'categoria',
  'cod_marca': 'cod_marca',
  'marca': 'marca',
  'cod_linea': 'cod_linea',
  'linea': 'linea',
  'lote': 'lote',
  'serial': 'serial',
  'mcn_clase': 'mcn_clase',
  'mcnclase': 'mcn_clase',
  'cantidad': 'cantidad',
  'subtotal': 'subtotal',
  'iva': 'iva',
  'total': 'total',
  'vtas_ant_i': 'vtas_ant_i',
  'vtasanti': 'vtas_ant_i',
  'fecha': 'fecha',
  'motivo_dev': 'motivo_dev',
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

  // Fetch upload history from carga_archivos table
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
    if (files?.[0]) {
      validateAndSetFile(files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: 'Formato no válido',
        description: 'Solo se aceptan archivos con formato .CSV',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'El archivo no puede superar 20MB',
        variant: 'destructive',
      });
      return;
    }

    setFile(file);
  };

  // Detect delimiter (comma or semicolon)
  const detectDelimiter = (firstLine: string): string => {
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    return semicolonCount > commaCount ? ';' : ',';
  };

  // Parse a single CSV line handling quoted fields
  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
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

  // Normalize header name for mapping
  const normalizeHeader = (header: string): string => {
    return header
      .toLowerCase()
      .trim()
      .replace(/[\s\-\.]/g, '_')
      .replace(/[áàä]/g, 'a')
      .replace(/[éèë]/g, 'e')
      .replace(/[íìï]/g, 'i')
      .replace(/[óòö]/g, 'o')
      .replace(/[úùü]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const parseNumber = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    // Remove thousands separators (dots) and handle decimal comma
    const cleaned = value.replace(/\./g, '').replace(',', '.').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const parseDate = (value: string): string => {
    if (!value || value.trim() === '') return new Date().toISOString().split('T')[0];
    
    const cleanValue = value.trim();
    
    // Try YYYY-MM-DD format first
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanValue)) {
      return cleanValue;
    }
    
    // Try DD/MM/YYYY or DD-MM-YYYY
    const parts = cleanValue.split(/[\/\-]/);
    if (parts.length === 3) {
      const [first, second, third] = parts;
      
      // If first part is 4 digits, assume YYYY-MM-DD
      if (first.length === 4) {
        return `${first}-${second.padStart(2, '0')}-${third.padStart(2, '0')}`;
      }
      
      // Otherwise assume DD/MM/YYYY
      const day = first.padStart(2, '0');
      const month = second.padStart(2, '0');
      const year = third.length === 2 ? `20${third}` : third;
      return `${year}-${month}-${day}`;
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
      // Read file content
      const text = await file.text();
      setUploadProgress(10);
      setUploadStatus('Analizando estructura...');

      // Split into lines and filter empty
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
        throw new Error('El archivo CSV está vacío o no tiene datos');
      }

      // Detect delimiter
      const delimiter = detectDelimiter(lines[0]);
      console.log('Detected delimiter:', delimiter);

      // Parse headers
      const headers = parseCSVLine(lines[0], delimiter);
      console.log('Headers found:', headers);

      // Create column mapping based on headers
      const columnMapping: Record<number, string> = {};
      headers.forEach((header, index) => {
        const normalized = normalizeHeader(header);
        const dbField = HEADER_MAP[normalized];
        if (dbField) {
          columnMapping[index] = dbField;
        }
      });

      console.log('Column mapping:', columnMapping);

      // Check if we have essential columns
      const mappedFields = Object.values(columnMapping);
      if (!mappedFields.includes('codigo_asesor') && !mappedFields.includes('cedula_asesor')) {
        console.warn('No codigo_asesor column found, will use fallback');
      }

      setUploadProgress(15);
      setUploadStatus('Creando registro de carga...');

      // Create upload record first
      const { data: cargaRecord, error: cargaError } = await supabase
        .from('carga_archivos')
        .insert({
          nombre_archivo: file.name,
          tipo: 'ventas',
          estado: 'procesando',
          cargado_por: user.id,
        })
        .select()
        .single();

      if (cargaError) throw cargaError;
      cargaId = cargaRecord.id;

      setUploadProgress(20);
      setUploadStatus('Procesando registros...');

      // Process data rows (skip header)
      const dataRows = lines.slice(1);
      const ventasToInsert: Record<string, unknown>[] = [];
      let skippedRows = 0;

      for (const line of dataRows) {
        if (!line.trim()) continue;
        
        const values = parseCSVLine(line, delimiter);
        
        // Skip if row has very few values
        if (values.length < 5) {
          skippedRows++;
          continue;
        }

        const venta: Record<string, unknown> = {
          carga_id: cargaId,
          cargado_por: user.id,
        };

        // Map values to fields
        values.forEach((value, index) => {
          const fieldName = columnMapping[index];
          if (fieldName && value.trim()) {
            if (NUMERIC_FIELDS.includes(fieldName)) {
              venta[fieldName] = parseNumber(value);
            } else if (fieldName === 'fecha') {
              venta[fieldName] = parseDate(value);
            } else {
              venta[fieldName] = value.trim();
            }
          }
        });

        // Ensure required fields have values
        if (!venta.codigo_asesor) {
          // Try to use cedula_asesor as fallback
          if (venta.cedula_asesor) {
            venta.codigo_asesor = venta.cedula_asesor;
          } else {
            venta.codigo_asesor = 'SIN_CODIGO';
          }
        }

        if (!venta.fecha) {
          venta.fecha = new Date().toISOString().split('T')[0];
        }

        if (venta.vtas_ant_i === undefined || venta.vtas_ant_i === null) {
          venta.vtas_ant_i = 0;
        }

        ventasToInsert.push(venta);
      }

      console.log(`Parsed ${ventasToInsert.length} valid rows, skipped ${skippedRows}`);

      if (ventasToInsert.length === 0) {
        throw new Error('No se encontraron registros válidos en el archivo');
      }

      setUploadProgress(30);
      setUploadStatus(`Insertando ${ventasToInsert.length} registros...`);

      // Insert in larger batches for speed (500 at a time)
      const batchSize = 500;
      let inserted = 0;
      let errors = 0;

      for (let i = 0; i < ventasToInsert.length; i += batchSize) {
        const batch = ventasToInsert.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('ventas')
          .insert(batch as never[]);

        if (insertError) {
          console.error('Batch insert error:', insertError);
          errors += batch.length;
          // Continue with next batch instead of failing completely
        } else {
          inserted += batch.length;
        }
        
        const progress = 30 + Math.round((i / ventasToInsert.length) * 60);
        setUploadProgress(progress);
        setUploadStatus(`Insertados ${inserted} de ${ventasToInsert.length}...`);
      }

      setUploadProgress(95);
      setUploadStatus('Finalizando...');

      // Update carga record as completed
      const finalState = errors === ventasToInsert.length ? 'error' : 'completado';
      await supabase
        .from('carga_archivos')
        .update({
          estado: finalState,
          registros_procesados: inserted,
          mensaje_error: errors > 0 ? `${errors} registros con error` : null,
        })
        .eq('id', cargaId);

      setUploadProgress(100);
      setUploadStatus('¡Completado!');

      if (inserted > 0) {
        toast({
          title: '¡Archivo cargado exitosamente!',
          description: `Se insertaron ${inserted} registros de ${file.name}${errors > 0 ? ` (${errors} con errores)` : ''}`,
        });
      } else {
        toast({
          title: 'Error en la carga',
          description: 'No se pudieron insertar registros',
          variant: 'destructive',
        });
      }

      setFile(null);
      refetch();
      // Invalidate dashboard queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (error) {
      console.error('Error processing CSV:', error);
      
      // Update carga record as failed if it was created
      if (cargaId) {
        await supabase
          .from('carga_archivos')
          .update({
            estado: 'error',
            mensaje_error: error instanceof Error ? error.message : 'Error desconocido',
          })
          .eq('id', cargaId);
      }

      toast({
        title: 'Error al procesar archivo',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
      refetch();
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Upload Zone */}
      <Card className="card-elevated lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-secondary" />
            Subir Archivo de Ventas
          </CardTitle>
          <CardDescription>
            Formato esperado: INFO_VENTAS.csv (máximo 20MB) - Detecta automáticamente delimitador (coma o punto y coma)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dropzone */}
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
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); removeFile(); }}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={uploading}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {uploading ? (
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {uploadStatus} ({uploadProgress}%)
                    </p>
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
                  <p className="text-lg font-medium text-foreground">
                    Arrastra y suelta tu archivo aquí
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    o haz clic para seleccionar
                  </p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-upload-ventas"
                />
                <Button asChild variant="outline" onClick={(e) => e.stopPropagation()}>
                  <label htmlFor="file-upload-ventas" className="cursor-pointer">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Seleccionar archivo CSV
                  </label>
                </Button>
              </div>
            )}
          </div>

          {/* Expected Format */}
          <div className="p-4 rounded-lg bg-muted">
            <h4 className="text-sm font-medium mb-2">Columnas reconocidas (orden flexible):</h4>
            <code className="text-xs text-muted-foreground block overflow-x-auto whitespace-pre-wrap">
              TIPO, NUMERO_DOC, SEDE, COD_CCO, CLI_NOMBRE, CLI_IDENTIFICACION, REGIONAL, ZONA, CODIGO_ASESOR, ASESOR_NOMBRE, CODIGO_JEFE, PRODUCTO, CANTIDAD, SUBTOTAL, IVA, TOTAL, VTAS_ANT_I, FECHA, FORMA_PAGO, TIPO_VENTA...
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Upload History */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-secondary" />
            Historial de Cargas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {uploadHistory && uploadHistory.length > 0 ? (
              uploadHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {item.estado === 'completado' ? (
                        <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                      ) : item.estado === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-danger flex-shrink-0" />
                      ) : (
                        <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.nombre_archivo}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    {item.estado === 'completado' && (
                      <span className="text-success font-medium">{item.registros_procesados} registros</span>
                    )}
                    {item.estado === 'error' && (
                      <span className="text-danger font-medium">{item.mensaje_error || 'Error de formato'}</span>
                    )}
                    {item.estado === 'procesando' && (
                      <span className="text-primary font-medium">Procesando...</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay cargas registradas
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
