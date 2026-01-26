import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Clock, Users, Calendar, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ActivityType = 'punto' | 'correria' | 'libre';

const activityColors: Record<ActivityType, string> = {
  punto: 'bg-primary text-primary-foreground',
  correria: 'bg-secondary text-secondary-foreground',
  libre: 'bg-muted text-muted-foreground',
};

const activityLabels: Record<ActivityType, string> = {
  punto: 'Punto Fijo',
  correria: 'Correría',
  libre: 'Libre',
};

interface GroupedActivity {
  key: string;
  fecha: string;
  tipo_actividad: ActivityType;
  municipio: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  user_ids: string[];
  user_names: string[];
  nombre?: string | null;
}

interface ActivityDetailDialogProps {
  activity: GroupedActivity | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityDetailDialog({ activity, isOpen, onClose }: ActivityDetailDialogProps) {
  if (!activity) return null;

  const activityDate = new Date(activity.fecha + 'T12:00:00');
  const isTeamActivity = activity.user_ids.length > 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={cn(
              'text-sm font-medium px-2 py-1 rounded',
              activityColors[activity.tipo_actividad]
            )}>
              {activityLabels[activity.tipo_actividad]}
            </span>
            {activity.nombre && (
              <span className="text-lg font-semibold">{activity.nombre}</span>
            )}
          </DialogTitle>
          <DialogDescription>
            Detalles de la actividad programada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Fecha */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Fecha</p>
              <p className="text-muted-foreground capitalize">
                {format(activityDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
          </div>

          {/* Horario */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Horario</p>
              <p className="text-muted-foreground">
                {activity.hora_inicio?.slice(0, 5) || '00:00'} - {activity.hora_fin?.slice(0, 5) || '00:00'}
              </p>
            </div>
          </div>

          {/* Ubicación */}
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Ubicación</p>
              <p className="text-muted-foreground">{activity.municipio}</p>
            </div>
          </div>

          {/* Tipo de actividad */}
          <div className="flex items-start gap-3">
            <Tag className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Tipo de Actividad</p>
              <span className={cn(
                'inline-flex text-sm font-medium px-2 py-1 rounded mt-1',
                activityColors[activity.tipo_actividad]
              )}>
                {activityLabels[activity.tipo_actividad]}
              </span>
            </div>
          </div>

          {/* Asesores asignados */}
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="font-medium mb-2">
                {isTeamActivity 
                  ? `Equipo (${activity.user_ids.length} asesores)` 
                  : 'Asesor Asignado'}
              </p>
              <div className="flex flex-wrap gap-2">
                {activity.user_names.map((name, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    className="text-sm py-1 px-3"
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
