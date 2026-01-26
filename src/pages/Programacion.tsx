import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, MapPin, User, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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

export default function Programacion() {
  const { role, user, profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  
  // Form state for new programming
  const [newActivity, setNewActivity] = useState({
    tipo_actividad: 'punto' as ActivityType,
    municipio: '',
    hora_inicio: '08:00',
    hora_fin: '17:00',
    user_id: '',
  });

  const canEdit = role === 'lider_zona' || role === 'coordinador_comercial' || role === 'administrador';
  

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Fetch programacion data with hierarchical visibility
  const { data: programacion = [], refetch: refetchProgramacion } = useQuery({
    queryKey: ['programacion', format(currentMonth, 'yyyy-MM'), role, profile?.regional_id, profile?.codigo_jefe],
    queryFn: async () => {
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');
      
      // First get the schedule data
      let query = supabase
        .from('programacion')
        .select('*')
        .gte('fecha', startDate)
        .lte('fecha', endDate);

      const { data: scheduleData, error } = await query;
      if (error) throw error;
      
      if (!scheduleData || scheduleData.length === 0) return [];

      // For asesor_comercial: only their own schedule
      if (role === 'asesor_comercial' && user?.id) {
        return scheduleData.filter(s => s.user_id === user.id);
      }

      // For jefe_ventas: their own + their team's schedules (asesores with same codigo_jefe)
      if (role === 'jefe_ventas' && profile?.codigo_asesor) {
        const { data: teamProfiles } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('codigo_jefe', profile.codigo_asesor);
        
        const teamUserIds = new Set([user?.id, ...(teamProfiles?.map(p => p.user_id) || [])]);
        return scheduleData.filter(s => teamUserIds.has(s.user_id));
      }

      // For lider_zona: their regional's schedules
      if (role === 'lider_zona' && profile?.regional_id) {
        const { data: regionalProfiles } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('regional_id', profile.regional_id);
        
        const regionalUserIds = new Set(regionalProfiles?.map(p => p.user_id) || []);
        return scheduleData.filter(s => regionalUserIds.has(s.user_id));
      }

      // For coordinador_comercial, administrativo, administrador: all schedules
      return scheduleData;
    },
  });

  // Fetch profiles for assigning asesores
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-programacion'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('activo', true);
      if (error) throw error;
      return data || [];
    },
    enabled: canEdit,
  });

  // Get profile name by user_id
  const getProfileName = (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.nombre_completo || 'Sin asignar';
  };

  const getActivitiesForDate = (date: Date) => {
    return programacion.filter(
      (a) => a.fecha === format(date, 'yyyy-MM-dd')
    );
  };

  const selectedActivities = selectedDate ? getActivitiesForDate(selectedDate) : [];

  const handleDateClick = (day: Date) => {
    if (canEdit) {
      // Toggle selection for multi-select
      const dateStr = format(day, 'yyyy-MM-dd');
      const isSelected = selectedDates.some((d) => format(d, 'yyyy-MM-dd') === dateStr);
      
      if (isSelected) {
        setSelectedDates(selectedDates.filter((d) => format(d, 'yyyy-MM-dd') !== dateStr));
      } else {
        setSelectedDates([...selectedDates, day]);
      }
    }
    setSelectedDate(day);
  };

  const handleCreateProgramacion = async () => {
    if (!newActivity.user_id || !newActivity.municipio || selectedDates.length === 0) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      const insertData = selectedDates.map((date) => ({
        fecha: format(date, 'yyyy-MM-dd'),
        user_id: newActivity.user_id,
        tipo_actividad: newActivity.tipo_actividad,
        municipio: newActivity.municipio,
        hora_inicio: newActivity.hora_inicio,
        hora_fin: newActivity.hora_fin,
        creado_por: user?.id,
      }));

      const { error } = await supabase.from('programacion').insert(insertData);

      if (error) throw error;

      toast.success(`Programación creada para ${selectedDates.length} día(s)`);
      setIsDialogOpen(false);
      setSelectedDates([]);
      setNewActivity({
        tipo_actividad: 'punto',
        municipio: '',
        hora_inicio: '08:00',
        hora_fin: '17:00',
        user_id: '',
      });
      refetchProgramacion();
    } catch (error) {
      console.error('Error creating programacion:', error);
      toast.error('Error al crear la programación');
    }
  };

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
            {canEdit 
              ? 'Planifica las actividades del equipo comercial'
              : 'Visualiza tu programación de actividades'}
          </p>
        </div>
        
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-brand" disabled={selectedDates.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Programación {selectedDates.length > 0 && `(${selectedDates.length} días)`}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nueva Programación</DialogTitle>
                <DialogDescription>
                  Crear programación para {selectedDates.length} día(s) seleccionado(s)
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                {/* Fechas seleccionadas */}
                <div className="space-y-2">
                  <Label>Fechas seleccionadas</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedDates.map((date) => (
                      <Badge key={date.toISOString()} variant="secondary">
                        {format(date, 'd MMM', { locale: es })}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Asesor */}
                <div className="space-y-2">
                  <Label>Asesor *</Label>
                  <Select
                    value={newActivity.user_id}
                    onValueChange={(value) => setNewActivity({ ...newActivity, user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar asesor" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.nombre_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo actividad */}
                <div className="space-y-2">
                  <Label>Tipo de Actividad *</Label>
                  <Select
                    value={newActivity.tipo_actividad}
                    onValueChange={(value) => setNewActivity({ ...newActivity, tipo_actividad: value as ActivityType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="punto">Punto Fijo</SelectItem>
                      <SelectItem value="correria">Correría</SelectItem>
                      <SelectItem value="libre">Libre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Municipio/Lugar */}
                <div className="space-y-2">
                  <Label>Municipio / Lugar *</Label>
                  <Input
                    placeholder="Ej: Popayán Centro"
                    value={newActivity.municipio}
                    onChange={(e) => setNewActivity({ ...newActivity, municipio: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    <MapPin className="inline h-3 w-3 mr-1" />
                    La integración con Google Maps estará disponible próximamente
                  </p>
                </div>

                {/* Horario */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora Inicio</Label>
                    <Input
                      type="time"
                      value={newActivity.hora_inicio}
                      onChange={(e) => setNewActivity({ ...newActivity, hora_inicio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Fin</Label>
                    <Input
                      type="time"
                      value={newActivity.hora_fin}
                      onChange={(e) => setNewActivity({ ...newActivity, hora_fin: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateProgramacion}>
                  Crear Programación
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>


      {/* Multi-select hint for editors */}
      {canEdit && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary">
              Haz clic en múltiples días para seleccionarlos, luego presiona "Nueva Programación"
            </span>
          </CardContent>
        </Card>
      )}

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
                const isMultiSelected = selectedDates.some((d) => format(d, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      'h-24 p-1 rounded-lg border text-left transition-all hover:border-primary',
                      isToday(day) && 'ring-2 ring-primary',
                      isSelected && 'border-primary bg-accent',
                      isMultiSelected && canEdit && 'bg-primary/20 border-primary',
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
                            activityColors[activity.tipo_actividad as ActivityType]
                          )}
                        >
                          {getProfileName(activity.user_id).split(' ')[0]}
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
            {selectedDate && selectedActivities.length > 0 && (
              <CardDescription>
                {selectedActivities.length} actividad(es) programada(s)
              </CardDescription>
            )}
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
                          activityColors[activity.tipo_actividad as ActivityType]
                        )}>
                          {activityLabels[activity.tipo_actividad as ActivityType]}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{getProfileName(activity.user_id)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{activity.municipio}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {activity.hora_inicio ? activity.hora_inicio.slice(0, 5) : '00:00'} - {activity.hora_fin ? activity.hora_fin.slice(0, 5) : '00:00'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay actividades programadas</p>
                  {canEdit && (
                    <p className="text-sm mt-2">
                      Selecciona este día y otros para crear programación
                    </p>
                  )}
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
