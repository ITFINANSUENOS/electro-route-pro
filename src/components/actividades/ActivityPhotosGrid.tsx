import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dataService } from '@/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Download, Check, X } from 'lucide-react';
import { exportFotosExcel } from '@/utils/exportFotosExcel';

interface Profile {
  user_id: string;
  nombre_completo: string;
  codigo_asesor: string | null;
}

interface ActivityPhotosGridProps {
  profiles: Profile[];
  month: number;
  year: number;
  daysInMonth: number;
}

export function ActivityPhotosGrid({ profiles, month, year, daysInMonth }: ActivityPhotosGridProps) {
  const [tipoActividad, setTipoActividad] = useState<'correria' | 'punto'>('correria');
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const userIds = useMemo(() => profiles.map(p => p.user_id), [profiles]);

  // Fetch programaciones for the month
  const { data: programaciones = [] } = useQuery({
    queryKey: ['planilla-prog-fotos', month, year, userIds, tipoActividad],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await (dataService
        .from('programacion')
        .select('user_id, fecha, tipo_actividad')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .eq('tipo_actividad', tipoActividad)
        .in('user_id', userIds) as any);
      if (error) throw error;
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  // Fetch group evidence for the month
  const { data: evidence = [] } = useQuery({
    queryKey: ['planilla-evidence', month, year, tipoActividad],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('evidencia_grupal')
        .select('*')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .eq('tipo_actividad', tipoActividad) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const today = new Date();
  const todayDay = today.getMonth() + 1 === month && today.getFullYear() === year ? today.getDate() : 999;

  const requiredPhotos = tipoActividad === 'correria'
    ? ['inicio_correria', 'instalacion_correria', 'cierre_correria']
    : ['apertura_punto', 'cierre_punto'];

  // Build grid data
  const gridData = useMemo(() => {
    const progMap = new Map<string, Set<number>>();
    programaciones.forEach((p: any) => {
      if (!progMap.has(p.user_id)) progMap.set(p.user_id, new Set());
      const day = new Date(p.fecha + 'T12:00:00').getDate();
      progMap.get(p.user_id)!.add(day);
    });

    // Evidence indexed by date
    const evidenceByDate = new Map<number, any[]>();
    evidence.forEach((e: any) => {
      const day = new Date(e.fecha + 'T12:00:00').getDate();
      if (!evidenceByDate.has(day)) evidenceByDate.set(day, []);
      evidenceByDate.get(day)!.push(e);
    });

    return profiles.map(p => {
      const programmed = progMap.get(p.user_id) || new Set();
      const days: Record<number, {
        programmed: boolean;
        photos: Record<string, string>; // tipo_foto -> time
        completionRatio: number;
      } | null> = {};

      for (let d = 1; d <= daysInMonth; d++) {
        if (!programmed.has(d)) {
          days[d] = null;
          continue;
        }

        const dayEvidence = evidenceByDate.get(d) || [];
        const photos: Record<string, string> = {};

        dayEvidence.forEach((e: any) => {
          photos[e.tipo_foto] = new Date(e.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        });

        const completedCount = requiredPhotos.filter(tp => photos[tp]).length;
        days[d] = {
          programmed: true,
          photos,
          completionRatio: completedCount / requiredPhotos.length,
        };
      }

      return {
        nombre: p.nombre_completo,
        codigo: p.codigo_asesor || '',
        userId: p.user_id,
        days,
      };
    });
  }, [profiles, programaciones, evidence, daysInMonth, requiredPhotos]);

  const toggleDay = (day: number) => {
    const newSet = new Set(expandedDays);
    if (newSet.has(day)) {
      newSet.delete(day);
    } else {
      newSet.add(day);
    }
    setExpandedDays(newSet);
  };

  const handleExport = () => {
    const exportRows = gridData.map(row => {
      const exportDays: Record<number, any> = {};
      for (let d = 1; d <= daysInMonth; d++) {
        const dayData = row.days[d];
        if (!dayData) {
          exportDays[d] = null;
          continue;
        }
        if (tipoActividad === 'correria') {
          exportDays[d] = {
            inicio: dayData.photos['inicio_correria'] || '00:00',
            instalacion: dayData.photos['instalacion_correria'] || '00:00',
            cierre: dayData.photos['cierre_correria'] || '00:00',
          };
        } else {
          exportDays[d] = {
            apertura: dayData.photos['apertura_punto'] || '00:00',
            cierre_punto: dayData.photos['cierre_punto'] || '00:00',
          };
        }
      }
      return { nombre: row.nombre, codigo: row.codigo, days: exportDays };
    });
    exportFotosExcel(exportRows, month, year, daysInMonth, tipoActividad);
  };

  const dayHeaders = useMemo(() => {
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month - 1, i + 1);
      return days[date.getDay()];
    });
  }, [month, year, daysInMonth]);

  const photoLabels = tipoActividad === 'correria'
    ? { inicio_correria: 'In', instalacion_correria: 'Ins', cierre_correria: 'Ci' }
    : { apertura_punto: 'Ap', cierre_punto: 'Ci' };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">Fotos por Actividad</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={tipoActividad} onValueChange={v => { setTipoActividad(v as any); setExpandedDays(new Set()); }}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="correria">Correría</SelectItem>
                <SelectItem value="punto">Punto Fijo</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              Excel
            </Button>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-primary/20" />
            <span>Completo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-destructive/20" />
            <span>Incompleto</span>
          </div>
          <p className="text-xs italic">Clic en un día para expandir horas</p>
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
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const d = i + 1;
                      const isExpanded = expandedDays.has(d);
                      return (
                        <th
                          key={d}
                          className={`text-center p-0.5 cursor-pointer hover:bg-muted/50 transition-colors ${isExpanded ? 'bg-muted/30' : ''}`}
                          onClick={() => toggleDay(d)}
                          colSpan={isExpanded ? Object.keys(photoLabels).length : 1}
                        >
                          <div className="text-muted-foreground">{dayHeaders[i]}</div>
                          <div>{d}</div>
                          {isExpanded && (
                            <div className="flex gap-0.5 justify-center mt-0.5">
                              {Object.values(photoLabels).map((lbl, idx) => (
                                <span key={idx} className="text-[9px] text-muted-foreground font-normal">{lbl}</span>
                              ))}
                            </div>
                          )}
                        </th>
                      );
                    })}
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
                        const dayData = row.days[d];
                        const isExpanded = expandedDays.has(d);
                        const isFuture = d > todayDay;

                        if (isExpanded && dayData) {
                          return Object.keys(photoLabels).map((photoKey) => (
                            <td key={`${d}-${photoKey}`} className="p-0.5 text-center">
                              <div className={`w-7 h-7 flex items-center justify-center rounded-sm text-[9px] ${
                                dayData.photos[photoKey]
                                  ? 'bg-primary/20 text-primary'
                                  : 'bg-destructive/20 text-destructive'
                              }`}>
                                {dayData.photos[photoKey] || '00:00'}
                              </div>
                            </td>
                          ));
                        }

                        if (isExpanded && !dayData) {
                          return Object.keys(photoLabels).map((photoKey) => (
                            <td key={`${d}-${photoKey}`} className="p-0.5 text-center">
                              <div className="w-7 h-7 rounded-sm bg-muted/30" />
                            </td>
                          ));
                        }

                        let cellClass = 'w-7 h-7 flex items-center justify-center rounded-sm ';
                        if (isFuture || !dayData) {
                          cellClass += 'bg-muted/30';
                        } else if (dayData.completionRatio >= 1) {
                          cellClass += 'bg-primary/20';
                        } else {
                          cellClass += 'bg-destructive/20';
                        }

                        return (
                          <td key={d} className="p-0.5 text-center">
                            <div className={cellClass}>
                              {dayData && !isFuture && (
                                dayData.completionRatio >= 1
                                  ? <Check className="h-3 w-3 text-primary" />
                                  : <X className="h-3 w-3 text-destructive" />
                              )}
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
