import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface UploadHistory {
  id: string;
  nombre_archivo: string;
  created_at: string;
  registros_procesados: number | null;
  estado: string | null;
  mensaje_error: string | null;
}

// Mapeo de columnas del CSV a campos de la tabla ventas
const CSV_COLUMN_MAP: Record<number, string> = {
  0: 'tipo_docum',
  1: 'numero_doc',
  2: 'sede',
  3: 'codigo_cco',
  4: 'nombre_cco',
  5: 'cliente_identificacion',
  6: 'cliente_nombre',
  7: 'cliente_telefono',
  8: 'cliente_direccion',
  9: 'cliente_email',
  10: 'destino',
  11: 'destino_nombre',
  12: 'cod_forma_pago',
  13: 'forma1_pago',
  14: 'forma_pago',
  15: 'tipo_venta',
  16: 'cod_region',
  17: 'regional',
  18: 'zona',
  19: 'cedula_asesor',
  20: 'codigo_asesor',
  21: 'asesor_nombre',
  22: 'codigo_jefe',
  23: 'jefe_ventas',
  24: 'codigo_ean',
  25: 'producto',
  26: 'referencia',
  27: 'nombre_corto',
  28: 'categoria',
  29: 'cod_marca',
  30: 'marca',
  31: 'cod_linea',
  32: 'linea',
  33: 'lote',
  34: 'serial',
  35: 'mcn_clase',
  36: 'cantidad',
  37: 'subtotal',
  38: 'iva',
  39: 'total',
  40: 'vtas_ant_i',
  41: 'fecha',
  42: 'motivo_dev',
};

export default function CargarVentasTab() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

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
    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Formato no válido',
        description: 'Solo se aceptan archivos con formato .CSV',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'El archivo no puede superar 10MB',
        variant: 'destructive',
      });
      return;
    }

    setFile(file);
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n');
    return lines.map(line => {
      // Handle quoted fields with commas inside
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const parseNumber = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    // Remove thousands separators and handle decimal comma
    const cleaned = value.replace(/\./g, '').replace(',', '.').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const parseDate = (value: string): string => {
    if (!value || value.trim() === '') return new Date().toISOString().split('T')[0];
    
    // Try different date formats
    // DD/MM/YYYY or DD-MM-YYYY
    const parts = value.split(/[\/\-]/);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (day && month && year) {
        const fullYear = year.length === 2 ? `20${year}` : year;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    return new Date().toISOString().split('T')[0];
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      // Read file content
      const text = await file.text();
      setUploadProgress(20);

      // Parse CSV
      const rows = parseCSV(text);
      if (rows.length < 2) {
        throw new Error('El archivo CSV está vacío o no tiene datos');
      }

      // Skip header row
      const dataRows = rows.slice(1).filter(row => row.length > 5 && row.some(cell => cell.trim() !== ''));
      setUploadProgress(30);

      // Create upload record
      const { data: cargaRecord, error: cargaError } = await supabase
        .from('carga_archivos')
        .insert({
          nombre_archivo: file.name,
          tipo: 'ventas',
          estado: 'procesando',
          cargado_por: user?.id,
        })
        .select()
        .single();

      if (cargaError) throw cargaError;
      setUploadProgress(40);

      // Process rows and insert into ventas
      const ventasToInsert = dataRows.map(row => {
        const venta: Record<string, unknown> = {
          carga_id: cargaRecord.id,
          cargado_por: user?.id,
        };

        // Map columns to fields
        row.forEach((value, index) => {
          const fieldName = CSV_COLUMN_MAP[index];
          if (fieldName) {
            if (['cantidad', 'subtotal', 'iva', 'total', 'vtas_ant_i'].includes(fieldName)) {
              venta[fieldName] = parseNumber(value);
            } else if (fieldName === 'cod_region') {
              venta[fieldName] = parseInt(value) || null;
            } else if (fieldName === 'fecha') {
              venta[fieldName] = parseDate(value);
            } else {
              venta[fieldName] = value.trim() || null;
            }
          }
        });

        // Ensure required fields
        if (!venta.codigo_asesor) venta.codigo_asesor = 'SIN_CODIGO';
        if (!venta.fecha) venta.fecha = new Date().toISOString().split('T')[0];
        if (venta.vtas_ant_i === undefined) venta.vtas_ant_i = 0;

        return venta;
      });

      setUploadProgress(60);

      // Insert in batches of 100
      const batchSize = 100;
      let inserted = 0;
      
      for (let i = 0; i < ventasToInsert.length; i += batchSize) {
        const batch = ventasToInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('ventas')
          .insert(batch as never[]);

        if (insertError) {
          console.error('Error inserting batch:', insertError);
          throw insertError;
        }
        
        inserted += batch.length;
        setUploadProgress(60 + Math.round((inserted / ventasToInsert.length) * 30));
      }

      // Update carga record as completed
      await supabase
        .from('carga_archivos')
        .update({
          estado: 'completado',
          registros_procesados: inserted,
        })
        .eq('id', cargaRecord.id);

      setUploadProgress(100);

      toast({
        title: '¡Archivo cargado exitosamente!',
        description: `Se procesaron ${inserted} registros de ${file.name}`,
      });

      setFile(null);
      refetch();
    } catch (error) {
      console.error('Error processing CSV:', error);
      toast({
        title: 'Error al procesar archivo',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
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
            Formato esperado: INFO_VENTAS.csv (máximo 10MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dropzone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center transition-all',
              dragActive && 'border-primary bg-primary/5',
              file && 'border-success bg-success/5',
              !dragActive && !file && 'border-border hover:border-primary/50'
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
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
                    onClick={removeFile}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={uploading}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {uploading ? (
                  <div className="space-y-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Procesando... {uploadProgress}%
                    </p>
                  </div>
                ) : (
                  <Button onClick={handleUpload} className="btn-brand">
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
                <Button asChild variant="outline">
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
            <h4 className="text-sm font-medium mb-2">Columnas del CSV (en orden):</h4>
            <code className="text-xs text-muted-foreground block overflow-x-auto whitespace-pre-wrap">
              TIPO_DOCUM, NUMERO_DOC, SEDE, COD_CCO, NOMBRE_CCO, CLI_IDENTIFICACION, CLI_NOMBRE, CLI_TELEFONO, CLI_DIRECCION, CLI_EMAIL, DESTINO, DESTINO_NOMBRE, COD_FORMA_PAGO, FORMA1_PAGO, FORMA_PAGO, TIPO_VENTA, COD_REGION, REGIONAL, ZONA, CEDULA_ASESOR, CODIGO_ASESOR, ASESOR_NOMBRE, CODIGO_JEFE, JEFE_VENTAS, CODIGO_EAN, PRODUCTO, REFERENCIA, NOMBRE_CORTO, CATEGORIA, COD_MARCA, MARCA, COD_LINEA, LINEA, LOTE, SERIAL, MCN_CLASE, CANTIDAD, SUBTOTAL, IVA, TOTAL, VTAS_ANT_I, FECHA, MOTIVO_DEV
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
