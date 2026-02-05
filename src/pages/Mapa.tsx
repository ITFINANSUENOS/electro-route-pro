import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users, Loader2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { MapaOperaciones } from '@/components/map/MapaOperaciones';
import { MapFilters } from '@/components/map/MapFilters';
import { useMapLocations } from '@/hooks/useMapLocations';
import type { MapFiltersState, MapMarker } from '@/components/map/types';
import { ACTIVITY_LABELS } from '@/components/map/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const initialFilters: MapFiltersState = {
  dateFrom: '',
  dateTo: '',
  regionalId: 'todos',
  jefeId: 'todos',
  tipoActividad: 'todos',
};

export default function Mapa() {
  const [filters, setFilters] = useState<MapFiltersState>(initialFilters);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [highlightedMarkerId, setHighlightedMarkerId] = useState<string | null>(null);

  const { markers, isLoading } = useMapLocations({ filters });

  const handleClearFilters = () => {
    setFilters(initialFilters);
  };

  const handleMarkerClick = (marker: MapMarker) => {
    setSelectedMarker(marker);
    setHighlightedMarkerId(marker.id);
  };

  const handleLocationItemClick = (marker: MapMarker) => {
    setSelectedMarker(marker);
    setHighlightedMarkerId(marker.id);
  };

  // Group markers by location for the sidebar
  const locationGroups = markers.reduce((acc, marker) => {
    const key = marker.municipio;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(marker);
    return acc;
  }, {} as Record<string, MapMarker[]>);

  const getLocationStatus = (markers: MapMarker[]): 'success' | 'warning' | 'danger' => {
    const completeCount = markers.filter(m => {
      const isCorreria = m.tipo_actividad === 'correria';
      return isCorreria ? m.has_photo && m.has_gps : m.has_gps;
    }).length;

    if (completeCount === markers.length) return 'success';
    if (completeCount > 0) return 'warning';
    return 'danger';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mapa de Operaciones</h1>
        <p className="text-muted-foreground mt-1">
          Visualiza la ubicación del equipo comercial en tiempo real
        </p>
      </div>

      {/* Filters */}
      <MapFilters 
        filters={filters} 
        onChange={setFilters} 
        onClear={handleClearFilters}
      />

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Map */}
        <Card className="card-elevated lg:col-span-3">
          <CardContent className="p-0 overflow-hidden rounded-xl">
            {isLoading ? (
              <div className="h-[600px] flex items-center justify-center bg-muted/20">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Cargando ubicaciones...</p>
                </div>
              </div>
            ) : markers.length === 0 ? (
              <div className="h-[600px] flex items-center justify-center bg-muted/20">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-10 w-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Sin ubicaciones registradas
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                      No hay evidencias con coordenadas GPS para los filtros seleccionados.
                      Intenta ajustar los filtros o verificar que los asesores hayan registrado sus ubicaciones.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <MapaOperaciones 
                markers={markers}
                height="600px"
                onMarkerClick={handleMarkerClick}
                highlightedMarkerId={highlightedMarkerId || undefined}
              />
            )}
          </CardContent>
        </Card>

        {/* Locations List */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-secondary" />
              Ubicaciones Activas
            </CardTitle>
            <CardDescription>
              {Object.keys(locationGroups).length} municipios con actividad
              {markers.length > 0 && ` (${markers.length} reportes)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[450px] overflow-y-auto">
              {Object.entries(locationGroups).map(([municipio, locationMarkers]) => {
                const isAnyHighlighted = locationMarkers.some(m => m.id === highlightedMarkerId);
                
                return (
                  <div key={municipio} className="space-y-1">
                    {/* Municipio Header */}
                    <div className="p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{municipio}</span>
                        <StatusBadge
                          status={getLocationStatus(locationMarkers)}
                          size="sm"
                          label={
                            getLocationStatus(locationMarkers) === 'success' ? 'OK' :
                            getLocationStatus(locationMarkers) === 'warning' ? 'Parcial' : 'Pendiente'
                          }
                        />
                      </div>
                    </div>
                    
                    {/* Individual Location Items */}
                    {locationMarkers.map((marker) => {
                      const isHighlighted = marker.id === highlightedMarkerId;
                      const markerStatus = (() => {
                        const isCorreria = marker.tipo_actividad === 'correria';
                        const hasComplete = isCorreria ? marker.has_photo && marker.has_gps : marker.has_gps;
                        return hasComplete ? 'success' : marker.has_photo || marker.has_gps ? 'warning' : 'danger';
                      })();
                      
                      return (
                        <div
                          key={marker.id}
                          onClick={() => handleLocationItemClick(marker)}
                          className={cn(
                            "p-2 pl-4 rounded-lg border cursor-pointer transition-all",
                            isHighlighted 
                              ? "bg-destructive/10 border-destructive shadow-sm" 
                              : "bg-card hover:shadow-sm hover:border-primary/30"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm font-medium truncate",
                                isHighlighted && "text-destructive"
                              )}>
                                {marker.user_name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {ACTIVITY_LABELS[marker.tipo_actividad]} • {
                                  (() => {
                                    try {
                                      return format(new Date(marker.hora_registro), 'h:mm a');
                                    } catch { return marker.hora_registro; }
                                  })()
                                }
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "h-2.5 w-2.5 rounded-full",
                                markerStatus === 'success' && "bg-success",
                                markerStatus === 'warning' && "bg-warning",
                                markerStatus === 'danger' && "bg-danger"
                              )} />
                              <ChevronRight className={cn(
                                "h-4 w-4",
                                isHighlighted ? "text-destructive" : "text-muted-foreground"
                              )} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {Object.keys(locationGroups).length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay ubicaciones para mostrar
                </p>
              )}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t space-y-2">
              <h4 className="text-sm font-medium">Leyenda</h4>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-success" />
                  <span>Evidencia completa</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-warning" />
                  <span>Evidencia parcial</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-danger" />
                  <span>Sin evidencia</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected marker info */}
      {selectedMarker && (
        <Card className="border-secondary bg-secondary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <p className="font-medium text-foreground">{selectedMarker.user_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedMarker.municipio} • {ACTIVITY_LABELS[selectedMarker.tipo_actividad]}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(selectedMarker.fecha + 'T12:00:00'), "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  Lat: {selectedMarker.lat.toFixed(6)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Lng: {selectedMarker.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
