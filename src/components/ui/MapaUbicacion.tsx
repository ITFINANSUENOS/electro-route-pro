import { useEffect, useRef, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';

// Fix for default marker icons in Vite/webpack - use URL strings
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapaUbicacionProps {
  lat: number;
  lng: number;
  zoom?: number;
  popup?: string;
  className?: string;
  height?: string;
}

function MapaUbicacionComponent({ 
  lat, 
  lng, 
  zoom = 15, 
  popup,
  className,
  height = '300px',
}: MapaUbicacionProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerIdRef = useRef(`map-${Math.random().toString(36).substr(2, 9)}`);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Validate coordinates
    if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn('Invalid coordinates provided to MapaUbicacion:', { lat, lng });
      return;
    }

    // Clean up any existing map
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    try {
      // Create map
      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: zoom,
        scrollWheelZoom: false,
      });
      mapRef.current = map;
      initializedRef.current = true;

      // Add tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Add marker with default icon
      const marker = L.marker([lat, lng], { icon: defaultIcon }).addTo(map);
      
      if (popup) {
        marker.bindPopup(popup).openPopup();
      }

      // Force map to recalculate size after render
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    } catch (error) {
      console.error('Error initializing MapaUbicacion:', error);
    }

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          // Ignore cleanup errors
        }
        finally {
          mapRef.current = null;
          initializedRef.current = false;
        }
      }
    };
  }, [lat, lng, zoom, popup]);

  return (
    <div 
      ref={containerRef}
      id={containerIdRef.current}
      className={cn('rounded-lg overflow-hidden border border-border', className)}
      style={{ height, width: '100%' }}
    />
  );
}

export const MapaUbicacion = memo(MapaUbicacionComponent);
export default MapaUbicacion;
