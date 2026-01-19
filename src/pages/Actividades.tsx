import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, MapPin, Send, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { StatusBadge } from '@/components/ui/status-badge';

export default function Actividades() {
  const [consultas, setConsultas] = useState('');
  const [solicitudes, setSolicitudes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const { toast } = useToast();

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
        }
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

  const handleCapture = () => {
    // Simulated photo capture - in production, use device camera
    setPhoto('/placeholder.svg');
    toast({
      title: 'Foto capturada',
      description: 'La evidencia ha sido registrada.',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: '¡Reporte enviado!',
      description: 'Tu actividad diaria ha sido registrada exitosamente.',
    });
    
    // Reset form
    setConsultas('');
    setSolicitudes('');
    setPhoto(null);
    setLocation(null);
    setLoading(false);
  };

  // Mock today's assignment
  const todayAssignment = {
    type: 'Punto Fijo',
    location: 'Almacén Centro - Popayán',
    timeRange: '8:00 AM - 5:00 PM',
    status: 'active' as const,
  };

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
            <div className="p-4 rounded-lg bg-accent">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-accent-foreground">
                  {todayAssignment.type}
                </span>
                <StatusBadge status="success" label="Activo" size="sm" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{todayAssignment.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{todayAssignment.timeRange}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Resumen del Mes</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-primary">18</p>
                  <p className="text-xs text-muted-foreground">Días registrados</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-success">95%</p>
                  <p className="text-xs text-muted-foreground">Cumplimiento</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Form */}
        <Card className="card-elevated lg:col-span-2">
          <CardHeader>
            <CardTitle>Nuevo Reporte Diario</CardTitle>
            <CardDescription>
              Completa todos los campos y toma una foto como evidencia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Photo Capture */}
              <div className="space-y-2">
                <Label>Evidencia Fotográfica *</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    photo ? 'border-success bg-success/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  {photo ? (
                    <div className="space-y-3">
                      <CheckCircle className="h-12 w-12 mx-auto text-success" />
                      <p className="text-sm font-medium text-success">Foto capturada correctamente</p>
                      <Button type="button" variant="outline" size="sm" onClick={handleCapture}>
                        Tomar otra foto
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Toma una foto desde la cámara de tu dispositivo
                      </p>
                      <Button type="button" onClick={handleCapture} className="btn-brand">
                        <Camera className="mr-2 h-4 w-4" />
                        Abrir Cámara
                      </Button>
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
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
