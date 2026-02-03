import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Camera, MapPin, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { MapMarker } from './types';
import { ACTIVITY_LABELS } from './types';

// Create custom colored icons
const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const ICONS = {
  success: createColoredIcon('hsl(142, 71%, 45%)'), // Green
  warning: createColoredIcon('hsl(38, 92%, 50%)'),  // Yellow
  danger: createColoredIcon('hsl(0, 84%, 60%)'),    // Red
};

interface EvidenceMarkerProps {
  marker: MapMarker;
  onClick?: (marker: MapMarker) => void;
}

export function EvidenceMarker({ marker, onClick }: EvidenceMarkerProps) {
  // Determine status based on evidence
  const isCorriera = marker.tipo_actividad === 'correria';
  const hasCompleteEvidence = isCorriera 
    ? marker.has_photo && marker.has_gps 
    : marker.has_gps;
  const hasPartialEvidence = !hasCompleteEvidence && (marker.has_photo || marker.has_gps);

  const status = hasCompleteEvidence ? 'success' : hasPartialEvidence ? 'warning' : 'danger';
  const icon = ICONS[status];

  const formatHora = (hora: string) => {
    try {
      const date = new Date(hora);
      return format(date, 'h:mm a', { locale: es });
    } catch {
      return hora;
    }
  };

  const formatFecha = (fecha: string) => {
    try {
      const date = new Date(fecha + 'T12:00:00');
      return format(date, "d 'de' MMM yyyy", { locale: es });
    } catch {
      return fecha;
    }
  };

  return (
    <Marker 
      position={[marker.lat, marker.lng]} 
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(marker),
      }}
    >
      <Popup>
        <div className="min-w-[200px] p-1">
          {/* User name */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">👤</span>
            <span className="font-semibold text-foreground">{marker.user_name}</span>
          </div>

          {/* Municipio */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <MapPin className="h-4 w-4" />
            <span>{marker.municipio}</span>
          </div>

          {/* Activity type */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span className="text-base">🏷️</span>
            <span>{ACTIVITY_LABELS[marker.tipo_actividad] || marker.tipo_actividad}</span>
          </div>

          {/* Time and date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            <span>{formatHora(marker.hora_registro)} - {formatFecha(marker.fecha)}</span>
          </div>

          {/* Evidence status */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {hasCompleteEvidence ? (
              <>
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm text-success font-medium">Evidencia completa</span>
              </>
            ) : hasPartialEvidence ? (
              <>
                <Camera className="h-4 w-4 text-warning" />
                <span className="text-sm text-warning font-medium">Evidencia parcial</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive font-medium">Sin evidencia</span>
              </>
            )}
          </div>

          {/* Regional if available */}
          {marker.regional_name && (
            <div className="text-xs text-muted-foreground mt-2 pt-1 border-t">
              Regional: {marker.regional_name}
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
