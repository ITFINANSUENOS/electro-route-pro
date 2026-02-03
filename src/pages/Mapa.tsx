import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { MapaOperaciones } from '@/components/map/MapaOperaciones';
import { MapFilters } from '@/components/map/MapFilters';
import { useMapLocations } from '@/hooks/useMapLocations';
import type { MapFiltersState, MapMarker } from '@/components/map/types';
import { ACTIVITY_LABELS } from '@/components/map/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

  const { markers, isLoading } = useMapLocations({ filters });

  const handleClearFilters = () => {
    setFilters(initialFilters);
  };

  const handleMarkerClick = (marker: MapMarker) => {
    setSelectedMarker(marker);
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
              {Object.entries(locationGroups).map(([municipio, locationMarkers]) => (
                <div
                  key={municipio}
                  className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => locationMarkers[0] && handleMarkerClick(locationMarkers[0])}
                >
                  <div className="flex items-center justify-between mb-2">
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
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {locationMarkers.length} {locationMarkers.length === 1 ? 'reporte' : 'reportes'}
                    </span>
                  </div>
                </div>
              ))}

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
