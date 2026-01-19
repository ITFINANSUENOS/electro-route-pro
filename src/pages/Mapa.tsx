import { motion } from 'framer-motion';
import { MapPin, Users, Target, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

// Mock data for map markers
const locations = [
  { id: 1, name: 'Popayán Centro', lat: 2.4419, lng: -76.6061, advisors: 5, status: 'success' as const },
  { id: 2, name: 'Santander de Quilichao', lat: 3.0094, lng: -76.4839, advisors: 3, status: 'warning' as const },
  { id: 3, name: 'Timbío', lat: 2.3544, lng: -76.6819, advisors: 2, status: 'success' as const },
  { id: 4, name: 'El Bordo', lat: 2.0989, lng: -77.0036, advisors: 2, status: 'danger' as const },
  { id: 5, name: 'Puerto Tejada', lat: 3.2317, lng: -76.4175, advisors: 1, status: 'success' as const },
];

export default function Mapa() {
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

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Map Placeholder */}
        <Card className="card-elevated lg:col-span-3">
          <CardContent className="p-0">
            <div className="relative h-[600px] bg-gradient-to-br from-accent via-background to-muted rounded-lg overflow-hidden">
              {/* Placeholder for Google Maps integration */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-10 w-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Integración con Google Maps
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                      El mapa interactivo mostrará las ubicaciones de los asesores comerciales
                      y permitirá validar la geolocalización de las actividades registradas.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mock location pins */}
              <div className="absolute top-1/4 left-1/3">
                <div className="relative">
                  <div className="h-8 w-8 bg-success rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
                    5
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-success" />
                </div>
              </div>

              <div className="absolute top-1/3 right-1/4">
                <div className="relative">
                  <div className="h-8 w-8 bg-warning rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
                    3
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-warning" />
                </div>
              </div>

              <div className="absolute bottom-1/3 left-1/4">
                <div className="relative">
                  <div className="h-8 w-8 bg-danger rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
                    2
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-danger" />
                </div>
              </div>
            </div>
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
              {locations.length} puntos con actividad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{location.name}</span>
                    <StatusBadge
                      status={location.status}
                      size="sm"
                      label={
                        location.status === 'success' ? 'OK' :
                        location.status === 'warning' ? 'Alerta' : 'Riesgo'
                      }
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {location.advisors} asesores
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t space-y-2">
              <h4 className="text-sm font-medium">Leyenda</h4>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-success" />
                  <span>Cumpliendo meta</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-warning" />
                  <span>En riesgo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-danger" />
                  <span>Sin actividad</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Banner */}
      <Card className="border-warning bg-warning/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Integración con Google Maps pendiente
              </p>
              <p className="text-xs text-muted-foreground">
                Se requiere configurar la API Key de Google Maps para habilitar el mapa interactivo
                con validación de ubicaciones.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
