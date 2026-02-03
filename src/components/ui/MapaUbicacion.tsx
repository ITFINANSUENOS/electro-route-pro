import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';

// Fix for default marker icons in Vite/webpack
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

interface MapaUbicacionProps {
  lat: number;
  lng: number;
  zoom?: number;
  popup?: string;
  className?: string;
  height?: string;
}

export function MapaUbicacion({ 
  lat, 
  lng, 
  zoom = 15, 
  popup,
  className,
  height = '300px',
}: MapaUbicacionProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up any existing map
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Create map
    const map = L.map(containerRef.current).setView([lat, lng], zoom);
    mapRef.current = map;

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Add marker
    const marker = L.marker([lat, lng]).addTo(map);
    
    if (popup) {
      marker.bindPopup(popup).openPopup();
    }

    // Force map to recalculate size
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng, zoom, popup]);

  return (
    <div 
      ref={containerRef}
      className={cn('rounded-lg overflow-hidden border border-border', className)}
      style={{ height, width: '100%' }}
    />
  );
}

export default MapaUbicacion;
