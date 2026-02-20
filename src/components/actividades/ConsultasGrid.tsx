import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dataService } from '@/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Download } from 'lucide-react';
import { exportConsultasExcel } from '@/utils/exportConsultasExcel';

interface Profile {
  user_id: string;
  nombre_completo: string;
  codigo_asesor: string | null;
}

interface ConsultasGridProps {
  profiles: Profile[];
  month: number;
  year: number;
  daysInMonth: number;
}

export function ConsultasGrid({ profiles, month, year, daysInMonth }: ConsultasGridProps) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  const userIds = useMemo(() => profiles.map(p => p.user_id), [profiles]);

  const { data: programaciones = [] } = useQuery({
    queryKey: ['consultas-programaciones', month, year, userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await (dataService
        .from('programacion')
        .select('user_id, fecha')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .in('user_id', userIds) as any);
      if (error) throw error;
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  const { data: reportes = [] } = useQuery({
    queryKey: ['consultas-reportes', month, year, userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await (dataService
        .from('reportes_diarios')
        .select('user_id, fecha, consultas, solicitudes')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .in('user_id', userIds) as any);
      if (error) throw error;
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  const gridData = useMemo(() => {
    const progMap = new Map<string, Set<number>>();
    programaciones.forEach((p: any) => {
      if (!progMap.has(p.user_id)) progMap.set(p.user_id, new Set());
      progMap.get(p.user_id)!.add(new Date(p.fecha + 'T12:00:00').getDate());
    });

    const reportMap = new Map<string, Map<number, { c: number; s: number }>>();
    reportes.forEach((r: any) => {
      if (!reportMap.has(r.user_id)) reportMap.set(r.user_id, new Map());
      const day = new Date(r.fecha + 'T12:00:00').getDate();
      const existing = reportMap.get(r.user_id)!.get(day);
      const c = r.consultas || 0;
      const s = r.solicitudes || 0;
      if (existing) {
        existing.c += c;
        existing.s += s;
      } else {
        reportMap.get(r.user_id)!.set(day, { c, s });
      }
    });

    const today = new Date();
    const todayDay = today.getMonth() + 1 === month && today.getFullYear() === year ? today.getDate() : 999;

    return profiles.map(p => {
      const programmed = progMap.get(p.user_id) || new Set<number>();
      const reports = reportMap.get(p.user_id) || new Map<number, { c: number; s: number }>();

      const days: Record<number, { c: number; s: number } | 'missing' | null> = {};
      let totalC = 0, totalS = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        if (d > todayDay) {
          days[d] = null;
        } else if (reports.has(d)) {
          const val = reports.get(d)!;
          days[d] = val;
          totalC += val.c;
          totalS += val.s;
        } else if (programmed.has(d)) {
          days[d] = 'missing';
        } else {
          days[d] = null;
        }
      }

      return {
        nombre: p.nombre_completo,
        codigo: p.codigo_asesor || '',
        userId: p.user_id,
        days,
        totalC,
        totalS,
      };
    });
  }, [profiles, programaciones, reportes, month, year, daysInMonth]);

  const today = new Date();
  const todayDay = today.getMonth() + 1 === month && today.getFullYear() === year ? today.getDate() : 999;

  const dayHeaders = useMemo(() => {
    const labels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month - 1, i + 1);
      return labels[date.getDay()];
    });
  }, [month, year, daysInMonth]);

  const handleExport = () => {
    exportConsultasExcel(gridData, month, year, daysInMonth);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Consultas y Solicitudes</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Descargar Excel
          </Button>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-primary/20" />
            <span>Reportó</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-destructive/20" />
            <span>Programado sin reporte</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-muted/30" />
            <span>No programado / futuro</span>
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
                      <th key={i} className="text-center p-0.5 min-w-[40px]">
                        <div className="text-muted-foreground">{dayHeaders[i]}</div>
                        <div>{i + 1}</div>
                      </th>
                    ))}
                    <th className="text-center p-1 min-w-[35px] font-bold">C</th>
                    <th className="text-center p-1 min-w-[35px] font-bold">S</th>
                  </tr>
                </thead>
                <tbody>
                  {gridData.map(row => (
                    <tr key={row.userId} className="border-t">
                      <td className="p-1 sticky left-0 bg-background z-10 truncate max-w-[150px]" title={row.nombre}>
                        <div className="text-xs font-medium truncate">{row.nombre}</div>
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const d = i + 1;
                        const val = row.days[d];
                        const isFuture = d > todayDay;

                        let cellClass = 'min-w-[40px] h-7 flex items-center justify-center rounded-sm text-[9px] font-medium ';
                        let content = '';

                        if (isFuture || val === null) {
                          cellClass += 'bg-muted/30';
                        } else if (val === 'missing') {
                          cellClass += 'bg-destructive/20 text-destructive';
                          content = '--/--';
                        } else {
                          cellClass += 'bg-primary/20 text-primary';
                          content = `${val.c}/${val.s}`;
                        }

                        return (
                          <td key={d} className="p-0.5 text-center">
                            <div className={cellClass}>{content}</div>
                          </td>
                        );
                      })}
                      <td className="p-1 text-center font-bold text-xs">{row.totalC}</td>
                      <td className="p-1 text-center font-bold text-xs">{row.totalS}</td>
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
