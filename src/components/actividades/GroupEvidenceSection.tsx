import { useState, useRef } from 'react';
import { Camera, CheckCircle, Clock, Loader2, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useGroupEvidence } from '@/hooks/useGroupEvidence';
import { usePhotoTimeWindows } from '@/hooks/usePhotoTimeWindows';
import { TodayAssignment } from '@/hooks/useTodayActivity';

interface GroupEvidenceSectionProps {
  todayAssignment: TodayAssignment;
}

interface PhotoCardProps {
  label: string;
  tipoFoto: string;
  canUpload: boolean;
  windowMessage: string;
  existingPhoto?: { foto_url: string; created_at: string };
  onUpload: (tipoFoto: string, file: File) => void;
  isUploading: boolean;
}

function PhotoCard({ label, tipoFoto, canUpload, windowMessage, existingPhoto, onUpload, isUploading }: PhotoCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(tipoFoto, file);
    }
  };

  if (existingPhoto) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">{label}</span>
          </div>
          <img
            src={existingPhoto.foto_url}
            alt={label}
            className="w-full h-32 object-cover rounded-md"
          />
          <p className="text-xs text-muted-foreground">
            {new Date(existingPhoto.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={canUpload ? 'border-primary/30' : 'border-muted opacity-60'}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          <Badge variant={canUpload ? 'default' : 'secondary'} className="text-xs">
            {canUpload ? 'Disponible' : 'Cerrado'}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{windowMessage}</span>
        </div>
        {canUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCapture}
              className="hidden"
            />
            <Button
              size="sm"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Camera className="h-4 w-4 mr-1" />
              )}
              Tomar Foto
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function GroupEvidenceSection({ todayAssignment }: GroupEvidenceSectionProps) {
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const isCorreria = todayAssignment.tipo_actividad === 'correria';
  const isPuntoFijo = todayAssignment.tipo_actividad === 'punto';

  const groupIdentifier = {
    fecha: todayAssignment.fecha,
    tipo_actividad: todayAssignment.tipo_actividad,
    municipio: todayAssignment.municipio,
    nombre_actividad: todayAssignment.nombre,
    hora_inicio: todayAssignment.hora_inicio,
    hora_fin: todayAssignment.hora_fin,
  };

  const { photos, uploadPhoto, getPhotoByType, completedCount } = useGroupEvidence(groupIdentifier);
  const { config, canUploadPhoto, getPhotoWindowMessage } = usePhotoTimeWindows();

  const handleUpload = async (tipoFoto: string, file: File) => {
    setUploadingType(tipoFoto);
    try {
      await uploadPhoto.mutateAsync({ tipoFoto, file });
    } finally {
      setUploadingType(null);
    }
  };

  const photoTypes = isCorreria
    ? [
        { tipoFoto: 'inicio_correria', label: config.etiquetasFotosCorreria[0] || 'Inicio del viaje' },
        { tipoFoto: 'instalacion_correria', label: config.etiquetasFotosCorreria[1] || 'Instalación en el punto' },
        { tipoFoto: 'cierre_correria', label: config.etiquetasFotosCorreria[2] || 'Cierre / Llegada al destino' },
      ]
    : isPuntoFijo
    ? [
        { tipoFoto: 'apertura_punto', label: 'Apertura (desde adentro)' },
        { tipoFoto: 'cierre_punto', label: 'Cierre (desde adentro)' },
      ]
    : [];

  const totalRequired = photoTypes.length;
  const allComplete = completedCount >= totalRequired;

  if (photoTypes.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Fotos Grupales</h3>
        </div>
        <Badge variant={allComplete ? 'default' : 'secondary'}>
          {completedCount}/{totalRequired}
        </Badge>
      </div>

      {/* Info message */}
      <Alert className="bg-muted/50">
        <Users className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Asegúrate de que todos los integrantes del grupo sean visibles en la foto. Solo un miembro necesita subir cada foto.
        </AlertDescription>
      </Alert>

      {/* Photo cards grid */}
      <div className={`grid gap-3 ${isCorreria ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {photoTypes.map(({ tipoFoto, label }) => (
          <PhotoCard
            key={tipoFoto}
            label={label}
            tipoFoto={tipoFoto}
            canUpload={canUploadPhoto(tipoFoto, todayAssignment.hora_inicio, todayAssignment.hora_fin)}
            windowMessage={getPhotoWindowMessage(tipoFoto, todayAssignment.hora_inicio, todayAssignment.hora_fin)}
            existingPhoto={getPhotoByType(tipoFoto)}
            onUpload={handleUpload}
            isUploading={uploadingType === tipoFoto}
          />
        ))}
      </div>
    </div>
  );
}
