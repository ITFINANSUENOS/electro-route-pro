import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dataService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { List, Camera, MessageSquare } from 'lucide-react';
import { AttendanceGrid } from './AttendanceGrid';
import { ActivityPhotosGrid } from './ActivityPhotosGrid';
import { ConsultasGrid } from './ConsultasGrid';

export function PlanillasViewer() {
  const { role, profile } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedRegional, setSelectedRegional] = useState<string>('todos');
  const [selectedJefe, setSelectedJefe] = useState<string>('todos');

  const canViewAllRegionales = role === 'administrador' || role === 'coordinador_comercial';
  const canViewJefes = role === 'administrador' || role === 'coordinador_comercial' || role === 'lider_zona';

  // Fetch regionales
  const { data: regionales = [] } = useQuery({
    queryKey: ['regionales-planillas'],
    queryFn: async () => {
      const { data, error } = await (dataService.from('regionales').select('*').eq('activo', true).order('nombre') as any);
      if (error) throw error;
      return data || [];
    },
    enabled: canViewAllRegionales,
  });

  // Fetch jefes
  const { data: jefesVentas = [] } = useQuery({
    queryKey: ['jefes-ventas-planillas', selectedRegional, profile?.regional_id, role],
    queryFn: async () => {
      let query = dataService.from('jefes_ventas').select('*').eq('activo', true).order('nombre');
      if (role === 'lider_zona' && profile?.regional_id) {
        query = query.eq('regional_id', profile.regional_id);
      } else if (selectedRegional !== 'todos') {
        query = query.eq('regional_id', selectedRegional);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: canViewJefes,
  });

  // Fetch profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-planillas'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('profiles')
        .select('id, user_id, nombre_completo, codigo_asesor, codigo_jefe, regional_id, tipo_asesor')
        .eq('activo', true) as any);
      if (error) throw error;
      return data || [];
    },
  });

  // Filter profiles based on role hierarchy
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p: any) => {
      if (!p.codigo_asesor || p.codigo_asesor === '00001') return false;

      if (role === 'jefe_ventas') {
        return p.codigo_jefe === profile?.codigo_jefe;
      } else if (role === 'lider_zona') {
        if (selectedRegional !== 'todos') return p.regional_id === selectedRegional;
        return p.regional_id === profile?.regional_id;
      }
      // coordinador/admin
      if (selectedRegional !== 'todos' && p.regional_id !== selectedRegional) return false;
      if (selectedJefe !== 'todos' && p.codigo_jefe !== selectedJefe) return false;
      return true;
    });
  }, [profiles, role, profile, selectedRegional, selectedJefe]);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  const months = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtros de Planilla</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Mes</Label>
              <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Año</Label>
              <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {canViewAllRegionales && (
              <div className="space-y-2">
                <Label>Regional</Label>
                <Select value={selectedRegional} onValueChange={v => { setSelectedRegional(v); setSelectedJefe('todos'); }}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {regionales.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {canViewJefes && (
              <div className="space-y-2">
                <Label>Jefe de Ventas</Label>
                <Select value={selectedJefe} onValueChange={setSelectedJefe}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {jefesVentas.map((j: any) => (
                      <SelectItem key={j.id} value={j.codigo}>{j.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sub-views */}
      <Tabs defaultValue="listado" className="space-y-4">
        <TabsList>
          <TabsTrigger value="listado" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Ver Listado
          </TabsTrigger>
          <TabsTrigger value="actividad" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Ver Actividad
          </TabsTrigger>
          <TabsTrigger value="consultas" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Ver Consultas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listado">
          <AttendanceGrid
            profiles={filteredProfiles}
            month={selectedMonth}
            year={selectedYear}
            daysInMonth={daysInMonth}
          />
        </TabsContent>

        <TabsContent value="actividad">
          <ActivityPhotosGrid
            profiles={filteredProfiles}
            month={selectedMonth}
            year={selectedYear}
            daysInMonth={daysInMonth}
          />
        </TabsContent>

        <TabsContent value="consultas">
          <ConsultasGrid
            profiles={filteredProfiles}
            month={selectedMonth}
            year={selectedYear}
            daysInMonth={daysInMonth}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
