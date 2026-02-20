import { useState, useMemo } from 'react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Clock, Users, Calendar, Tag, Pencil, Trash2, Save, X, CheckCircle, XCircle, Camera, Navigation, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { dataService } from '@/services';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSchedulingConfig } from '@/hooks/useSchedulingConfig';
import { useActivityEvidenceStatus, isActivityForToday } from '@/hooks/useActivityEvidenceStatus';
import { TimeSelect } from './TimeSelect';
import { LocationPicker } from './LocationPicker';
import { AsesorMultiSelect } from './AsesorMultiSelect';
import { ProgramacionFilters } from './ProgramacionFilters';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapaUbicacion } from '@/components/ui/MapaUbicacion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  onRefresh?: () => void;
}

export function ActivityDetailDialog({ activity, isOpen, onClose, onRefresh }: ActivityDetailDialogProps) {
  const { role, user, profile } = useAuth();
  const navigate = useNavigate();
  const { diasBloqueoMinimo } = useSchedulingConfig();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMultiDateConfirm, setShowMultiDateConfirm] = useState(false);
  const [pendingSaveAction, setPendingSaveAction] = useState<'single' | 'all' | null>(null);
  
  // Edit state
  const [editData, setEditData] = useState({
    tipo_actividad: 'punto' as ActivityType,
    municipio: '',
    hora_inicio: '08:00',
    hora_fin: '17:00',
    nombre: '',
    user_ids: [] as string[],
  });

  // Filter state for asesor selector
  const [filterRegional, setFilterRegional] = useState('todos');
  const [filterJefe, setFilterJefe] = useState('todos');

  // Fetch evidence status
  const { statusByActivity } = useActivityEvidenceStatus(
    activity ? [{
      fecha: activity.fecha,
      user_ids: activity.user_ids,
      user_names: activity.user_names,
      tipo_actividad: activity.tipo_actividad,
      key: activity.key,
    }] : [],
    isOpen && !!activity
  );

  // Fetch GPS coordinates
  const { data: reportesGPS = [] } = useQuery({
    queryKey: ['activity-gps', activity?.fecha, activity?.user_ids],
    queryFn: async () => {
      if (!activity) return [];
      const { data, error } = await (dataService
        .from('reportes_diarios')
        .select('user_id, gps_latitud, gps_longitud, hora_registro')
        .eq('fecha', activity.fecha)
        .in('user_id', activity.user_ids)
        .not('gps_latitud', 'is', null)
        .not('gps_longitud', 'is', null) as any);
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!activity,
  });

  // Fetch profiles for asesor selector (only when editing)
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-edit-programacion'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('profiles')
        .select('user_id, nombre_completo, codigo_asesor, codigo_jefe, regional_id, tipo_asesor')
        .eq('activo', true) as any);
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && isEditing,
  });

  // Fetch other dates where this same activity exists (for multi-date apply)
  const { data: relatedDates = [] } = useQuery({
    queryKey: ['related-activity-dates', activity?.nombre, activity?.municipio, activity?.tipo_actividad, activity?.hora_inicio, activity?.hora_fin],
    queryFn: async () => {
      if (!activity) return [];
      let query = dataService
        .from('programacion')
        .select('fecha')
        .eq('municipio', activity.municipio)
        .eq('tipo_actividad', activity.tipo_actividad)
        .neq('fecha', activity.fecha);
      
      if (activity.hora_inicio) query = query.eq('hora_inicio', activity.hora_inicio);
      if (activity.hora_fin) query = query.eq('hora_fin', activity.hora_fin);
      if (activity.nombre) query = query.eq('nombre', activity.nombre);
      
      const { data, error } = await (query as any);
      if (error) throw error;
      // Get unique dates
      const uniqueDates = [...new Set((data || []).map((d: any) => d.fecha))];
      return uniqueDates.sort() as string[];
    },
    enabled: isOpen && isEditing && !!activity,
  });

  const gpsLocation = useMemo(() => {
    if (reportesGPS.length === 0) return null;
    const first = reportesGPS[0];
    return { lat: Number(first.gps_latitud), lng: Number(first.gps_longitud) };
  }, [reportesGPS]);

  if (!activity) return null;

  const evidenceStatus = statusByActivity[activity.key];
  const isToday = isActivityForToday(activity.fecha);
  const isUserAssigned = user?.id && activity.user_ids.includes(user.id);
  const isCorriera = activity.tipo_actividad === 'correria';
  const activityDate = new Date(activity.fecha + 'T12:00:00');
  const isTeamActivity = activity.user_ids.length > 1;
  
  const canEdit = role === 'lider_zona' || role === 'coordinador_comercial' || role === 'administrador';
  const minEditableDate = startOfDay(addDays(new Date(), diasBloqueoMinimo));
  const canEditDate = !isBefore(startOfDay(activityDate), minEditableDate);
  const canModify = canEdit && canEditDate;

  const handleStartEdit = () => {
    setEditData({
      tipo_actividad: activity.tipo_actividad,
      municipio: activity.municipio,
      hora_inicio: activity.hora_inicio?.slice(0, 5) || '08:00',
      hora_fin: activity.hora_fin?.slice(0, 5) || '17:00',
      nombre: activity.nombre || '',
      user_ids: [...activity.user_ids],
    });
    setFilterRegional('todos');
    setFilterJefe('todos');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setShowMultiDateConfirm(false);
    setPendingSaveAction(null);
  };

  const handleSaveClick = () => {
    if (!editData.municipio) {
      toast.error('El municipio es requerido');
      return;
    }
    if (editData.user_ids.length === 0) {
      toast.error('Debe seleccionar al menos un asesor');
      return;
    }

    // Always ask if there are related dates
    if (relatedDates.length > 0) {
      setShowMultiDateConfirm(true);
    } else {
      executeSave('single');
    }
  };

  const executeSave = async (mode: 'single' | 'all') => {
    setIsSaving(true);
    setShowMultiDateConfirm(false);
    try {
      const datesToUpdate = mode === 'all' 
        ? [activity.fecha, ...relatedDates] 
        : [activity.fecha];

      const originalUserIds = activity.user_ids;
      const newUserIds = editData.user_ids;
      const addedUsers = newUserIds.filter(id => !originalUserIds.includes(id));
      const removedUsers = originalUserIds.filter(id => !newUserIds.includes(id));
      const keptUsers = newUserIds.filter(id => originalUserIds.includes(id));

      for (const fecha of datesToUpdate) {
        // Update existing records for kept users
        if (keptUsers.length > 0) {
          const { error } = await (dataService
            .from('programacion')
            .update({
              tipo_actividad: editData.tipo_actividad,
              municipio: editData.municipio,
              hora_inicio: editData.hora_inicio,
              hora_fin: editData.hora_fin,
              nombre: editData.nombre || null,
              updated_at: new Date().toISOString(),
            })
            .eq('fecha', fecha)
            .eq('municipio', activity.municipio)
            .eq('tipo_actividad', activity.tipo_actividad)
            .in('user_id', keptUsers) as any);
          if (error) throw error;
        }

        // Delete records for removed users
        if (removedUsers.length > 0) {
          const { error } = await (dataService
            .from('programacion')
            .delete()
            .eq('fecha', fecha)
            .eq('municipio', activity.municipio)
            .eq('tipo_actividad', activity.tipo_actividad)
            .in('user_id', removedUsers) as any);
          if (error) throw error;
        }

        // Insert records for added users
        if (addedUsers.length > 0) {
          const newRecords = addedUsers.map(userId => ({
            fecha,
            tipo_actividad: editData.tipo_actividad,
            municipio: editData.municipio,
            hora_inicio: editData.hora_inicio,
            hora_fin: editData.hora_fin,
            nombre: editData.nombre || null,
            user_id: userId,
            creado_por: user?.id || null,
          }));
          const { error } = await (dataService
            .from('programacion')
            .insert(newRecords) as any);
          if (error) throw error;
        }
      }

      const dateCount = datesToUpdate.length;
      toast.success(
        dateCount > 1 
          ? `Programación actualizada en ${dateCount} fecha(s)` 
          : 'Programación actualizada correctamente'
      );
      setIsEditing(false);
      onRefresh?.();
      onClose();
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Error al actualizar la programación');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await (dataService
        .from('programacion')
        .delete()
        .eq('fecha', activity.fecha)
        .eq('municipio', activity.municipio)
        .eq('tipo_actividad', activity.tipo_actividad)
        .eq('hora_inicio', activity.hora_inicio)
        .eq('hora_fin', activity.hora_fin)
        .in('user_id', activity.user_ids) as any);

      if (error) throw error;
      toast.success(`Programación eliminada (${activity.user_ids.length} registro(s))`);
      onRefresh?.();
      onClose();
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Error al eliminar la programación');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
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
              {isEditing ? 'Editando programación' : 'Detalles de la actividad programada'}
            </DialogDescription>
          </DialogHeader>

          {isEditing ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nombre de la Actividad</Label>
                <Input
                  placeholder="Ej: Jornada de cobranza"
                  value={editData.nombre}
                  onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Actividad *</Label>
                <Select
                  value={editData.tipo_actividad}
                  onValueChange={(value) => setEditData({ ...editData, tipo_actividad: value as ActivityType })}
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

              <LocationPicker
                value={editData.municipio}
                onChange={(value) => setEditData({ ...editData, municipio: value })}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora Inicio</Label>
                  <TimeSelect
                    value={editData.hora_inicio}
                    onChange={(value) => setEditData({ ...editData, hora_inicio: value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora Fin</Label>
                  <TimeSelect
                    value={editData.hora_fin}
                    onChange={(value) => setEditData({ ...editData, hora_fin: value })}
                  />
                </div>
              </div>

              {/* Asesor selector */}
              <div className="space-y-2 border-t pt-4">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Asesores Asignados ({editData.user_ids.length})
                </Label>
                <ProgramacionFilters
                  selectedRegional={filterRegional}
                  setSelectedRegional={(v) => { setFilterRegional(v); setFilterJefe('todos'); }}
                  selectedJefe={filterJefe}
                  setSelectedJefe={setFilterJefe}
                />
                <AsesorMultiSelect
                  profiles={profiles}
                  selectedUserIds={editData.user_ids}
                  onChange={(userIds) => setEditData({ ...editData, user_ids: userIds })}
                  selectedRegional={filterRegional}
                  selectedJefe={filterJefe}
                  userRegionalId={profile?.regional_id}
                />
              </div>

              {relatedDates.length > 0 && (
                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Esta actividad también existe en {relatedDates.length} fecha(s) más. 
                  Al guardar podrás elegir si aplicar los cambios a todas.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSaveClick} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </div>
          ) : (
            // View Mode
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

              {/* Asesores asignados con estado de evidencia */}
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">
                      {isTeamActivity 
                        ? `Equipo (${activity.user_ids.length} asesores)` 
                        : 'Asesor Asignado'}
                    </p>
                    {evidenceStatus && (
                      <Badge 
                        variant={evidenceStatus.with_evidence === evidenceStatus.total_assigned ? "default" : "outline"}
                        className={cn(
                          evidenceStatus.with_evidence === evidenceStatus.total_assigned 
                            ? "bg-success text-success-foreground" 
                            : evidenceStatus.with_evidence > 0 
                              ? "border-warning text-warning"
                              : "border-destructive text-destructive"
                        )}
                      >
                        {evidenceStatus.with_evidence}/{evidenceStatus.total_assigned} con evidencia
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    {activity.user_names.map((name, idx) => {
                      const userEvidence = evidenceStatus?.evidence_by_user[idx];
                      const userId = activity.user_ids[idx];
                      const isCurrentUser = user?.id === userId;
                      
                      return (
                        <div 
                          key={idx} 
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg",
                            isCurrentUser ? "bg-accent" : "bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn("text-sm", isCurrentUser && "font-medium")}>
                              {name}
                              {isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(tú)</span>}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {userEvidence && (
                              <>
                                {isCorriera && (
                                  <div className="flex items-center gap-1" title={userEvidence.has_photo ? "Foto subida" : "Sin foto"}>
                                    <Camera className={cn("h-4 w-4", userEvidence.has_photo ? "text-success" : "text-muted-foreground")} />
                                  </div>
                                )}
                                <div className="flex items-center gap-1" title={userEvidence.has_gps ? "Ubicación registrada" : "Sin ubicación"}>
                                  <Navigation className={cn("h-4 w-4", userEvidence.has_gps ? "text-success" : "text-muted-foreground")} />
                                </div>
                                {userEvidence.has_evidence ? (
                                  <CheckCircle className="h-4 w-4 text-success" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive" />
                                )}
                              </>
                            )}
                            {!userEvidence && (
                              <span className="text-xs text-muted-foreground">Sin reporte</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Mini-mapa con ubicaciones GPS */}
              {gpsLocation && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium mb-2">Ubicación GPS Registrada</p>
                    <MapaUbicacion 
                      lat={gpsLocation.lat}
                      lng={gpsLocation.lng}
                      zoom={14}
                      height="200px"
                      popup={`${activity.municipio} - ${reportesGPS.length} reporte(s) GPS`}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {reportesGPS.length} asesor(es) con ubicación registrada
                    </p>
                  </div>
                </div>
              )}
              {isUserAssigned && isToday && (
                <div className="pt-4 border-t">
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      onClose();
                      navigate('/actividades');
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Reportar Actividad
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {isCorriera 
                      ? 'Debes subir foto y registrar tu ubicación GPS'
                      : 'Debes registrar tu ubicación GPS'}
                  </p>
                </div>
              )}

              {/* Action buttons for editors */}
              {canEdit && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  {!canEditDate && (
                    <p className="text-xs text-muted-foreground flex-1 self-center">
                      No se puede modificar (menos de {diasBloqueoMinimo} días de anticipación)
                    </p>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={!canModify || isDeleting}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar esta programación?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará la programación de {activity.user_ids.length} asesor(es) 
                          para el {format(activityDate, "d 'de' MMMM", { locale: es })}. 
                          Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  <Button size="sm" onClick={handleStartEdit} disabled={!canModify}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Multi-date confirmation dialog */}
      <AlertDialog open={showMultiDateConfirm} onOpenChange={setShowMultiDateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar cambios a múltiples fechas</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Esta actividad también existe en <strong>{relatedDates.length} fecha(s) adicional(es)</strong>:
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {relatedDates.slice(0, 10).map(d => (
                  <Badge key={d} variant="secondary" className="text-xs">
                    {format(new Date(d + 'T12:00:00'), "d MMM", { locale: es })}
                  </Badge>
                ))}
                {relatedDates.length > 10 && (
                  <Badge variant="outline" className="text-xs">+{relatedDates.length - 10} más</Badge>
                )}
              </div>
              <p className="mt-2">¿Deseas aplicar los cambios solo a esta fecha o a todas?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setShowMultiDateConfirm(false)}>
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => executeSave('single')}
              disabled={isSaving}
            >
              Solo esta fecha
            </Button>
            <Button
              onClick={() => executeSave('all')}
              disabled={isSaving}
            >
              Todas las fechas ({relatedDates.length + 1})
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
