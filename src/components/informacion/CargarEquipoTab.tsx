import { useState, useCallback } from 'react';
import { Upload, Users, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TeamMember {
  sede: string;
  regional: string;
  cc_asesor: string;
  codigo_asesor: string;
  nombre_asesor: string;
  movil_asesor: string;
  tipo_asesor: string;
  codigo_jefe: string;
  cc_jefe: string;
  jefe_ventas: string;
  movil_jefe: string;
  correo_jefe: string;
  cedula_lider: string;
  lider_zona: string;
  movil_lider: string;
  correo_lider: string;
  zona: string;
  cedula_coordinador: string;
  coordinador: string;
  movil_coordinador: string;
  correo_coordinador: string;
}

interface ImportStats {
  jefes_created: number;
  lideres_created: number;
  coordinadores_created: number;
  profiles_updated: number;
  errors: string[];
}

export default function CargarEquipoTab() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<TeamMember[]>([]);
  const [result, setResult] = useState<{ success: boolean; stats?: ImportStats; message?: string; error?: string } | null>(null);
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

  const parseCSV = (text: string): TeamMember[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Detect delimiter
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    
    const headerMap: Record<string, keyof TeamMember> = {
      'sede': 'sede',
      'regional': 'regional',
      'cc_asesor': 'cc_asesor',
      'codigo_asesor': 'codigo_asesor',
      'nombre_asesor': 'nombre_asesor',
      'movil_asesor': 'movil_asesor',
      'tipo_asesor': 'tipo_asesor',
      'codigo_jefe': 'codigo_jefe',
      'cc_jefe_vts': 'cc_jefe',
      'jefe_ventas': 'jefe_ventas',
      'movil_jefe': 'movil_jefe',
      'correo_jefe': 'correo_jefe',
      'cedula_lider': 'cedula_lider',
      'lider_zona': 'lider_zona',
      'movil_lider': 'movil_lider',
      'correo_lider': 'correo_lider',
      'zona': 'zona',
      'cedula_coordinador': 'cedula_coordinador',
      'coordinador': 'coordinador',
      'movil_coordinador': 'movil_coordinador',
      'correo_coordinador': 'correo_coordinador',
    };

    const data: TeamMember[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      
      headers.forEach((header, idx) => {
        const mappedKey = headerMap[header];
        if (mappedKey && values[idx] !== undefined) {
          row[mappedKey] = values[idx];
        }
      });

      if (row.codigo_asesor || row.cedula_lider || row.cedula_coordinador) {
        data.push(row as unknown as TeamMember);
      }
    }

    return data;
  };

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) {
      toast({
        title: 'Archivo inválido',
        description: 'Solo se permiten archivos CSV',
        variant: 'destructive',
      });
      return;
    }

    setFile(f);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setPreview(parsed.slice(0, 5));
    };
    reader.readAsText(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const text = await file.text();
      const data = parseCSV(text);

      if (data.length === 0) {
        throw new Error('No se encontraron datos válidos en el archivo');
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('No hay sesión activa');
      }

      const response = await supabase.functions.invoke('bulk-import-users', {
        body: { data },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setResult(response.data);
      
      toast({
        title: response.data.success ? 'Importación exitosa' : 'Error en importación',
        description: response.data.message || response.data.error,
        variant: response.data.success ? 'default' : 'destructive',
      });

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setResult({ success: false, error: msg });
      toast({
        title: 'Error',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Importar Equipo Comercial
          </CardTitle>
          <CardDescription>
            Carga el archivo CSV con la estructura del equipo (asesores, jefes, líderes, coordinadores)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
              file && "border-primary bg-primary/5"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('team-file-input')?.click()}
          >
            <input
              id="team-file-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileInput}
            />

            {file ? (
              <div className="flex items-center justify-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {preview.length > 0 ? `${preview.length}+ registros detectados` : 'Procesando...'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); removeFile(); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-1">Arrastra el archivo CSV aquí</p>
                <p className="text-sm text-muted-foreground">o haz clic para seleccionar</p>
              </>
            )}
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium mb-2">Vista previa (primeros 5 registros):</h4>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-1">Regional</th>
                      <th className="text-left p-1">Asesor</th>
                      <th className="text-left p-1">Código</th>
                      <th className="text-left p-1">Jefe</th>
                      <th className="text-left p-1">Líder</th>
                      <th className="text-left p-1">Zona</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-1">{row.regional}</td>
                        <td className="p-1">{row.nombre_asesor}</td>
                        <td className="p-1">{row.codigo_asesor}</td>
                        <td className="p-1">{row.jefe_ventas || 'N/A'}</td>
                        <td className="p-1">{row.lider_zona}</td>
                        <td className="p-1">{row.zona}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>
                {result.success ? (
                  <div>
                    <p className="font-medium">{result.message}</p>
                    {result.stats && result.stats.errors.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm">Ver errores ({result.stats.errors.length})</summary>
                        <ul className="mt-1 text-xs list-disc pl-4">
                          {result.stats.errors.slice(0, 10).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                ) : (
                  result.error
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Upload button */}
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar Equipo
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
