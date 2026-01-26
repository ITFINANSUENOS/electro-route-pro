import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, addDays, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, MapPin, User, Clock, Users, AlertCircle } from 'lucide-react';
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
import { TimeSelect } from "@/components/programacion/TimeSelect";
import { ProgramacionFilters } from "@/components/programacion/ProgramacionFilters";
import { AsesorMultiSelect } from "@/components/programacion/AsesorMultiSelect";
import { GroupedActivityCard, groupActivities, GroupedActivity } from "@/components/programacion/GroupedActivityCard";
import { ActivityDetailDialog } from "@/components/programacion/ActivityDetailDialog";
import { useSchedulingConfig } from '@/hooks/useSchedulingConfig';
import { useActivityEvidenceStatus } from '@/hooks/useActivityEvidenceStatus';

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
  const { diasBloqueoMinimo, diasBloqueoMaximo } = useSchedulingConfig();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<GroupedActivity | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  // Form state for new programming
  const [newActivity, setNewActivity] = useState({
    tipo_actividad: 'punto' as ActivityType,
    municipio: '',
    hora_inicio: '08:00',
    hora_fin: '17:00',
    user_ids: [] as string[],
    nombre: '',
  });

  // Filter state for hierarchical filtering
  const [filterRegional, setFilterRegional] = useState('todos');
  const [filterJefe, setFilterJefe] = useState('todos');

  // Calculate minimum and maximum schedulable dates using config
  const minSchedulableDate = useMemo(() => {
    return startOfDay(addDays(new Date(), diasBloqueoMinimo));
  }, [diasBloqueoMinimo]);

  const maxSchedulableDate = useMemo(() => {
    return startOfDay(addDays(new Date(), diasBloqueoMaximo));
  }, [diasBloqueoMaximo]);

  // Check if a date is schedulable (within the allowed window)
  const isDateSchedulable = (date: Date) => {
    const dayStart = startOfDay(date);
    return !isBefore(dayStart, minSchedulableDate) && !isBefore(maxSchedulableDate, dayStart);
  };

  const canEdit = role === 'lider_zona' || role === 'coordinador_comercial' || role === 'administrador';
  

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Fetch programacion data with hierarchical visibility
  const { data: programacion = [], refetch: refetchProgramacion } = useQuery({
    queryKey: ['programacion', format(currentMonth, 'yyyy-MM'), role, profile?.regional_id, (profile as any)?.codigo_jefe],
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
      // The jefe has codigo_jefe in their profile, not codigo_asesor
      const jefeCode = (profile as any)?.codigo_jefe;
      if (role === 'jefe_ventas' && jefeCode) {
        const { data: teamProfiles } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('codigo_jefe', jefeCode);
        
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

  // Fetch profiles for displaying names (needed for all roles, not just editors)
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
    // Always fetch profiles to show names correctly
  });

  // Fetch jefes de ventas for the dialog filter
  const { data: jefesVentas = [] } = useQuery({
    queryKey: ['jefes-ventas-dialog', filterRegional, profile?.regional_id, role],
    queryFn: async () => {
      let query = supabase
        .from('jefes_ventas')
        .select('*, regionales(nombre)')
        .eq('activo', true)
        .order('nombre');

      // Filter by regional for global roles
      if ((role === 'coordinador_comercial' || role === 'administrador') && filterRegional !== 'todos') {
        query = query.eq('regional_id', filterRegional);
      } else if (role === 'lider_zona' && profile?.regional_id) {
        query = query.eq('regional_id', profile.regional_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: canEdit,
  });

  // Get profile name by user_id
  const getProfileName = (userId: string) => {
    const profileItem = profiles.find((p) => p.user_id === userId);
    return profileItem?.nombre_completo || 'Sin asignar';
  };

  const getActivitiesForDate = (date: Date) => {
    return programacion.filter(
      (a) => a.fecha === format(date, 'yyyy-MM-dd')
    );
  };

  // Get grouped activities for a date (for calendar display)
  const getGroupedActivitiesForDate = (date: Date): GroupedActivity[] => {
    const activities = getActivitiesForDate(date);
    return groupActivities(activities, getProfileName);
  };

  const selectedActivities = selectedDate ? getActivitiesForDate(selectedDate) : [];
  const selectedGroupedActivities = selectedDate 
    ? groupActivities(selectedActivities, getProfileName) 
    : [];

  // Get evidence status for selected date activities
  const { statusByActivity, isLoading: loadingEvidence } = useActivityEvidenceStatus(
    selectedGroupedActivities,
    !!selectedDate
  );

  const handleDateClick = (day: Date) => {
    // Always allow viewing the day's details
    setSelectedDate(day);
    
    if (canEdit) {
      // Only allow selecting schedulable dates (today + 4 days or more)
      if (!isDateSchedulable(day)) {
        return; // Don't add to selection if not schedulable
      }
      
      // Toggle selection for multi-select
      const dateStr = format(day, 'yyyy-MM-dd');
      const isSelected = selectedDates.some((d) => format(d, 'yyyy-MM-dd') === dateStr);
      
      if (isSelected) {
        setSelectedDates(selectedDates.filter((d) => format(d, 'yyyy-MM-dd') !== dateStr));
      } else {
        setSelectedDates([...selectedDates, day]);
      }
    }
  };

  // When jefe filter changes, auto-select all asesores from that jefe
  const handleJefeFilterChange = (jefeCode: string) => {
    setFilterJefe(jefeCode);
    
    if (jefeCode !== 'todos') {
      // Auto-select all asesores from this jefe
      const asesoresDelJefe = profiles.filter(p => {
        // Match by codigo_jefe
        if (p.codigo_jefe !== jefeCode) return false;
        // Also filter by regional if applicable
        if (filterRegional !== 'todos' && p.regional_id !== filterRegional) return false;
        if (role === 'lider_zona' && profile?.regional_id && p.regional_id !== profile.regional_id) return false;
        return true;
      });
      
      setNewActivity(prev => ({
        ...prev,
        user_ids: asesoresDelJefe.map(p => p.user_id)
      }));
    } else {
      // Clear selection when "todos" is selected
      setNewActivity(prev => ({
        ...prev,
        user_ids: []
      }));
    }
  };

  const handleCreateProgramacion = async () => {
    if (newActivity.user_ids.length === 0 || !newActivity.municipio || selectedDates.length === 0) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    // Validate all selected dates are schedulable
    const invalidDates = selectedDates.filter(d => !isDateSchedulable(d));
    if (invalidDates.length > 0) {
      toast.error(`Algunas fechas seleccionadas no son válidas (deben estar entre ${diasBloqueoMinimo} y ${diasBloqueoMaximo} días en el futuro)`);
      return;
    }

    try {
      // Create entries for each user and each date
      const insertData = selectedDates.flatMap((date) =>
        newActivity.user_ids.map((userId) => ({
          fecha: format(date, 'yyyy-MM-dd'),
          user_id: userId,
          tipo_actividad: newActivity.tipo_actividad,
          municipio: newActivity.municipio,
          hora_inicio: newActivity.hora_inicio,
          hora_fin: newActivity.hora_fin,
          creado_por: user?.id,
          nombre: newActivity.nombre || null,
        }))
      );

      const { error } = await supabase.from('programacion').insert(insertData);

      if (error) throw error;

      const totalEntries = selectedDates.length * newActivity.user_ids.length;
      toast.success(`Programación creada: ${newActivity.user_ids.length} asesor(es) × ${selectedDates.length} día(s) = ${totalEntries} registro(s)`);
      setIsDialogOpen(false);
      setSelectedDates([]);
      setNewActivity({
        tipo_actividad: 'punto',
        municipio: '',
        hora_inicio: '08:00',
        hora_fin: '17:00',
        user_ids: [],
        nombre: '',
      });
      setFilterRegional('todos');
      setFilterJefe('todos');
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
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
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
                  <div className="flex flex-wrap gap-2 max-h-[80px] overflow-y-auto">
                    {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map((date) => (
                      <Badge key={date.toISOString()} variant="secondary">
                        {format(date, 'd MMM', { locale: es })}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Hierarchical Filters - Regional */}
                <ProgramacionFilters
                  selectedRegional={filterRegional}
                  setSelectedRegional={(value) => {
                    setFilterRegional(value);
                    setFilterJefe('todos');
                    setNewActivity(prev => ({ ...prev, user_ids: [] }));
                  }}
                  selectedJefe={filterJefe}
                  setSelectedJefe={handleJefeFilterChange}
                />

                {/* Jefe de Ventas filter - for selecting entire team */}
                {canEdit && jefesVentas.length > 0 && (
                  <div className="space-y-2">
                    <Label>Jefe de Ventas (selecciona para asignar su equipo)</Label>
                    <Select value={filterJefe} onValueChange={handleJefeFilterChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar jefe de ventas..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Selección manual de asesores</SelectItem>
                        {jefesVentas.map((jefe) => {
                          // Count asesores for this jefe
                          const asesorCount = profiles.filter(p => {
                            if (p.codigo_jefe !== jefe.codigo) return false;
                            if (filterRegional !== 'todos' && p.regional_id !== filterRegional) return false;
                            if (role === 'lider_zona' && profile?.regional_id && p.regional_id !== profile.regional_id) return false;
                            return true;
                          }).length;
                          
                          return (
                            <SelectItem key={jefe.id} value={jefe.codigo}>
                              {jefe.nombre} ({asesorCount} asesores)
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {filterJefe !== 'todos' && (
                      <p className="text-xs text-green-600">
                        <Users className="inline h-3 w-3 mr-1" />
                        Equipo completo seleccionado - se mostrará como grupo en el calendario
                      </p>
                    )}
                  </div>
                )}

                {/* Asesores - Multi-select */}
                <div className="space-y-2">
                  <Label>Asesores *</Label>
                  <AsesorMultiSelect
                    profiles={profiles}
                    selectedUserIds={newActivity.user_ids}
                    onChange={(userIds) => setNewActivity({ ...newActivity, user_ids: userIds })}
                    selectedRegional={filterRegional}
                    selectedJefe={filterJefe}
                    userRegionalId={role === 'lider_zona' ? profile?.regional_id : null}
                  />
                  <p className="text-xs text-muted-foreground">
                    <Users className="inline h-3 w-3 mr-1" />
                    Las actividades con múltiples asesores se mostrarán agrupadas
                  </p>
                </div>

                {/* Nombre de la actividad */}
                <div className="space-y-2">
                  <Label>Nombre de la Actividad</Label>
                  <Input
                    placeholder="Ej: Jornada de cobranza, Capacitación, etc."
                    value={newActivity.nombre}
                    onChange={(e) => setNewActivity({ ...newActivity, nombre: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Opcional - Identifica esta actividad con un nombre descriptivo
                  </p>
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

                {/* Horario - Improved UI */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora Inicio</Label>
                    <TimeSelect
                      value={newActivity.hora_inicio}
                      onChange={(value) => setNewActivity({ ...newActivity, hora_inicio: value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Fin</Label>
                    <TimeSelect
                      value={newActivity.hora_fin}
                      onChange={(value) => setNewActivity({ ...newActivity, hora_fin: value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateProgramacion} disabled={newActivity.user_ids.length === 0}>
                  Crear Programación ({newActivity.user_ids.length} asesor(es))
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>


      {/* Multi-select hint for editors */}
      {canEdit && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3 space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary font-medium">
                Selecciona días en el calendario y presiona "Nueva Programación"
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              <span>
                Puedes programar desde el {format(minSchedulableDate, "d 'de' MMMM", { locale: es })} hasta el {format(maxSchedulableDate, "d 'de' MMMM", { locale: es })} ({diasBloqueoMinimo}-{diasBloqueoMaximo} días)
              </span>
            </div>
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
                const groupedActivities = getGroupedActivitiesForDate(day);
                const totalPeople = groupedActivities.reduce((sum, g) => sum + g.user_ids.length, 0);
                const isSelected = selectedDate && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                const isMultiSelected = selectedDates.some((d) => format(d, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
                const canScheduleThisDay = isDateSchedulable(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      'h-24 p-1 rounded-lg border text-left transition-all',
                      canScheduleThisDay && canEdit && 'hover:border-primary cursor-pointer',
                      !canScheduleThisDay && canEdit && 'bg-muted/30 cursor-not-allowed',
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
                      {groupedActivities.slice(0, 2).map((group) => (
                        <div
                          key={group.key}
                          className={cn(
                            'text-xs px-1 py-0.5 rounded truncate flex items-center gap-1',
                            activityColors[group.tipo_actividad]
                          )}
                        >
                          {group.user_ids.length > 1 ? (
                            <>
                              <Users className="h-3 w-3 flex-shrink-0" />
                              <span>Grupo ({group.user_ids.length})</span>
                            </>
                          ) : (
                            <span>{group.user_names[0]?.split(' ')[0]}</span>
                          )}
                        </div>
                      ))}
                      {groupedActivities.length > 2 && (
                        <div className="text-xs text-muted-foreground px-1">
                          +{groupedActivities.length - 2} más
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

        {/* Selected day details - Now with grouped activities */}
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
            {selectedDate && selectedGroupedActivities.length > 0 && (
              <CardDescription>
                {selectedGroupedActivities.length} actividad(es) • {selectedActivities.length} asesor(es) en total
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              selectedGroupedActivities.length > 0 ? (
                <div className="space-y-4">
                  {selectedGroupedActivities.map((group) => (
                    <GroupedActivityCard 
                      key={group.key} 
                      group={group} 
                      showFullDetails={true}
                      evidenceStatus={statusByActivity[group.key]}
                      onClick={() => {
                        setSelectedActivity(group);
                        setIsDetailDialogOpen(true);
                      }}
                    />
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

      {/* Activity Detail Dialog */}
      <ActivityDetailDialog
        activity={selectedActivity}
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        onRefresh={() => refetchProgramacion()}
      />
    </motion.div>
  );
}
