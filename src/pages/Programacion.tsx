import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, MapPin, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ActivityType = 'punto' | 'correria' | 'libre';

interface ScheduledActivity {
  id: string;
  date: Date;
  type: ActivityType;
  advisor: string;
  location: string;
  timeRange: string;
}

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

// Mock data
const mockActivities: ScheduledActivity[] = [
  { id: '1', date: new Date(2026, 0, 20), type: 'punto', advisor: 'María López', location: 'Popayán Centro', timeRange: '8:00 - 17:00' },
  { id: '2', date: new Date(2026, 0, 20), type: 'correria', advisor: 'Carlos Ruiz', location: 'Santander de Q.', timeRange: '7:00 - 16:00' },
  { id: '3', date: new Date(2026, 0, 21), type: 'punto', advisor: 'Ana Martínez', location: 'Almacén Norte', timeRange: '8:00 - 17:00' },
  { id: '4', date: new Date(2026, 0, 22), type: 'libre', advisor: 'Pedro Santos', location: 'Sin asignar', timeRange: '-' },
  { id: '5', date: new Date(2026, 0, 23), type: 'correria', advisor: 'María López', location: 'Timbío', timeRange: '6:00 - 15:00' },
];

export default function Programacion() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getActivitiesForDate = (date: Date) => {
    return mockActivities.filter(
      (a) => format(a.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const selectedActivities = selectedDate ? getActivitiesForDate(selectedDate) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Programación</h1>
          <p className="text-muted-foreground mt-1">
            Planifica las actividades del equipo comercial
          </p>
        </div>
        <Button className="btn-brand">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Programación
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="card-elevated lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Week headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month start */}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="h-24 p-1" />
              ))}

              {days.map((day) => {
                const activities = getActivitiesForDate(day);
                const isSelected = selectedDate && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'h-24 p-1 rounded-lg border text-left transition-all hover:border-primary',
                      isToday(day) && 'ring-2 ring-primary',
                      isSelected && 'border-primary bg-accent',
                      !isSameMonth(day, currentMonth) && 'opacity-50'
                    )}
                  >
                    <span className={cn(
                      'text-sm font-medium',
                      isToday(day) && 'text-primary'
                    )}>
                      {format(day, 'd')}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {activities.slice(0, 2).map((activity) => (
                        <div
                          key={activity.id}
                          className={cn(
                            'text-xs px-1 py-0.5 rounded truncate',
                            activityColors[activity.type]
                          )}
                        >
                          {activity.advisor.split(' ')[0]}
                        </div>
                      ))}
                      {activities.length > 2 && (
                        <div className="text-xs text-muted-foreground px-1">
                          +{activities.length - 2} más
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              {Object.entries(activityLabels).map(([type, label]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={cn('h-3 w-3 rounded', activityColors[type as ActivityType])} />
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected day details */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>
              {selectedDate ? (
                <span className="capitalize">
                  {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                </span>
              ) : (
                'Selecciona un día'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              selectedActivities.length > 0 ? (
                <div className="space-y-4">
                  {selectedActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={cn(
                          'text-xs font-medium px-2 py-1 rounded',
                          activityColors[activity.type]
                        )}>
                          {activityLabels[activity.type]}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{activity.advisor}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{activity.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{activity.timeRange}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay actividades programadas</p>
                  <Button variant="outline" className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar actividad
                  </Button>
                </div>
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Haz clic en un día del calendario para ver los detalles</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
