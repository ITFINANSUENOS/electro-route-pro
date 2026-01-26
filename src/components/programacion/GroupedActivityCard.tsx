import { cn } from "@/lib/utils";
import { MapPin, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export interface GroupedActivity {
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

interface GroupedActivityCardProps {
  group: GroupedActivity;
  showFullDetails?: boolean;
  onClick?: () => void;
}

export function GroupedActivityCard({ group, showFullDetails = false, onClick }: GroupedActivityCardProps) {
  const isTeamActivity = group.user_ids.length > 1;

  return (
    <div 
      className={cn(
        "p-4 rounded-lg border bg-card hover:shadow-md transition-shadow",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-xs font-medium px-2 py-1 rounded',
            activityColors[group.tipo_actividad]
          )}>
            {activityLabels[group.tipo_actividad]}
          </span>
          {group.nombre && (
            <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
              {group.nombre}
            </span>
          )}
        </div>
        {isTeamActivity && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {group.user_ids.length}
          </Badge>
        )}
      </div>
      <div className="space-y-2">
        {/* Show team or individual */}
        <div className="flex items-start gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          {isTeamActivity ? (
            <div className="flex-1 min-w-0">
              <span className="font-medium">Grupo ({group.user_ids.length} asesores)</span>
              {showFullDetails && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {group.user_names.map((name, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className="font-medium truncate">{group.user_names[0] || 'Sin asignar'}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{group.municipio}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>
            {group.hora_inicio ? group.hora_inicio.slice(0, 5) : '00:00'} - {group.hora_fin ? group.hora_fin.slice(0, 5) : '00:00'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Utility function to group activities
export function groupActivities(
  activities: Array<{
    id: string;
    fecha: string;
    tipo_actividad: string;
    municipio: string;
    hora_inicio: string | null;
    hora_fin: string | null;
    user_id: string;
    nombre?: string | null;
  }>,
  getProfileName: (userId: string) => string
): GroupedActivity[] {
  const grouped = new Map<string, GroupedActivity>();

  activities.forEach((activity) => {
    // Create a key based on grouping criteria (including nombre)
    const key = `${activity.fecha}-${activity.tipo_actividad}-${activity.municipio}-${activity.hora_inicio}-${activity.hora_fin}-${activity.nombre || ''}`;
    
    if (grouped.has(key)) {
      const existing = grouped.get(key)!;
      if (!existing.user_ids.includes(activity.user_id)) {
        existing.user_ids.push(activity.user_id);
        existing.user_names.push(getProfileName(activity.user_id));
      }
    } else {
      grouped.set(key, {
        key,
        fecha: activity.fecha,
        tipo_actividad: activity.tipo_actividad as ActivityType,
        municipio: activity.municipio,
        hora_inicio: activity.hora_inicio,
        hora_fin: activity.hora_fin,
        user_ids: [activity.user_id],
        user_names: [getProfileName(activity.user_id)],
        nombre: activity.nombre,
      });
    }
  });

  return Array.from(grouped.values());
}
