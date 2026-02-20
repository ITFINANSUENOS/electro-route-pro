import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dataService } from '@/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Download, Check, X, Minus } from 'lucide-react';
import { exportPlanillaExcel } from '@/utils/exportPlanillaExcel';

interface Profile {
  user_id: string;
  nombre_completo: string;
  codigo_asesor: string | null;
}

interface AttendanceGridProps {
  profiles: Profile[];
  month: number;
  year: number;
  daysInMonth: number;
}

export function AttendanceGrid({ profiles, month, year, daysInMonth }: AttendanceGridProps) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const userIds = useMemo(() => profiles.map(p => p.user_id), [profiles]);

  // Fetch programaciones for the month
  const { data: programaciones = [] } = useQuery({
    queryKey: ['planilla-programaciones', month, year, userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await (dataService
        .from('programacion')
        .select('user_id, fecha, tipo_actividad')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .in('user_id', userIds) as any);
      if (error) throw error;
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  // Fetch reportes for the month
  const { data: reportes = [] } = useQuery({
    queryKey: ['planilla-reportes', month, year, userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await (dataService
        .from('reportes_diarios')
        .select('user_id, fecha, gps_latitud')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .in('user_id', userIds) as any);
      if (error) throw error;
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  // Build attendance data
  const attendanceData = useMemo(() => {
    const progMap = new Map<string, Set<number>>();
    programaciones.forEach((p: any) => {
      const key = p.user_id;
      if (!progMap.has(key)) progMap.set(key, new Set());
      const day = new Date(p.fecha + 'T12:00:00').getDate();
      progMap.get(key)!.add(day);
    });

    const gpsMap = new Map<string, Set<number>>();
    reportes.forEach((r: any) => {
      if (r.gps_latitud == null) return;
      const key = r.user_id;
      if (!gpsMap.has(key)) gpsMap.set(key, new Set());
      const day = new Date(r.fecha + 'T12:00:00').getDate();
      gpsMap.get(key)!.add(day);
    });

    const today = new Date();
    const todayDay = today.getMonth() + 1 === month && today.getFullYear() === year ? today.getDate() : 999;

    return profiles.map(p => {
      const programmed = progMap.get(p.user_id) || new Set();
      const gps = gpsMap.get(p.user_id) || new Set();

      const days: Record<number, 1 | 0 | null> = {};
      for (let d = 1; d <= daysInMonth; d++) {
        if (d > todayDay) {
          days[d] = null; // future
        } else if (programmed.has(d)) {
          days[d] = gps.has(d) ? 1 : 0;
        } else {
          days[d] = null;
        }
      }

      return {
        nombre: p.nombre_completo,
        codigo: p.codigo_asesor || '',
        userId: p.user_id,
        days,
        hasProgrammedDays: programmed,
      };
    });
  }, [profiles, programaciones, reportes, month, year, daysInMonth]);

  const today = new Date();
  const todayDay = today.getMonth() + 1 === month && today.getFullYear() === year ? today.getDate() : 999;

  const handleExport = () => {
    exportPlanillaExcel(attendanceData, month, year, daysInMonth);
  };

  // Day of week headers
  const dayHeaders = useMemo(() => {
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month - 1, i + 1);
      return days[date.getDay()];
    });
  }, [month, year, daysInMonth]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Asistencia GPS</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Descargar Excel
          </Button>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-primary/20 flex items-center justify-center">
              <Check className="h-3 w-3 text-primary" />
            </div>
            <span>GPS registrado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-destructive/20" />
            <span>Sin GPS</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm border border-destructive/50" />
            <span>No programado</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay asesores para mostrar</p>
        ) : (
          <ScrollArea className="w-full">
            <div className="min-w-max">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left p-1 sticky left-0 bg-background z-10 min-w-[150px]">Asesor</th>
                    {Array.from({ length: daysInMonth }, (_, i) => (
                      <th key={i} className="text-center p-0.5 w-7">
                        <div className="text-muted-foreground">{dayHeaders[i]}</div>
                        <div>{i + 1}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.map(row => (
                    <tr key={row.userId} className="border-t">
                      <td className="p-1 sticky left-0 bg-background z-10 truncate max-w-[150px]" title={row.nombre}>
                        <div className="text-xs font-medium truncate">{row.nombre}</div>
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const d = i + 1;
                        const val = row.days[d];
                        const isProgrammed = row.hasProgrammedDays.has(d);
                        const isFuture = d > todayDay;

                        let cellClass = 'w-7 h-7 flex items-center justify-center rounded-sm text-[10px] ';
                        if (isFuture) {
                          cellClass += 'bg-muted/30';
                        } else if (val === 1) {
                          cellClass += 'bg-primary/20';
                        } else if (val === 0) {
                          cellClass += 'bg-destructive/20';
                        } else if (!isProgrammed && !isFuture) {
                          cellClass += 'border border-destructive/40';
                        }

                        return (
                          <td key={d} className="p-0.5 text-center">
                            <div className={cellClass}>
                              {val === 1 && <Check className="h-3 w-3 text-primary" />}
                              {val === 0 && <X className="h-3 w-3 text-destructive" />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
