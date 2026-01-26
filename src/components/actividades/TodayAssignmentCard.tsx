import { Clock, MapPin, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { TodayAssignment } from '@/hooks/useTodayActivity';

const activityTypeLabels = {
  punto: 'Punto Fijo',
  correria: 'Correría',
  libre: 'Libre',
};

interface TodayAssignmentCardProps {
  todayAssignment: TodayAssignment | null;
  monthlyStats?: { dias: number; total: number };
}

export function TodayAssignmentCard({ todayAssignment, monthlyStats }: TodayAssignmentCardProps) {
  return (
    <Card className="card-elevated lg:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-secondary" />
          Asignación de Hoy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {todayAssignment ? (
          <div className="p-4 rounded-lg bg-accent">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-accent-foreground">
                {activityTypeLabels[todayAssignment.tipo_actividad]}
              </span>
              <StatusBadge status="success" label="Activo" size="sm" />
            </div>
            <div className="space-y-2">
              {todayAssignment.nombre && (
                <p className="font-medium">{todayAssignment.nombre}</p>
              )}
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{todayAssignment.municipio}</span>
              </div>
              {todayAssignment.hora_inicio && todayAssignment.hora_fin && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {todayAssignment.hora_inicio.slice(0, 5)} - {todayAssignment.hora_fin.slice(0, 5)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-muted text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Día Libre
            </p>
            <p className="text-xs text-muted-foreground">
              No tienes actividades programadas para hoy. Solo puedes registrar consultas y solicitudes.
            </p>
          </div>
        )}

        {monthlyStats && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Resumen del Mes</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-primary">{monthlyStats.dias}</p>
                <p className="text-xs text-muted-foreground">Días registrados</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-success">
                  {monthlyStats.total ? Math.round((monthlyStats.dias / monthlyStats.total) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Cumplimiento</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
