import { useState, useEffect } from 'react';
import { Clock, Save, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TodayReport } from '@/hooks/useTodayActivity';

interface ConsultasSectionProps {
  canUploadConsultas: boolean;
  consultasTimeMessage: string;
  isInConsultasWindow: boolean;
  todayReport: TodayReport | null;
  onSubmitConsultas: (data: {
    consultas: number;
    solicitudes: number;
  }) => Promise<void>;
  isSubmitting: boolean;
  showNotificationBanner?: boolean;
}

export function ConsultasSection({
  canUploadConsultas,
  consultasTimeMessage,
  isInConsultasWindow,
  todayReport,
  onSubmitConsultas,
  isSubmitting,
  showNotificationBanner = false,
}: ConsultasSectionProps) {
  const [consultas, setConsultas] = useState('');
  const [solicitudes, setSolicitudes] = useState('');

  // Initialize with existing values if report exists
  useEffect(() => {
    if (todayReport) {
      setConsultas(todayReport.consultas?.toString() || '');
      setSolicitudes(todayReport.solicitudes?.toString() || '');
    }
  }, [todayReport]);

  const handleSubmit = async () => {
    await onSubmitConsultas({
      consultas: parseInt(consultas) || 0,
      solicitudes: parseInt(solicitudes) || 0,
    });
  };

  const hasValues = todayReport?.consultas !== null || todayReport?.solicitudes !== null;

  return (
    <div className="space-y-4">
      {/* Notification banner */}
      {showNotificationBanner && isInConsultasWindow && !hasValues && (
        <Alert variant="destructive" className="bg-warning/10 border-warning text-warning-foreground">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Recordatorio</AlertTitle>
          <AlertDescription>
            Debes registrar tus consultas y solicitudes del día antes de las 9:00 PM
          </AlertDescription>
        </Alert>
      )}

      {/* Time message */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>{consultasTimeMessage}</span>
      </div>

      {!canUploadConsultas ? (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            {consultasTimeMessage}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Current values display */}
          {hasValues && (
            <div className="grid gap-4 md:grid-cols-2 mb-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Consultas registradas</p>
                <p className="text-2xl font-bold">{todayReport?.consultas || 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Solicitudes registradas</p>
                <p className="text-2xl font-bold">{todayReport?.solicitudes || 0}</p>
              </div>
            </div>
          )}

          {/* Input fields */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="consultas">Consultas Realizadas</Label>
              <Input
                id="consultas"
                type="number"
                min="0"
                placeholder="0"
                value={consultas}
                onChange={(e) => setConsultas(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="solicitudes">Solicitudes de Crédito</Label>
              <Input
                id="solicitudes"
                type="number"
                min="0"
                placeholder="0"
                value={solicitudes}
                onChange={(e) => setSolicitudes(e.target.value)}
              />
            </div>
          </div>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
            variant={hasValues ? 'outline' : 'default'}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {hasValues ? 'Actualizar Datos' : 'Guardar Datos'}
              </>
            )}
          </Button>

          {hasValues && (
            <p className="text-xs text-muted-foreground text-center">
              Puedes actualizar estos valores varias veces durante el horario permitido
            </p>
          )}
        </>
      )}
    </div>
  );
}
