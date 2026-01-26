import { useState } from 'react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Clock, Users, Calendar, Tag, Pencil, Trash2, Save, X, CheckCircle, XCircle, Camera, Navigation, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSchedulingConfig } from '@/hooks/useSchedulingConfig';
import { useActivityEvidenceStatus, isActivityForToday } from '@/hooks/useActivityEvidenceStatus';
import { TimeSelect } from './TimeSelect';
import { useNavigate } from 'react-router-dom';
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
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const { diasBloqueoMinimo } = useSchedulingConfig();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [editData, setEditData] = useState({
    tipo_actividad: 'punto' as ActivityType,
    municipio: '',
    hora_inicio: '08:00',
    hora_fin: '17:00',
    nombre: '',
  });

  // Fetch evidence status for this activity
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

  if (!activity) return null;

  const evidenceStatus = statusByActivity[activity.key];
  const isToday = isActivityForToday(activity.fecha);
  const isUserAssigned = user?.id && activity.user_ids.includes(user.id);
  const isCorriera = activity.tipo_actividad === 'correria';

  const activityDate = new Date(activity.fecha + 'T12:00:00');
  const isTeamActivity = activity.user_ids.length > 1;
  
  // Check if user can edit (role check)
  const canEdit = role === 'lider_zona' || role === 'coordinador_comercial' || role === 'administrador';
  
  // Check if activity can still be edited based on date restrictions
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
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editData.municipio) {
      toast.error('El municipio es requerido');
      return;
    }

    setIsSaving(true);
    try {
      // Update all records that belong to this grouped activity
      const { error } = await supabase
        .from('programacion')
        .update({
          tipo_actividad: editData.tipo_actividad,
          municipio: editData.municipio,
          hora_inicio: editData.hora_inicio,
          hora_fin: editData.hora_fin,
          nombre: editData.nombre || null,
          updated_at: new Date().toISOString(),
        })
        .eq('fecha', activity.fecha)
        .eq('municipio', activity.municipio)
        .eq('tipo_actividad', activity.tipo_actividad)
        .eq('hora_inicio', activity.hora_inicio)
        .eq('hora_fin', activity.hora_fin)
        .in('user_id', activity.user_ids);

      if (error) throw error;

      toast.success('Programación actualizada correctamente');
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
      // Delete all records that belong to this grouped activity
      const { error } = await supabase
        .from('programacion')
        .delete()
        .eq('fecha', activity.fecha)
        .eq('municipio', activity.municipio)
        .eq('tipo_actividad', activity.tipo_actividad)
        .eq('hora_inicio', activity.hora_inicio)
        .eq('hora_fin', activity.hora_fin)
        .in('user_id', activity.user_ids);

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
            {isEditing ? 'Editando programación' : 'Detalles de la actividad programada'}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          // Edit Mode
          <div className="space-y-4 py-4">
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

            <div className="space-y-2">
              <Label>Municipio / Lugar *</Label>
              <Input
                placeholder="Ej: Popayán Centro"
                value={editData.municipio}
                onChange={(e) => setEditData({ ...editData, municipio: e.target.value })}
              />
            </div>

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

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSaving}>
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

            {/* Report button for assigned users on today's activity */}
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
  );
}
