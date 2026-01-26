import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, MapPin, Send, CheckCircle, Clock, AlertCircle, Loader2, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ActividadesViewer } from '@/components/actividades/ActividadesViewer';

export default function Actividades() {
  const { user, role, profile } = useAuth();
  const [consultas, setConsultas] = useState('');
  const [solicitudes, setSolicitudes] = useState('');
  const [notas, setNotas] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine if user can view activity reports
  const canViewReports = role === 'jefe_ventas' || role === 'lider_zona' || 
                          role === 'coordinador_comercial' || role === 'administrador';

  // Fetch today's assignment from programacion
  const { data: todayAssignment } = useQuery({
    queryKey: ['today-assignment', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('programacion')
        .select('*')
        .eq('user_id', user.id)
        .eq('fecha', today)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch today's report if exists
  const { data: todayReport, refetch: refetchTodayReport } = useQuery({
    queryKey: ['today-report', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('reportes_diarios')
        .select('*')
        .eq('user_id', user.id)
        .eq('fecha', today)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch monthly stats
  const { data: monthlyStats } = useQuery({
    queryKey: ['monthly-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { dias: 0, total: 0 };
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const { data, error } = await supabase
        .from('reportes_diarios')
        .select('id')
        .eq('user_id', user.id)
        .gte('fecha', format(startOfMonth, 'yyyy-MM-dd'))
        .lte('fecha', format(endOfMonth, 'yyyy-MM-dd'));

      if (error) throw error;
      
      // Count working days in month (roughly)
      const workingDays = Math.floor(endOfMonth.getDate() * 5 / 7);
      
      return {
        dias: data?.length || 0,
        total: workingDays,
      };
    },
    enabled: !!user?.id,
  });

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationLoading(false);
          toast({
            title: 'Ubicación obtenida',
            description: 'Tu ubicación GPS ha sido registrada correctamente.',
          });
        },
        (error) => {
          setLocationLoading(false);
          toast({
            title: 'Error de ubicación',
            description: 'No se pudo obtener tu ubicación. Activa el GPS.',
            variant: 'destructive',
          });
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLocationLoading(false);
      toast({
        title: 'GPS no disponible',
        description: 'Tu dispositivo no soporta geolocalización.',
        variant: 'destructive',
      });
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast({
        title: 'Foto capturada',
        description: 'La evidencia ha sido registrada.',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'Debes estar autenticado para registrar actividades.',
        variant: 'destructive',
      });
      return;
    }

    if (!photo) {
      toast({
        title: 'Foto requerida',
        description: 'Debes tomar una foto de evidencia.',
        variant: 'destructive',
      });
      return;
    }

    if (!location) {
      toast({
        title: 'Ubicación requerida',
        description: 'Debes activar y registrar tu ubicación GPS.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      // Upload photo to storage (if storage is configured)
      let fotoUrl: string | null = null;
      
      // For now, we'll store a placeholder since storage might not be configured
      // In production, you'd upload to Supabase Storage
      fotoUrl = photoPreview; // Using base64 temporarily - should use storage in production

      // Insert the report
      const { error } = await supabase
        .from('reportes_diarios')
        .insert({
          user_id: user.id,
          fecha: format(new Date(), 'yyyy-MM-dd'),
          hora_registro: new Date().toISOString(),
          consultas: parseInt(consultas) || 0,
          solicitudes: parseInt(solicitudes) || 0,
          foto_url: fotoUrl,
          gps_latitud: location.lat,
          gps_longitud: location.lng,
          notas: notas || null,
        });

      if (error) throw error;

      toast({
        title: '¡Reporte enviado!',
        description: 'Tu actividad diaria ha sido registrada exitosamente.',
      });
      
      // Reset form
      setConsultas('');
      setSolicitudes('');
      setNotas('');
      setPhoto(null);
      setPhotoPreview(null);
      setLocation(null);
      
      // Refresh data
      refetchTodayReport();
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['reportes-diarios-viewer'] });
      
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast({
        title: 'Error al enviar',
        description: error.message || 'No se pudo registrar la actividad',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const activityTypeLabels = {
    punto: 'Punto Fijo',
    correria: 'Correría',
    libre: 'Libre',
  };

  // If already reported today
  const alreadyReported = !!todayReport;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Registro de Actividades</h1>
        <p className="text-muted-foreground mt-1">
          Registra tu actividad comercial diaria con evidencia fotográfica
        </p>
      </div>

      {canViewReports ? (
        <Tabs defaultValue="registro" className="space-y-4">
          <TabsList>
            <TabsTrigger value="registro" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Mi Registro
            </TabsTrigger>
            <TabsTrigger value="ver" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Ver Actividades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registro">
            <ActivityForm
              todayAssignment={todayAssignment}
              alreadyReported={alreadyReported}
              todayReport={todayReport}
              monthlyStats={monthlyStats}
              consultas={consultas}
              setConsultas={setConsultas}
              solicitudes={solicitudes}
              setSolicitudes={setSolicitudes}
              notas={notas}
              setNotas={setNotas}
              photo={photo}
              photoPreview={photoPreview}
              handlePhotoCapture={handlePhotoCapture}
              location={location}
              locationLoading={locationLoading}
              getCurrentLocation={getCurrentLocation}
              loading={loading}
              handleSubmit={handleSubmit}
              activityTypeLabels={activityTypeLabels}
            />
          </TabsContent>

          <TabsContent value="ver">
            <ActividadesViewer />
          </TabsContent>
        </Tabs>
      ) : (
        <ActivityForm
          todayAssignment={todayAssignment}
          alreadyReported={alreadyReported}
          todayReport={todayReport}
          monthlyStats={monthlyStats}
          consultas={consultas}
          setConsultas={setConsultas}
          solicitudes={solicitudes}
          setSolicitudes={setSolicitudes}
          notas={notas}
          setNotas={setNotas}
          photo={photo}
          photoPreview={photoPreview}
          handlePhotoCapture={handlePhotoCapture}
          location={location}
          locationLoading={locationLoading}
          getCurrentLocation={getCurrentLocation}
          loading={loading}
          handleSubmit={handleSubmit}
          activityTypeLabels={activityTypeLabels}
        />
      )}
    </motion.div>
  );
}

// Separate component for the activity form
interface ActivityFormProps {
  todayAssignment: any;
  alreadyReported: boolean;
  todayReport: any;
  monthlyStats: { dias: number; total: number } | undefined;
  consultas: string;
  setConsultas: (v: string) => void;
  solicitudes: string;
  setSolicitudes: (v: string) => void;
  notas: string;
  setNotas: (v: string) => void;
  photo: File | null;
  photoPreview: string | null;
  handlePhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
  location: { lat: number; lng: number } | null;
  locationLoading: boolean;
  getCurrentLocation: () => void;
  loading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  activityTypeLabels: Record<string, string>;
}

function ActivityForm({
  todayAssignment,
  alreadyReported,
  todayReport,
  monthlyStats,
  consultas,
  setConsultas,
  solicitudes,
  setSolicitudes,
  notas,
  setNotas,
  photo,
  photoPreview,
  handlePhotoCapture,
  location,
  locationLoading,
  getCurrentLocation,
  loading,
  handleSubmit,
  activityTypeLabels,
}: ActivityFormProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Today's Assignment */}
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
                  {activityTypeLabels[todayAssignment.tipo_actividad as keyof typeof activityTypeLabels] || todayAssignment.tipo_actividad}
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
                    <span>{todayAssignment.hora_inicio.slice(0, 5)} - {todayAssignment.hora_fin.slice(0, 5)}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted text-center">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No tienes actividades programadas para hoy
              </p>
            </div>
          )}

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Resumen del Mes</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-primary">{monthlyStats?.dias || 0}</p>
                <p className="text-xs text-muted-foreground">Días registrados</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-success">
                  {monthlyStats?.total ? Math.round((monthlyStats.dias / monthlyStats.total) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Cumplimiento</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Form */}
      <Card className="card-elevated lg:col-span-2">
        <CardHeader>
          <CardTitle>
            {alreadyReported ? 'Reporte del Día Enviado' : 'Nuevo Reporte Diario'}
          </CardTitle>
          <CardDescription>
            {alreadyReported 
              ? `Registrado a las ${todayReport?.hora_registro ? format(new Date(todayReport.hora_registro), 'HH:mm') : '--:--'}`
              : 'Completa todos los campos y toma una foto como evidencia'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alreadyReported ? (
            <div className="space-y-4">
              <div className="p-6 rounded-lg bg-success/10 border border-success/20 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-success mb-3" />
                <h3 className="font-semibold text-success">¡Reporte enviado exitosamente!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ya registraste tu actividad del día de hoy
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Consultas</p>
                  <p className="text-2xl font-bold">{todayReport?.consultas || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Solicitudes</p>
                  <p className="text-2xl font-bold">{todayReport?.solicitudes || 0}</p>
                </div>
              </div>
              {todayReport?.gps_latitud && todayReport?.gps_longitud && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>
                    Ubicación: {todayReport.gps_latitud.toFixed(6)}, {todayReport.gps_longitud.toFixed(6)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Photo Capture */}
              <div className="space-y-2">
                <Label>Evidencia Fotográfica *</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    photoPreview ? 'border-success bg-success/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  {photoPreview ? (
                    <div className="space-y-3">
                      <img 
                        src={photoPreview} 
                        alt="Preview" 
                        className="max-h-48 mx-auto rounded-lg object-cover"
                      />
                      <p className="text-sm font-medium text-success">Foto capturada correctamente</p>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoCapture}
                          className="hidden"
                        />
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>Tomar otra foto</span>
                        </Button>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Toma una foto desde la cámara de tu dispositivo
                      </p>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoCapture}
                          className="hidden"
                        />
                        <Button type="button" className="btn-brand" asChild>
                          <span>
                            <Camera className="mr-2 h-4 w-4" />
                            Abrir Cámara
                          </span>
                        </Button>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>Ubicación GPS *</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={getCurrentLocation}
                    disabled={locationLoading}
                    className="flex-1"
                  >
                    {locationLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Obteniendo ubicación...
                      </>
                    ) : location ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4 text-success" />
                        Ubicación registrada
                      </>
                    ) : (
                      <>
                        <MapPin className="mr-2 h-4 w-4" />
                        Registrar ubicación
                      </>
                    )}
                  </Button>
                </div>
                {location && (
                  <p className="text-xs text-muted-foreground">
                    Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                  </p>
                )}
              </div>

              {/* Activity Data */}
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
                    required
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
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notas">Notas adicionales (opcional)</Label>
                <Textarea
                  id="notas"
                  placeholder="Observaciones del día..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Submit */}
              <div className="flex items-center gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="btn-brand flex-1 md:flex-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Reporte
                    </>
                  )}
                </Button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>La hora se registra automáticamente</span>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
