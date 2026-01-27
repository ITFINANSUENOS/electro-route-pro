import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Target,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { exportRankingToExcel, RankingAdvisor } from '@/utils/exportRankingExcel';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabels } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { RankingTable, TipoVentaKey, tiposVentaLabels } from './RankingTable';
import { InteractiveSalesChart } from './InteractiveSalesChart';
import { useSalesCount, transformVentasForCounting } from '@/hooks/useSalesCount';
import { useSalesCountByAdvisor } from '@/hooks/useSalesCountByAdvisor';
import { useActivityCompliance } from '@/hooks/useActivityCompliance';
import { ComplianceDetailPopup } from './ComplianceDetailPopup';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const tiposVentaColors = {
  CONTADO: 'hsl(var(--success))',
  CREDICONTADO: 'hsl(var(--warning))',
  CREDITO: 'hsl(var(--primary))',
  CONVENIO: 'hsl(var(--secondary))',
};

export default function DashboardJefe() {
  const { profile, role } = useAuth();
  const [selectedFilters, setSelectedFilters] = useState<TipoVentaKey[]>(['CONTADO', 'CREDICONTADO', 'CREDITO', 'CONVENIO']);
  const [compliancePopupOpen, setCompliancePopupOpen] = useState(false);
  
  // Activity compliance tracking
  const { advisorSummaries, overallStats: complianceStats, isLoading: loadingCompliance } = useActivityCompliance();

  // Get date range - using January 2026 as the data period
  const startDateStr = '2026-01-01';
  const endDateStr = '2026-01-31';
  const currentMonth = 1;
  const currentYear = 2026;

  // Get codigo_jefe from profile for filtering
  const codigoJefe = (profile as any)?.codigo_jefe;
  const regionalId = profile?.regional_id;

  // Fetch regional code for context
  const { data: jefeRegional } = useQuery({
    queryKey: ['jefe-regional', regionalId],
    queryFn: async () => {
      if (!regionalId) return null;
      const { data, error } = await supabase
        .from('regionales')
        .select('codigo, nombre')
        .eq('id', regionalId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!regionalId,
  });

  // Fetch team advisors based on codigo_jefe - advisors assigned to this manager
  const { data: teamProfiles } = useQuery({
    queryKey: ['jefe-team-profiles', codigoJefe],
    queryFn: async () => {
      if (!codigoJefe) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('codigo_asesor, nombre_completo, tipo_asesor, cedula')
        .eq('codigo_jefe', codigoJefe)
        .eq('activo', true)
        .not('codigo_asesor', 'is', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!codigoJefe,
  });

  const teamAdvisorCodes = useMemo(() => {
    return teamProfiles?.map(p => p.codigo_asesor).filter(Boolean) || [];
  }, [teamProfiles]);

  // Fetch sales for team - filter by codigo_jefe in ventas table
  // Use pagination to fetch ALL records (Supabase default limit is 1000)
  const { data: salesData } = useQuery({
    queryKey: ['jefe-team-sales', codigoJefe, startDateStr],
    queryFn: async () => {
      if (!codigoJefe) return [];
      
      // Normalize codigo_jefe to 5 digits with leading zeros
      const normalizedJefe = codigoJefe.toString().padStart(5, '0');
      
      type SaleRow = {
        id: string;
        fecha: string;
        tipo_venta: string | null;
        vtas_ant_i: number;
        codigo_asesor: string;
        asesor_nombre: string | null;
        codigo_jefe: string | null;
        [key: string]: unknown;
      };
      
      const allData: SaleRow[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('ventas')
          .select('*')
          .eq('codigo_jefe', normalizedJefe)
          .gte('fecha', startDateStr)
          .lte('fecha', endDateStr)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData.push(...(data as SaleRow[]));
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      return allData;
    },
    enabled: !!codigoJefe,
  });

  // Fetch metas for team
  const { data: metasData } = useQuery({
    queryKey: ['jefe-team-metas', currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas')
        .select('*')
        .eq('mes', currentMonth)
        .eq('anio', currentYear);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch formas_pago for payment breakdown
  const { data: formasPago = [] } = useQuery({
    queryKey: ['formas-pago-jefe'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formas_pago')
        .select('*')
        .eq('activo', true);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch daily reports for incompliance tracking
  const { data: reportesData } = useQuery({
    queryKey: ['jefe-team-reportes', startDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reportes_diarios')
        .select('*')
        .gte('fecha', startDateStr)
        .lte('fecha', endDateStr);
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!salesData) return { total: 0, byType: [], byAdvisor: [], totalMeta: 0 };

    // Exclude "OTROS" from sales totals (REBATE, ARRENDAMIENTO, etc.)
    const filteredSales = salesData.filter(sale => sale.tipo_venta !== 'OTROS');

    // Group by tipo_venta
    const byType = Object.entries(
      filteredSales.reduce((acc, sale) => {
        const type = sale.tipo_venta || 'OTRO';
        acc[type] = (acc[type] || 0) + (sale.vtas_ant_i || 0);
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({
      name: tiposVentaLabels[name] || name,
      value: Math.abs(value as number),
      key: name,
      color: tiposVentaColors[name as keyof typeof tiposVentaColors] || 'hsl(var(--muted))',
    }));

    // Group by advisor with sales by type
    const byAdvisorMap = filteredSales.reduce((acc, sale) => {
      const advisor = sale.codigo_asesor;
      if (!acc[advisor]) {
        const profileMatch = teamProfiles?.find(p => p.codigo_asesor === advisor);
        acc[advisor] = { 
          codigo: advisor, 
          nombre: sale.asesor_nombre || advisor, 
          tipoAsesor: profileMatch?.tipo_asesor || 'EXTERNO',
          cedula: profileMatch?.cedula || '',
          total: 0,
          byType: {} as Record<string, number>
        };
      }
      acc[advisor].total += sale.vtas_ant_i || 0;
      const tipo = sale.tipo_venta || 'OTRO';
      acc[advisor].byType[tipo] = (acc[advisor].byType[tipo] || 0) + (sale.vtas_ant_i || 0);
      return acc;
    }, {} as Record<string, { codigo: string; nombre: string; tipoAsesor: string; cedula: string; total: number; byType: Record<string, number> }>);

    const byAdvisor = Object.values(byAdvisorMap)
      .map(a => ({
        ...a,
        total: a.total, // Use net value, not abs - allows negatives for returns
        meta: metasData?.find(m => m.codigo_asesor === a.codigo)?.valor_meta || 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Calculate total meta for team advisors only
    const teamAdvisorCodesSet = new Set(byAdvisor.map(a => a.codigo));
    const totalMeta = metasData
      ?.filter(m => teamAdvisorCodesSet.has(m.codigo_asesor))
      .reduce((sum, m) => sum + m.valor_meta, 0) || 0;

    return {
      total: byType.reduce((sum, t) => sum + t.value, 0),
      byType,
      byAdvisor,
      totalMeta,
    };
  }, [salesData, metasData, teamProfiles]);

  // Calculate unique sales counts using the advanced grouping logic
  const salesCountData = useSalesCount(
    transformVentasForCounting((salesData || []) as Array<{
      cliente_identificacion?: string | null;
      fecha?: string | null;
      tipo_venta?: string | null;
      forma1_pago?: string | null;
      mcn_clase?: string | null;
      vtas_ant_i: number;
    }>)
  );

  // Build tipoAsesorMap for sales count by advisor
  const tipoAsesorMap = useMemo(() => {
    const map = new Map<string, string>();
    const normalizeCode = (code: string): string => {
      const clean = (code || '').replace(/^0+/, '').trim();
      return clean.padStart(5, '0');
    };
    (teamProfiles || []).forEach(p => {
      if (p.codigo_asesor) {
        const normalized = normalizeCode(p.codigo_asesor);
        map.set(normalized, (p.tipo_asesor || 'EXTERNO').toUpperCase());
      }
    });
    return map;
  }, [teamProfiles]);

  // Calculate sales count by advisor for ranking tooltips
  const salesCountByAdvisorData = useSalesCountByAdvisor(
    (salesData || []).map(v => ({
      identifica: (v as any).cliente_identificacion,
      fecha: v.fecha,
      tipo_venta: v.tipo_venta,
      forma1_pago: (v as any).forma1_pago,
      mcn_clase: (v as any).mcn_clase,
      vtas_ant_i: v.vtas_ant_i,
      codigo_asesor: v.codigo_asesor,
    })),
    tipoAsesorMap
  );

  // Team performance for bar chart
  const teamPerformance = useMemo(() => {
    return metrics.byAdvisor.slice(0, 8).map(advisor => ({
      name: advisor.nombre.split(' ')[0],
      ventas: advisor.total / 1000000,
      cumplimiento: advisor.meta > 0 ? Math.round((advisor.total / advisor.meta) * 100) : 0,
    }));
  }, [metrics.byAdvisor]);

  const compliance = metrics.totalMeta > 0 
    ? Math.round((metrics.total / metrics.totalMeta) * 100) 
    : 0;

  // Toggle filter for ranking
  const toggleFilter = (tipo: TipoVentaKey) => {
    setSelectedFilters(prev =>
      prev.includes(tipo)
        ? prev.filter(t => t !== tipo)
        : [...prev, tipo]
    );
  };

  // Filtered ranking based on selected types - use net values (not abs) for accurate totals
  const filteredRanking = useMemo(() => {
    if (selectedFilters.length === 0) return metrics.byAdvisor;
    
    return metrics.byAdvisor.map(advisor => {
      const filteredTotal = selectedFilters.reduce((sum, tipo) => {
        return sum + (advisor.byType[tipo] || 0); // Use net value, not abs
      }, 0);
      
      return {
        ...advisor,
        filteredTotal,
      };
    }).sort((a, b) => b.filteredTotal - a.filteredTotal);
  }, [metrics.byAdvisor, selectedFilters]);

  // Calculate total for ranking
  const rankingTotal = useMemo(() => {
    return filteredRanking.reduce((sum, advisor) => {
      const displayTotal = selectedFilters.length > 0 
        ? (advisor as any).filteredTotal 
        : advisor.total;
      return sum + displayTotal;
    }, 0);
  }, [filteredRanking, selectedFilters]);

  // Handle Excel export
  const handleExportExcel = async () => {
    const dataForExport: RankingAdvisor[] = filteredRanking.map(advisor => ({
      codigo: advisor.codigo,
      nombre: advisor.nombre,
      tipoAsesor: advisor.tipoAsesor || 'EXTERNO',
      cedula: advisor.cedula || '',
      total: selectedFilters.length > 0 ? (advisor as any).filteredTotal : advisor.total,
      byType: advisor.byType,
    }));

    await exportRankingToExcel({
      data: dataForExport,
      includeRegional: false,
      fileName: 'ranking_jefe_ventas',
    });
  };

  // Calculate incompliance from useActivityCompliance
  const incompliance = useMemo(() => {
    const counts = {
      sinFoto: 0,
      sinGPS: 0,
      sinConsultas: 0,
    };
    
    advisorSummaries.forEach(summary => {
      summary.issues.forEach(issue => {
        if (issue.issue_type === 'missing_photo' || issue.issue_type === 'missing_evidence') {
          counts.sinFoto++;
        }
        if (issue.issue_type === 'missing_gps') {
          counts.sinGPS++;
        }
        if (issue.issue_type === 'missing_consultas') {
          counts.sinConsultas++;
        }
      });
    });
    
    return counts;
  }, [advisorSummaries]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4 sm:space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
          ¡Bienvenido, {profile?.nombre_completo?.split(' ')[0] || 'Usuario'}!
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {role && roleLabels[role]} • Equipo de {metrics.byAdvisor.length} asesores
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Ventas del Equipo"
          value={formatCurrency(metrics.total)}
          subtitle={`Meta: ${formatCurrency(metrics.totalMeta)}`}
          icon={ShoppingCart}
          status={compliance >= 80 ? 'success' : compliance >= 50 ? 'warning' : 'danger'}
          tooltipTitle="Desglose por tipo de venta"
          tooltipItems={metrics.byType.map(t => ({
            label: t.name,
            value: formatCurrency(t.value),
            color: t.color,
          }))}
        />
        <KpiCard
          title="Q Ventas Mes"
          value={salesCountData.totalSalesCount.toString()}
          subtitle="Ventas únicas"
          icon={Hash}
          tooltipTitle="Cantidad por tipo de venta"
          tooltipItems={Object.entries(salesCountData.byType).map(([key, data]) => ({
            label: tiposVentaLabels[key] || key,
            value: `${data.count} ventas`,
            color: tiposVentaColors[key as TipoVentaKey] || 'hsl(var(--muted))',
          }))}
        />
        <KpiCard
          title="Cumplimiento"
          value={`${compliance}%`}
          subtitle={`${100 - compliance}% para meta`}
          icon={Target}
          status={compliance >= 80 ? 'success' : compliance >= 50 ? 'warning' : 'danger'}
          tooltipTitle="Cumplimiento por tipo de venta"
          tooltipItems={metrics.byType.map(t => {
            const tipoMeta = metasData
              ?.filter(m => m.tipo_meta === t.key.toLowerCase())
              .reduce((sum, m) => sum + m.valor_meta, 0) || 0;
            const tipoCompliance = tipoMeta > 0 ? Math.round((t.value / tipoMeta) * 100) : 0;
            return {
              label: t.name,
              value: `${tipoCompliance}%`,
              color: t.color,
            };
          })}
        />
        <KpiCard
          title="Asesores"
          value={metrics.byAdvisor.length.toString()}
          subtitle="Con ventas este mes"
          icon={Users}
        />
        <KpiCard
          title="Consultas"
          value={reportesData?.reduce((sum, r) => sum + (r.consultas || 0), 0).toString() || '0'}
          subtitle="Este mes"
          icon={TrendingUp}
        />
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={item} className="grid gap-6 lg:grid-cols-2">
        {/* Interactive Sales by Type Chart */}
        <InteractiveSalesChart
          salesByType={metrics.byType}
          salesData={salesData || []}
          formasPago={formasPago}
          salesCountByType={salesCountData.byType}
        />

        {/* Team Performance */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-secondary" />
              Rendimiento del Equipo
            </CardTitle>
            <CardDescription>Ventas por asesor (en millones)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" tickFormatter={(v) => `$${v}M`} />
                  <YAxis dataKey="name" type="category" width={70} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                    formatter={(value: number) => [`$${value.toFixed(1)}M`, 'Ventas']}
                  />
                  <Bar dataKey="ventas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Ranking Table */}
      <motion.div variants={item}>
        <RankingTable
          ranking={filteredRanking.map(a => ({
            ...a,
            meta: a.meta,
            filteredTotal: (a as any).filteredTotal,
          }))}
          selectedFilters={selectedFilters}
          onToggleFilter={toggleFilter}
          onExportExcel={handleExportExcel}
          
          includeRegional={false}
          salesCountByAdvisor={salesCountByAdvisorData.byAdvisor}
        />
      </motion.div>

      {/* Incompliance Section */}
      <motion.div variants={item}>
        <Card className="card-elevated cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setCompliancePopupOpen(true)}>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
              Indicadores de Incumplimiento
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Haz clic para ver detalle por asesor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="p-3 sm:p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium">Sin evidencia</span>
                  <StatusBadge status="danger" label={`${incompliance.sinFoto}`} size="sm" />
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  No subieron foto
                </p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg bg-warning/10 border border-warning/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium">Sin GPS</span>
                  <StatusBadge status="warning" label={`${incompliance.sinGPS}`} size="sm" />
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  No validaron ubicación
                </p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg bg-accent border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium">Sin consultas</span>
                  <StatusBadge status="neutral" label={`${incompliance.sinConsultas}`} size="sm" />
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  Sin gestión registrada
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Compliance Detail Popup */}
      <ComplianceDetailPopup
        open={compliancePopupOpen}
        onOpenChange={setCompliancePopupOpen}
        advisorSummaries={advisorSummaries}
        month={new Date(2026, 0, 1)}
      />
    </motion.div>
  );
}
