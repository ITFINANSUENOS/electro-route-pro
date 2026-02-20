import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { dataService } from '@/services';
import { useToast } from '@/hooks/use-toast';
import { Save, Calendar, Info, Clock, Camera, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface ProgramacionSettings {
  dias_bloqueo_minimo: number;
  dias_bloqueo_maximo: number;
  requiere_foto_evidencia: boolean;
  requiere_ubicacion_gps: boolean;
  hora_limite_evidencia: string;
  permitir_evidencia_fuera_horario: boolean;
  // New photo group settings
  fotos_grupales_correria_cantidad: number;
  foto_correria_inicio_desde: string;
  foto_correria_inicio_hasta: string;
  foto_correria_intermedio_desde: string;
  foto_correria_intermedio_hasta: string;
  foto_correria_cierre_desde: string;
  foto_correria_cierre_hasta: string;
  foto_punto_margen_minutos: number;
  fotos_apertura_cierre_punto: boolean;
  consultas_hora_inicio: string;
  consultas_hora_fin: string;
}

export default function ProgramacionConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ProgramacionSettings>({
    dias_bloqueo_minimo: 0,
    dias_bloqueo_maximo: 19,
    requiere_foto_evidencia: true,
    requiere_ubicacion_gps: true,
    hora_limite_evidencia: '22:00',
    permitir_evidencia_fuera_horario: false,
    fotos_grupales_correria_cantidad: 3,
    foto_correria_inicio_desde: '05:00',
    foto_correria_inicio_hasta: '09:00',
    foto_correria_intermedio_desde: '05:00',
    foto_correria_intermedio_hasta: '19:00',
    foto_correria_cierre_desde: '16:00',
    foto_correria_cierre_hasta: '19:00',
    foto_punto_margen_minutos: 30,
    fotos_apertura_cierre_punto: true,
    consultas_hora_inicio: '12:00',
    consultas_hora_fin: '22:00',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await (dataService
        .from('permisos_roles')
        .select('*')
        .eq('categoria', 'programacion_config') as any);

      if (error) throw error;

      if (data && data.length > 0) {
        const getValue = (permiso: string, defaultVal: string) => {
          const found = data.find(d => d.permiso === permiso);
          return found ? found.rol : defaultVal;
        };

        setSettings({
          dias_bloqueo_minimo: parseInt(getValue('dias_bloqueo_minimo', '0')),
          dias_bloqueo_maximo: parseInt(getValue('dias_bloqueo_maximo', '19')),
          requiere_foto_evidencia: getValue('requiere_foto_evidencia', 'true') === 'true',
          requiere_ubicacion_gps: getValue('requiere_ubicacion_gps', 'true') === 'true',
          hora_limite_evidencia: getValue('hora_limite_evidencia', '22:00'),
          permitir_evidencia_fuera_horario: getValue('permitir_evidencia_fuera_horario', 'false') === 'true',
          fotos_grupales_correria_cantidad: parseInt(getValue('fotos_grupales_correria_cantidad', '3')),
          foto_correria_inicio_desde: getValue('foto_correria_inicio_desde', '05:00'),
          foto_correria_inicio_hasta: getValue('foto_correria_inicio_hasta', '09:00'),
          foto_correria_intermedio_desde: getValue('foto_correria_intermedio_desde', '05:00'),
          foto_correria_intermedio_hasta: getValue('foto_correria_intermedio_hasta', '19:00'),
          foto_correria_cierre_desde: getValue('foto_correria_cierre_desde', '16:00'),
          foto_correria_cierre_hasta: getValue('foto_correria_cierre_hasta', '19:00'),
          foto_punto_margen_minutos: parseInt(getValue('foto_punto_margen_minutos', '30')),
          fotos_apertura_cierre_punto: getValue('fotos_apertura_cierre_punto', 'true') === 'true',
          consultas_hora_inicio: getValue('consultas_hora_inicio', '12:00'),
          consultas_hora_fin: getValue('consultas_hora_fin', '22:00'),
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (settings.dias_bloqueo_minimo < 0) {
      toast({
        title: 'Error',
        description: 'El mínimo de días no puede ser negativo',
        variant: 'destructive',
      });
      return;
    }

    if (settings.dias_bloqueo_maximo <= settings.dias_bloqueo_minimo) {
      toast({
        title: 'Error',
        description: 'El máximo de días debe ser mayor que el mínimo',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const settingsToSave = [
        { permiso: 'dias_bloqueo_minimo', valor: settings.dias_bloqueo_minimo.toString() },
        { permiso: 'dias_bloqueo_maximo', valor: settings.dias_bloqueo_maximo.toString() },
        { permiso: 'requiere_foto_evidencia', valor: settings.requiere_foto_evidencia.toString() },
        { permiso: 'requiere_ubicacion_gps', valor: settings.requiere_ubicacion_gps.toString() },
        { permiso: 'hora_limite_evidencia', valor: settings.hora_limite_evidencia },
        { permiso: 'permitir_evidencia_fuera_horario', valor: settings.permitir_evidencia_fuera_horario.toString() },
        { permiso: 'fotos_grupales_correria_cantidad', valor: settings.fotos_grupales_correria_cantidad.toString() },
        { permiso: 'foto_correria_inicio_desde', valor: settings.foto_correria_inicio_desde },
        { permiso: 'foto_correria_inicio_hasta', valor: settings.foto_correria_inicio_hasta },
        { permiso: 'foto_correria_intermedio_desde', valor: settings.foto_correria_intermedio_desde },
        { permiso: 'foto_correria_intermedio_hasta', valor: settings.foto_correria_intermedio_hasta },
        { permiso: 'foto_correria_cierre_desde', valor: settings.foto_correria_cierre_desde },
        { permiso: 'foto_correria_cierre_hasta', valor: settings.foto_correria_cierre_hasta },
        { permiso: 'foto_punto_margen_minutos', valor: settings.foto_punto_margen_minutos.toString() },
        { permiso: 'fotos_apertura_cierre_punto', valor: settings.fotos_apertura_cierre_punto.toString() },
        { permiso: 'consultas_hora_inicio', valor: settings.consultas_hora_inicio },
        { permiso: 'consultas_hora_fin', valor: settings.consultas_hora_fin },
      ];

      for (const setting of settingsToSave) {
        const { data: existing } = await (dataService
          .from('permisos_roles')
          .select('id')
          .eq('categoria', 'programacion_config')
          .eq('permiso', setting.permiso)
          .maybeSingle() as any);

        if (existing) {
          await (dataService
            .from('permisos_roles')
            .update({ rol: setting.valor, updated_at: new Date().toISOString() })
            .eq('id', existing.id) as any);
        } else {
          await (dataService
            .from('permisos_roles')
            .insert({
              categoria: 'programacion_config',
              permiso: setting.permiso,
              rol: setting.valor,
              habilitado: true,
            }) as any);
        }
      }

      // Log the change
      await (dataService.from('historial_ediciones').insert({
        tabla: 'permisos_roles',
        registro_id: '00000000-0000-0000-0000-000000000000',
        campo_editado: 'programacion_config',
        valor_anterior: null,
        valor_nuevo: JSON.stringify(settings),
      }) as any);

      toast({
        title: 'Configuración guardada',
        description: 'Los parámetros de programación han sido actualizados',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Restricciones de Fechas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Restricciones de Fechas
          </CardTitle>
          <CardDescription>
            Configure las reglas de bloqueo para la creación y edición de programaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Estas configuraciones afectan qué fechas pueden seleccionar los usuarios al crear o editar programaciones.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dias_minimo">Días mínimos de anticipación</Label>
              <Input
                id="dias_minimo"
                type="number"
                min={0}
                max={30}
                value={settings.dias_bloqueo_minimo}
                onChange={(e) =>
                  setSettings({ ...settings, dias_bloqueo_minimo: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-sm text-muted-foreground">
                {settings.dias_bloqueo_minimo === 0 ? (
                  <>
                    <span className="font-semibold text-success">Sin restricción mínima:</span> Se pueden programar actividades desde hoy mismo.
                  </>
                ) : (
                  <>
                    Los usuarios no pueden programar actividades con menos de {settings.dias_bloqueo_minimo} días de anticipación.
                    <br />
                    <span className="font-medium">Ejemplo:</span> Si hoy es el día 1, no puede programar hasta el día {settings.dias_bloqueo_minimo + 1}.
                  </>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias_maximo">Días máximos de anticipación</Label>
              <Input
                id="dias_maximo"
                type="number"
                min={1}
                max={60}
                value={settings.dias_bloqueo_maximo}
                onChange={(e) =>
                  setSettings({ ...settings, dias_bloqueo_maximo: parseInt(e.target.value) || 19 })
                }
              />
              <p className="text-sm text-muted-foreground">
                Los usuarios no pueden programar actividades con más de {settings.dias_bloqueo_maximo} días de anticipación.
                <br />
                <span className="font-medium">Ejemplo:</span> Si hoy es el día 1, el día {settings.dias_bloqueo_maximo + 1} en adelante estará bloqueado.
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Resumen de la configuración actual:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              {settings.dias_bloqueo_minimo === 0 ? (
                <li>• Se pueden programar actividades <span className="font-semibold text-success">desde hoy mismo</span></li>
              ) : (
                <li>• Los primeros <span className="font-semibold text-foreground">{settings.dias_bloqueo_minimo} días</span> desde hoy estarán bloqueados</li>
              )}
              <li>• Se pueden programar actividades hasta el día <span className="font-semibold text-foreground">{settings.dias_bloqueo_maximo}</span></li>
              <li>• A partir del día <span className="font-semibold text-foreground">{settings.dias_bloqueo_maximo + 1}</span> en adelante estará bloqueado</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Requisitos de Evidencia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Requisitos de Evidencia
          </CardTitle>
          <CardDescription>
            Configure los requisitos de evidencia para el registro de actividades
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Foto de evidencia obligatoria</Label>
                <p className="text-sm text-muted-foreground">
                  Los asesores deben subir una foto para registrar su actividad
                </p>
              </div>
              <Switch
                checked={settings.requiere_foto_evidencia}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, requiere_foto_evidencia: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Ubicación GPS obligatoria
                </Label>
                <p className="text-sm text-muted-foreground">
                  Los asesores deben registrar su ubicación GPS al subir evidencia
                </p>
              </div>
              <Switch
                checked={settings.requiere_ubicacion_gps}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, requiere_ubicacion_gps: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Permitir evidencia fuera de horario</Label>
                <p className="text-sm text-muted-foreground">
                  Permite subir evidencia fuera del horario de la actividad programada
                </p>
              </div>
              <Switch
                checked={settings.permitir_evidencia_fuera_horario}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, permitir_evidencia_fuera_horario: checked })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hora_limite" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Hora límite para subir evidencia
            </Label>
            <Input
              id="hora_limite"
              type="time"
              value={settings.hora_limite_evidencia}
              onChange={(e) =>
                setSettings({ ...settings, hora_limite_evidencia: e.target.value })
              }
              className="w-40"
            />
            <p className="text-sm text-muted-foreground">
              Después de esta hora no se podrá subir evidencia del día
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Fotos Grupales - Correría */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Fotos Grupales - Correría
          </CardTitle>
          <CardDescription>
            Ventanas de tiempo para las fotos grupales obligatorias en correrías
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Cantidad de fotos obligatorias</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={settings.fotos_grupales_correria_cantidad}
              onChange={(e) => setSettings({ ...settings, fotos_grupales_correria_cantidad: parseInt(e.target.value) || 3 })}
              className="w-24"
            />
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Foto Inicio - Desde</Label>
              <Input type="time" value={settings.foto_correria_inicio_desde}
                onChange={(e) => setSettings({ ...settings, foto_correria_inicio_desde: e.target.value })} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>Foto Inicio - Hasta</Label>
              <Input type="time" value={settings.foto_correria_inicio_hasta}
                onChange={(e) => setSettings({ ...settings, foto_correria_inicio_hasta: e.target.value })} className="w-40" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Foto Instalación - Desde</Label>
              <Input type="time" value={settings.foto_correria_intermedio_desde}
                onChange={(e) => setSettings({ ...settings, foto_correria_intermedio_desde: e.target.value })} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>Foto Instalación - Hasta</Label>
              <Input type="time" value={settings.foto_correria_intermedio_hasta}
                onChange={(e) => setSettings({ ...settings, foto_correria_intermedio_hasta: e.target.value })} className="w-40" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Foto Cierre - Desde</Label>
              <Input type="time" value={settings.foto_correria_cierre_desde}
                onChange={(e) => setSettings({ ...settings, foto_correria_cierre_desde: e.target.value })} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>Foto Cierre - Hasta</Label>
              <Input type="time" value={settings.foto_correria_cierre_hasta}
                onChange={(e) => setSettings({ ...settings, foto_correria_cierre_hasta: e.target.value })} className="w-40" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fotos Punto Fijo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Fotos Punto Fijo
          </CardTitle>
          <CardDescription>
            Configuración de fotos de apertura y cierre para puntos fijos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Requerir fotos de apertura y cierre</Label>
              <p className="text-sm text-muted-foreground">
                Los asesores deben tomar foto desde adentro al abrir y cerrar
              </p>
            </div>
            <Switch
              checked={settings.fotos_apertura_cierre_punto}
              onCheckedChange={(checked) => setSettings({ ...settings, fotos_apertura_cierre_punto: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>Margen de tiempo (minutos)</Label>
            <Input
              type="number"
              min={10}
              max={120}
              value={settings.foto_punto_margen_minutos}
              onChange={(e) => setSettings({ ...settings, foto_punto_margen_minutos: parseInt(e.target.value) || 30 })}
              className="w-24"
            />
            <p className="text-sm text-muted-foreground">
              Margen antes y después de la hora programada para subir la foto
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Horario de Consultas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horario de Consultas y Solicitudes
          </CardTitle>
          <CardDescription>
            Ventana de tiempo para que los asesores registren consultas y solicitudes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Hora de inicio</Label>
              <Input type="time" value={settings.consultas_hora_inicio}
                onChange={(e) => setSettings({ ...settings, consultas_hora_inicio: e.target.value })} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>Hora de fin</Label>
              <Input type="time" value={settings.consultas_hora_fin}
                onChange={(e) => setSettings({ ...settings, consultas_hora_fin: e.target.value })} className="w-40" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar todos los cambios'}
        </Button>
      </div>
    </div>
  );
}
