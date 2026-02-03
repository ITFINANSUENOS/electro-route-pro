import { useEffect, useRef, memo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EvidenceMarker } from './EvidenceMarker';
import { MAP_CONFIG } from './types';
import type { MapMarker } from './types';

interface MapaOperacionesProps {
  markers: MapMarker[];
  height?: string;
  onMarkerClick?: (marker: MapMarker) => void;
  className?: string;
}

// Component to auto-fit bounds when markers change
function MapBoundsUpdater({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  const prevMarkersRef = useRef<number>(0);

  useEffect(() => {
    if (markers.length > 0 && markers.length !== prevMarkersRef.current) {
      const bounds = L.latLngBounds(
        markers.map(m => [m.lat, m.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      prevMarkersRef.current = markers.length;
    }
  }, [markers, map]);

  return null;
}

function MapaOperacionesComponent({ 
  markers, 
  height = '600px',
  onMarkerClick,
  className,
}: MapaOperacionesProps) {
  return (
    <div className={className} style={{ height }}>
      <MapContainer
        center={MAP_CONFIG.center}
        zoom={MAP_CONFIG.zoom}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
        className="z-0"
      >
        <TileLayer
          attribution={MAP_CONFIG.attribution}
          url={MAP_CONFIG.tileLayer}
        />
        
        <MapBoundsUpdater markers={markers} />
        
        {markers.map((marker) => (
          <EvidenceMarker 
            key={marker.id} 
            marker={marker}
            onClick={onMarkerClick}
          />
        ))}
      </MapContainer>
    </div>
  );
}

export const MapaOperaciones = memo(MapaOperacionesComponent);
