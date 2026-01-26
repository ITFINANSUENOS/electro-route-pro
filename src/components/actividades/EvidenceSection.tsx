import { useState } from 'react';
import { Camera, MapPin, CheckCircle, Loader2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TodayAssignment } from '@/hooks/useTodayActivity';
import { useToast } from '@/hooks/use-toast';

interface EvidenceSectionProps {
  todayAssignment: TodayAssignment;
  canUploadEvidence: boolean;
  evidenceTimeMessage: string;
  hasEvidenceSubmitted: boolean;
  onSubmitEvidence: (data: {
    photoUrl: string;
    latitude: number;
    longitude: number;
    notas?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export function EvidenceSection({
  todayAssignment,
  canUploadEvidence,
  evidenceTimeMessage,
  hasEvidenceSubmitted,
  onSubmitEvidence,
  isSubmitting,
}: EvidenceSectionProps) {
  const { toast } = useToast();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [notas, setNotas] = useState('');

  // Determine required evidence based on activity type
  const isCorreria = todayAssignment.tipo_actividad === 'correria';
  const isPuntoFijo = todayAssignment.tipo_actividad === 'punto';
  
  // Correría requires both photo and GPS, Punto Fijo only requires location
  const requiresPhoto = isCorreria;
  const requiresLocation = isCorreria || isPuntoFijo;

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
        description: 'La evidencia fotográfica ha sido registrada.',
      });
    }
  };

  const handleSubmit = async () => {
    // Validate requirements based on activity type
    if (requiresPhoto && !photoPreview) {
      toast({
        title: 'Foto requerida',
        description: 'Para correría debes tomar una foto de evidencia.',
        variant: 'destructive',
      });
      return;
    }

    if (requiresLocation && !location) {
      toast({
        title: 'Ubicación requerida',
        description: 'Debes registrar tu ubicación GPS.',
        variant: 'destructive',
      });
      return;
    }

    await onSubmitEvidence({
      photoUrl: photoPreview || '',
      latitude: location?.lat || 0,
      longitude: location?.lng || 0,
      notas: notas || undefined,
    });

    // Reset form after successful submission
    setPhoto(null);
    setPhotoPreview(null);
    setLocation(null);
    setNotas('');
  };

  // Already submitted evidence
  if (hasEvidenceSubmitted) {
    return (
      <div className="space-y-4">
        <div className="p-6 rounded-lg bg-success/10 border border-success/20 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-success mb-3" />
          <h3 className="font-semibold text-success">Evidencia registrada</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ya registraste la evidencia de esta actividad
          </p>
        </div>
      </div>
    );
  }

  // Outside time window
  if (!canUploadEvidence) {
    return (
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          {evidenceTimeMessage}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>{evidenceTimeMessage}</span>
      </div>

      {/* Photo section - only for Correría */}
      {requiresPhoto && (
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
      )}

      {/* Location section */}
      {requiresLocation && (
        <div className="space-y-2">
          <Label>
            {isPuntoFijo ? 'Marcar Ubicación *' : 'Ubicación GPS *'}
          </Label>
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
                  {isPuntoFijo ? 'Marcar mi ubicación' : 'Registrar ubicación'}
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
      )}

      {/* Notes section */}
      <div className="space-y-2">
        <Label htmlFor="notas">Notas adicionales (opcional)</Label>
        <Textarea
          id="notas"
          placeholder="Observaciones de la actividad..."
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
        />
      </div>

      {/* Submit button */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="btn-brand w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Registrando...
          </>
        ) : (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Registrar Evidencia
          </>
        )}
      </Button>
    </div>
  );
}
