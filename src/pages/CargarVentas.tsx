import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UploadHistory {
  id: string;
  filename: string;
  date: string;
  records: number;
  status: 'success' | 'error' | 'processing';
  user: string;
}

const mockHistory: UploadHistory[] = [
  { id: '1', filename: 'INFO_VENTAS_2026-01-18.csv', date: '2026-01-18 14:30', records: 245, status: 'success', user: 'Carlos Coordinador' },
  { id: '2', filename: 'INFO_VENTAS_2026-01-17.csv', date: '2026-01-17 09:15', records: 198, status: 'success', user: 'Carlos Coordinador' },
  { id: '3', filename: 'INFO_VENTAS_2026-01-15.csv', date: '2026-01-15 16:45', records: 0, status: 'error', user: 'Ana Líder' },
];

export default function CargarVentas() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

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

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: 'Archivo muy grande',
        description: 'El archivo no puede superar 10MB',
        variant: 'destructive',
      });
      return;
    }

    setFile(file);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2500));

    clearInterval(interval);
    setUploadProgress(100);

    toast({
      title: '¡Archivo cargado exitosamente!',
      description: `Se procesaron 245 registros de ${file.name}`,
    });

    setFile(null);
    setUploading(false);
    setUploadProgress(0);
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Cargar Ventas</h1>
        <p className="text-muted-foreground mt-1">
          Sube el archivo CSV con la información de ventas diarias
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Zone */}
        <Card className="card-elevated lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-secondary" />
              Subir Archivo
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
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  {uploading ? (
                    <div className="space-y-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
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
                    id="file-upload"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Seleccionar archivo CSV
                    </label>
                  </Button>
                </div>
              )}
            </div>

            {/* Expected Format */}
            <div className="p-4 rounded-lg bg-muted">
              <h4 className="text-sm font-medium mb-2">Estructura esperada del CSV:</h4>
              <code className="text-xs text-muted-foreground block overflow-x-auto">
                fecha, codigo_asesor, valor_venta, producto, forma_pago, zona, tipo_cliente
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
              {mockHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {item.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                      ) : item.status === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-danger flex-shrink-0" />
                      ) : (
                        <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.filename}</p>
                        <p className="text-xs text-muted-foreground">{item.date}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.user}</span>
                    {item.status === 'success' && (
                      <span className="text-success font-medium">{item.records} registros</span>
                    )}
                    {item.status === 'error' && (
                      <span className="text-danger font-medium">Error de formato</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
