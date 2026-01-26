import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Calendar, MapPin, Camera, Clock, User, Users, Filter, X, Building2, Search, CheckCircle, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ReporteDiario {
  id: string;
  user_id: string;
  fecha: string;
  hora_registro: string;
  consultas: number | null;
  solicitudes: number | null;
  foto_url: string | null;
  gps_latitud: number | null;
  gps_longitud: number | null;
  notas: string | null;
  created_at: string;
}

interface Programacion {
  id: string;
  user_id: string;
  fecha: string;
  tipo_actividad: 'punto' | 'correria' | 'libre';
  municipio: string;
  nombre: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
}

interface Profile {
  id: string;
  user_id: string;
  nombre_completo: string;
  codigo_asesor: string | null;
  codigo_jefe: string | null;
  regional_id: string | null;
  tipo_asesor: string | null;
}

const activityColors = {
  punto: 'bg-primary text-primary-foreground',
  correria: 'bg-secondary text-secondary-foreground',
  libre: 'bg-muted text-muted-foreground',
};

const activityLabels = {
  punto: 'Punto Fijo',
  correria: 'Correría',
  libre: 'Libre',
};

export function ActividadesViewer() {
  const { role, profile } = useAuth();
  const [selectedRegional, setSelectedRegional] = useState<string>('todos');
  const [selectedJefe, setSelectedJefe] = useState<string>('todos');
  const [selectedTipo, setSelectedTipo] = useState<string>('todos');
  const [searchDate, setSearchDate] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<{
    programacion: Programacion;
    reportes: ReporteDiario[];
    profiles: Profile[];
  } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showOnlyWithEvidence, setShowOnlyWithEvidence] = useState(false);

  // Fetch regionales
  const { data: regionales = [] } = useQuery({
    queryKey: ['regionales-actividades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regionales')
        .select('*')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch jefes de ventas
  const { data: jefesVentas = [] } = useQuery({
    queryKey: ['jefes-ventas-actividades', selectedRegional],
    queryFn: async () => {
      let query = supabase
        .from('jefes_ventas')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (selectedRegional !== 'todos') {
        query = query.eq('regional_id', selectedRegional);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-actividades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, nombre_completo, codigo_asesor, codigo_jefe, regional_id, tipo_asesor')
        .eq('activo', true);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch programaciones
  const { data: programaciones = [], isLoading: loadingProgramaciones } = useQuery({
    queryKey: ['programaciones-actividades', selectedRegional, selectedJefe, selectedTipo, searchDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programacion')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch reportes diarios
  const { data: reportes = [], isLoading: loadingReportes } = useQuery({
    queryKey: ['reportes-diarios-viewer'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reportes_diarios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // Create a map of user_id to profile
  const profilesMap = useMemo(() => {
    const map = new Map<string, Profile>();
    profiles.forEach(p => map.set(p.user_id, p));
    return map;
  }, [profiles]);

  // Create a map of regional names
  const regionalesMap = useMemo(() => {
    const map = new Map<string, string>();
    regionales.forEach(r => map.set(r.id, r.nombre));
    return map;
  }, [regionales]);

  // Filter programaciones based on filters
  const filteredProgramaciones = useMemo(() => {
    return programaciones.filter(prog => {
      const userProfile = profilesMap.get(prog.user_id);
      if (!userProfile) return false;

      // Filter by regional
      if (selectedRegional !== 'todos' && userProfile.regional_id !== selectedRegional) {
        return false;
      }

      // Filter by jefe
      if (selectedJefe !== 'todos' && userProfile.codigo_jefe !== selectedJefe) {
        return false;
      }

      // Filter by type
      if (selectedTipo !== 'todos' && prog.tipo_actividad !== selectedTipo) {
        return false;
      }

      // Filter by date
      if (searchDate && prog.fecha !== searchDate) {
        return false;
      }

      // Filter by search text
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const matchesName = userProfile.nombre_completo.toLowerCase().includes(searchLower);
        const matchesMunicipio = prog.municipio.toLowerCase().includes(searchLower);
        const matchesNombre = prog.nombre?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesMunicipio && !matchesNombre) {
          return false;
        }
      }

      return true;
    });
  }, [programaciones, profilesMap, selectedRegional, selectedJefe, selectedTipo, searchDate, searchText]);

  // Group programaciones by key
  const groupedActivities = useMemo(() => {
    const groups = new Map<string, {
      programaciones: Programacion[];
      profiles: Profile[];
      reportes: ReporteDiario[];
    }>();

    filteredProgramaciones.forEach(prog => {
      const key = `${prog.fecha}-${prog.tipo_actividad}-${prog.municipio}-${prog.hora_inicio}-${prog.hora_fin}-${prog.nombre || ''}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          programaciones: [],
          profiles: [],
          reportes: [],
        });
      }

      const group = groups.get(key)!;
      group.programaciones.push(prog);
      
      const userProfile = profilesMap.get(prog.user_id);
      if (userProfile && !group.profiles.find(p => p.user_id === prog.user_id)) {
        group.profiles.push(userProfile);
      }

      // Add related reportes
      const relatedReportes = reportes.filter(
        r => r.user_id === prog.user_id && r.fecha === prog.fecha
      );
      relatedReportes.forEach(r => {
        if (!group.reportes.find(rep => rep.id === r.id)) {
          group.reportes.push(r);
        }
      });
    });

    let result = Array.from(groups.entries()).map(([key, value]) => ({
      key,
      ...value.programaciones[0],
      users: value.profiles,
      reportes: value.reportes,
      isGroup: value.profiles.length > 1,
    }));

    // Filter by evidence if toggle is active
    if (showOnlyWithEvidence) {
      result = result.filter(activity => activity.reportes.length > 0);
    }

    return result;
  }, [filteredProgramaciones, profilesMap, reportes, showOnlyWithEvidence]);

  const handleActivityClick = (activity: typeof groupedActivities[0]) => {
    const relatedProgramaciones = programaciones.filter(
      p => p.fecha === activity.fecha && 
           p.tipo_actividad === activity.tipo_actividad &&
           p.municipio === activity.municipio &&
           p.hora_inicio === activity.hora_inicio &&
           p.hora_fin === activity.hora_fin
    );
    
    const relatedProfiles = relatedProgramaciones.map(p => profilesMap.get(p.user_id)).filter(Boolean) as Profile[];
    
    const relatedReportes = reportes.filter(r => 
      relatedProgramaciones.some(p => p.user_id === r.user_id && p.fecha === r.fecha)
    );

    setSelectedActivity({
      programacion: activity,
      reportes: relatedReportes,
      profiles: relatedProfiles,
    });
  };

  const clearFilters = () => {
    setSelectedRegional('todos');
    setSelectedJefe('todos');
    setSelectedTipo('todos');
    setSearchDate('');
    setSearchText('');
  };

  const hasActiveFilters = selectedRegional !== 'todos' || selectedJefe !== 'todos' || 
                           selectedTipo !== 'todos' || searchDate || searchText;

  const isLoading = loadingProgramaciones || loadingReportes;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Actividades
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nombre, municipio..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Date filter */}
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                />
              </div>

              {/* Regional filter */}
              <div className="space-y-2">
                <Label>Regional</Label>
                <Select value={selectedRegional} onValueChange={(v) => {
                  setSelectedRegional(v);
                  setSelectedJefe('todos');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las regionales" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las regionales</SelectItem>
                    {regionales.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Jefe filter */}
              <div className="space-y-2">
                <Label>Jefe de Ventas</Label>
                <Select value={selectedJefe} onValueChange={setSelectedJefe}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los jefes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los jefes</SelectItem>
                    {jefesVentas.map((j) => (
                      <SelectItem key={j.id} value={j.codigo}>{j.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type filter */}
              <div className="space-y-2">
                <Label>Tipo de Actividad</Label>
                <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los tipos</SelectItem>
                    <SelectItem value="punto">Punto Fijo</SelectItem>
                    <SelectItem value="correria">Correría</SelectItem>
                    <SelectItem value="libre">Libre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Filtros activos:</span>
                {selectedRegional !== 'todos' && (
                  <Badge variant="secondary">
                    Regional: {regionalesMap.get(selectedRegional) || selectedRegional}
                  </Badge>
                )}
                {selectedJefe !== 'todos' && (
                  <Badge variant="secondary">
                    Jefe: {jefesVentas.find(j => j.codigo === selectedJefe)?.nombre || selectedJefe}
                  </Badge>
                )}
                {selectedTipo !== 'todos' && (
                  <Badge variant="secondary">
                    Tipo: {activityLabels[selectedTipo as keyof typeof activityLabels]}
                  </Badge>
                )}
                {searchDate && (
                  <Badge variant="secondary">
                    Fecha: {format(new Date(searchDate + 'T12:00:00'), 'dd/MM/yyyy')}
                  </Badge>
                )}
                {searchText && (
                  <Badge variant="secondary">
                    Búsqueda: {searchText}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Results header with toggle */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {groupedActivities.length} actividades encontradas
        </p>
        <div className="flex items-center gap-2">
          <Label htmlFor="evidence-toggle" className="text-sm text-muted-foreground cursor-pointer">
            Solo con evidencia
          </Label>
          <Switch
            id="evidence-toggle"
            checked={showOnlyWithEvidence}
            onCheckedChange={setShowOnlyWithEvidence}
          />
          {showOnlyWithEvidence && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Con evidencia
            </Badge>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : groupedActivities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No hay actividades</h3>
            <p className="text-muted-foreground">
              No se encontraron actividades con los filtros seleccionados
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groupedActivities.map((activity) => {
            const userProfile = profilesMap.get(activity.user_id);
            const regionalName = userProfile?.regional_id ? regionalesMap.get(userProfile.regional_id) : null;
            const hasEvidencia = activity.reportes.length > 0;

            return (
              <Card 
                key={activity.key} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleActivityClick(activity)}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header with badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Badge className={activityColors[activity.tipo_actividad]}>
                      {activityLabels[activity.tipo_actividad]}
                    </Badge>
                    {regionalName && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {regionalName}
                      </Badge>
                    )}
                  </div>

                  {/* Activity info */}
                  <div className="space-y-2">
                    {activity.nombre && (
                      <p className="font-medium">{activity.nombre}</p>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(activity.fecha + 'T12:00:00'), 'EEEE d MMMM yyyy', { locale: es })}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{activity.municipio}</span>
                    </div>

                    {activity.hora_inicio && activity.hora_fin && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{activity.hora_inicio.slice(0, 5)} - {activity.hora_fin.slice(0, 5)}</span>
                      </div>
                    )}
                  </div>

                  {/* Users */}
                  <div className="flex items-center gap-2 text-sm">
                    {activity.isGroup ? (
                      <>
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Grupo ({activity.users.length} asesores)</span>
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{activity.users[0]?.nombre_completo || 'Sin asignar'}</span>
                      </>
                    )}
                  </div>

                  {/* Evidence indicator */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    {hasEvidencia ? (
                      <Badge variant="default" className="bg-success text-success-foreground">
                        <Camera className="h-3 w-3 mr-1" />
                        Evidencia registrada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <Camera className="h-3 w-3 mr-1" />
                        Sin evidencia
                      </Badge>
                    )}
                    {activity.reportes.some(r => r.gps_latitud && r.gps_longitud) && (
                      <Badge variant="outline" className="text-primary">
                        <MapPin className="h-3 w-3 mr-1" />
                        GPS
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Activity Detail Dialog */}
      <Dialog open={!!selectedActivity} onOpenChange={() => setSelectedActivity(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Detalle de Actividad
            </DialogTitle>
            <DialogDescription>
              Información completa de la actividad y evidencias registradas
            </DialogDescription>
          </DialogHeader>
          
          {selectedActivity && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 pr-4">
                {/* Activity Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={activityColors[selectedActivity.programacion.tipo_actividad]}>
                      {activityLabels[selectedActivity.programacion.tipo_actividad]}
                    </Badge>
                    {selectedActivity.profiles[0]?.regional_id && (
                      <Badge variant="outline">
                        <Building2 className="h-3 w-3 mr-1" />
                        {regionalesMap.get(selectedActivity.profiles[0].regional_id)}
                      </Badge>
                    )}
                  </div>

                  {selectedActivity.programacion.nombre && (
                    <h3 className="text-lg font-semibold">{selectedActivity.programacion.nombre}</h3>
                  )}

                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(selectedActivity.programacion.fecha + 'T12:00:00'), 'EEEE d MMMM yyyy', { locale: es })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedActivity.programacion.municipio}</span>
                    </div>
                    {selectedActivity.programacion.hora_inicio && selectedActivity.programacion.hora_fin && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedActivity.programacion.hora_inicio.slice(0, 5)} - {selectedActivity.programacion.hora_fin.slice(0, 5)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Participants */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Participantes ({selectedActivity.profiles.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedActivity.profiles.map((prof) => {
                      const reporte = selectedActivity.reportes.find(r => r.user_id === prof.user_id);
                      
                      return (
                        <div key={prof.id} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{prof.nombre_completo}</p>
                              <p className="text-sm text-muted-foreground">
                                {prof.tipo_asesor || 'Asesor'} • Código: {prof.codigo_asesor}
                              </p>
                            </div>
                            {reporte ? (
                              <Badge variant="default" className="bg-success">Registrado</Badge>
                            ) : (
                              <Badge variant="outline">Pendiente</Badge>
                            )}
                          </div>
                          
                          {reporte && (
                            <div className="mt-3 pt-3 border-t space-y-2">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Consultas:</span>
                                  <span className="ml-2 font-medium">{reporte.consultas || 0}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Solicitudes:</span>
                                  <span className="ml-2 font-medium">{reporte.solicitudes || 0}</span>
                                </div>
                              </div>
                              
                              <div className="text-sm">
                                <span className="text-muted-foreground">Hora de registro:</span>
                                <span className="ml-2 font-medium">
                                  {format(new Date(reporte.hora_registro), 'HH:mm:ss')}
                                </span>
                              </div>

                              {reporte.gps_latitud && reporte.gps_longitud && (
                                <div className="text-sm flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-success" />
                                  <span>
                                    {reporte.gps_latitud.toFixed(6)}, {reporte.gps_longitud.toFixed(6)}
                                  </span>
                                  <a
                                    href={`https://www.google.com/maps?q=${reporte.gps_latitud},${reporte.gps_longitud}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Ver en mapa
                                  </a>
                                </div>
                              )}

                              {reporte.foto_url && (
                                <div className="mt-2">
                                  <img 
                                    src={reporte.foto_url} 
                                    alt="Evidencia" 
                                    className="rounded-lg max-h-48 object-cover"
                                  />
                                </div>
                              )}

                              {reporte.notas && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Notas:</span>
                                  <p className="mt-1 p-2 bg-muted rounded">{reporte.notas}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
