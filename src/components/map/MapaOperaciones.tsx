import { useEffect, useRef, memo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CONFIG } from './types';
import type { MapMarker } from './types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Create custom colored icons
const createColoredIcon = (color: string, size: number = 24) => {
  const innerSize = Math.round(size / 3);
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: ${innerSize}px;
          height: ${innerSize}px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const ICONS = {
  success: createColoredIcon('hsl(142, 71%, 45%)'), // Green
  warning: createColoredIcon('hsl(38, 92%, 50%)'),  // Yellow
  danger: createColoredIcon('hsl(0, 84%, 60%)'),    // Red
  highlighted: createColoredIcon('hsl(0, 84%, 50%)', 36), // Red larger for highlight
};

const ACTIVITY_LABELS: Record<string, string> = {
  punto: 'Punto Fijo',
  correria: 'Correría',
  libre: 'Libre',
};

function getMarkerStatus(marker: MapMarker): 'success' | 'warning' | 'danger' {
  const isCorreria = marker.tipo_actividad === 'correria';
  const hasCompleteEvidence = isCorreria 
    ? marker.has_photo && marker.has_gps 
    : marker.has_gps;
  const hasPartialEvidence = !hasCompleteEvidence && (marker.has_photo || marker.has_gps);
  
  return hasCompleteEvidence ? 'success' : hasPartialEvidence ? 'warning' : 'danger';
}

function createPopupContent(marker: MapMarker): string {
  const status = getMarkerStatus(marker);
  const statusLabel = status === 'success' ? 'Evidencia completa' : 
                      status === 'warning' ? 'Evidencia parcial' : 'Sin evidencia';
  const statusColor = status === 'success' ? '#22c55e' : 
                      status === 'warning' ? '#f59e0b' : '#ef4444';
  
  let fechaFormatted = marker.fecha;
  try {
    const date = new Date(marker.fecha + 'T12:00:00');
    fechaFormatted = format(date, "d 'de' MMM yyyy", { locale: es });
  } catch {}

  let horaFormatted = marker.hora_registro;
  try {
    const date = new Date(marker.hora_registro);
    horaFormatted = format(date, 'h:mm a', { locale: es });
  } catch {}

  return `
    <div style="min-width: 200px; padding: 4px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="font-size: 18px;">👤</span>
        <span style="font-weight: 600;">${marker.user_name}</span>
      </div>
      <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
        📍 ${marker.municipio}
      </div>
      <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
        🏷️ ${ACTIVITY_LABELS[marker.tipo_actividad] || marker.tipo_actividad}
      </div>
      <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
        🕐 ${horaFormatted} - ${fechaFormatted}
      </div>
      <div style="display: flex; align-items: center; gap: 6px; padding-top: 8px; border-top: 1px solid #eee;">
        <span style="width: 12px; height: 12px; border-radius: 50%; background-color: ${statusColor};"></span>
        <span style="font-size: 13px; font-weight: 500; color: ${statusColor};">${statusLabel}</span>
      </div>
      ${marker.regional_name ? `
        <div style="font-size: 11px; color: #999; margin-top: 8px; padding-top: 4px; border-top: 1px solid #eee;">
          Regional: ${marker.regional_name}
        </div>
      ` : ''}
    </div>
  `;
}

interface MapaOperacionesProps {
  markers: MapMarker[];
  height?: string;
  onMarkerClick?: (marker: MapMarker) => void;
  className?: string;
  highlightedMarkerId?: string;
}

function MapaOperacionesComponent({ 
  markers, 
  height = '600px',
  onMarkerClick,
  className,
  highlightedMarkerId,
}: MapaOperacionesProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markerRefsMap = useRef<Map<string, L.Marker>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up existing map
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    try {
      // Create map
      const map = L.map(containerRef.current, {
        center: MAP_CONFIG.center,
        zoom: MAP_CONFIG.zoom,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom,
      });
      mapRef.current = map;

      // Add tile layer
      L.tileLayer(MAP_CONFIG.tileLayer, {
        attribution: MAP_CONFIG.attribution,
      }).addTo(map);

      // Create markers layer
      markersLayerRef.current = L.layerGroup().addTo(map);

      // Force recalculate size
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {}
        mapRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // Update markers when they change
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();
    markerRefsMap.current.clear();

    if (markers.length > 0) {
      // Add new markers
      markers.forEach((marker) => {
        const isHighlighted = highlightedMarkerId === marker.id;
        const status = getMarkerStatus(marker);
        const icon = isHighlighted ? ICONS.highlighted : ICONS[status];
        
        const leafletMarker = L.marker([marker.lat, marker.lng], { icon })
          .bindPopup(createPopupContent(marker));
        
        if (onMarkerClick) {
          leafletMarker.on('click', () => onMarkerClick(marker));
        }
        
        markersLayerRef.current?.addLayer(leafletMarker);
        markerRefsMap.current.set(marker.id, leafletMarker);
        
        // Open popup if highlighted
        if (isHighlighted) {
          leafletMarker.openPopup();
        }
      });

      // Fit bounds to show all markers
      try {
        const bounds = L.latLngBounds(
          markers.map(m => [m.lat, m.lng] as [number, number])
        );
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
      } catch (error) {
        console.warn('Error fitting map bounds:', error);
      }
    }
  }, [markers, onMarkerClick, highlightedMarkerId]);

  // Pan to highlighted marker when it changes
  useEffect(() => {
    if (!mapRef.current || !highlightedMarkerId) return;
    
    const leafletMarker = markerRefsMap.current.get(highlightedMarkerId);
    if (leafletMarker) {
      const latLng = leafletMarker.getLatLng();
      mapRef.current.setView(latLng, 14, { animate: true });
      leafletMarker.openPopup();
    }
  }, [highlightedMarkerId]);

  // Don't render map if no markers - show placeholder instead
  if (markers.length === 0) {
    return (
      <div className={className} style={{ height }}>
        <div className="h-full w-full flex items-center justify-center bg-muted/20 rounded-xl">
          <p className="text-sm text-muted-foreground">No hay ubicaciones para mostrar en el mapa</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={className}
      style={{ height, width: '100%', borderRadius: '0.75rem', overflow: 'hidden' }}
    />
  );
}

export const MapaOperaciones = memo(MapaOperacionesComponent);
