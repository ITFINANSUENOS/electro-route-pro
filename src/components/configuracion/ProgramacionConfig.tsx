import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Calendar, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProgramacionSettings {
  dias_bloqueo_minimo: number;
  dias_bloqueo_maximo: number;
}

export function ProgramacionConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ProgramacionSettings>({
    dias_bloqueo_minimo: 4,
    dias_bloqueo_maximo: 19,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Try to get existing settings from permisos_roles table using a special category
      const { data, error } = await supabase
        .from('permisos_roles')
        .select('*')
        .eq('categoria', 'programacion_config');

      if (error) throw error;

      if (data && data.length > 0) {
        const minDays = data.find(d => d.permiso === 'dias_bloqueo_minimo');
        const maxDays = data.find(d => d.permiso === 'dias_bloqueo_maximo');

        setSettings({
          dias_bloqueo_minimo: minDays ? parseInt(minDays.rol) : 4,
          dias_bloqueo_maximo: maxDays ? parseInt(maxDays.rol) : 19,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (settings.dias_bloqueo_minimo < 1) {
      toast({
        title: 'Error',
        description: 'El mínimo de días debe ser al menos 1',
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
      // Upsert the settings
      const settingsToSave = [
        {
          categoria: 'programacion_config',
          permiso: 'dias_bloqueo_minimo',
          rol: settings.dias_bloqueo_minimo.toString(),
          habilitado: true,
        },
        {
          categoria: 'programacion_config',
          permiso: 'dias_bloqueo_maximo',
          rol: settings.dias_bloqueo_maximo.toString(),
          habilitado: true,
        },
      ];

      for (const setting of settingsToSave) {
        const { data: existing } = await supabase
          .from('permisos_roles')
          .select('id')
          .eq('categoria', 'programacion_config')
          .eq('permiso', setting.permiso)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('permisos_roles')
            .update({ rol: setting.rol, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('permisos_roles')
            .insert(setting);
        }
      }

      // Log the change
      await supabase.from('historial_ediciones').insert({
        tabla: 'permisos_roles',
        registro_id: '00000000-0000-0000-0000-000000000000',
        campo_editado: 'programacion_config',
        valor_anterior: null,
        valor_nuevo: JSON.stringify(settings),
      });

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
                min={1}
                max={30}
                value={settings.dias_bloqueo_minimo}
                onChange={(e) =>
                  setSettings({ ...settings, dias_bloqueo_minimo: parseInt(e.target.value) || 1 })
                }
              />
              <p className="text-sm text-muted-foreground">
                Los usuarios no pueden programar actividades con menos de {settings.dias_bloqueo_minimo} días de anticipación.
                <br />
                <span className="font-medium">Ejemplo:</span> Si hoy es el día 1, no puede programar hasta el día {settings.dias_bloqueo_minimo + 1}.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias_maximo">Días máximos de anticipación</Label>
              <Input
                id="dias_maximo"
                type="number"
                min={5}
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
              <li>• Los primeros <span className="font-semibold text-foreground">{settings.dias_bloqueo_minimo} días</span> desde hoy estarán bloqueados</li>
              <li>• Se pueden programar actividades desde el día <span className="font-semibold text-foreground">{settings.dias_bloqueo_minimo + 1}</span> hasta el día <span className="font-semibold text-foreground">{settings.dias_bloqueo_maximo}</span></li>
              <li>• A partir del día <span className="font-semibold text-foreground">{settings.dias_bloqueo_maximo + 1}</span> en adelante estará bloqueado</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
