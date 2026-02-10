import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  ShoppingCart,
  Target,
  MessageSquare,
  FileText,
  Trophy,
  Calendar,
  Hash,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabels } from '@/types/auth';
import { dataService } from '@/services';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useActivityCompliance } from '@/hooks/useActivityCompliance';
import { CompliancePopup } from './CompliancePopup';
import { useSalesCount, transformVentasForCounting } from '@/hooks/useSalesCount';
import { useMetaQuantityConfig } from '@/hooks/useMetaQuantityConfig';
import { calculateMetaQuantity } from '@/utils/calculateMetaQuantity';
import { PeriodSelector } from './PeriodSelector';
import { usePeriodSelector } from '@/hooks/usePeriodSelector';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  ALIADOS: 'hsl(var(--secondary))',
};

const tiposVentaLabels: Record<string, string> = {
  CONTADO: 'Contado',
  CREDICONTADO: 'Credi Contado',
  CREDITO: 'Crédito',
  ALIADOS: 'Aliados',
};

export default function DashboardAsesor() {
  const { profile, role, user } = useAuth();
  const [compliancePopupOpen, setCompliancePopupOpen] = useState(false);
  
  // Activity compliance tracking
  const { advisorSummaries, overallStats: complianceStats } = useActivityCompliance();

  // Period selector for viewing historical data
  const {
    selectedPeriod,
    periodValue,
    handlePeriodChange,
    availablePeriods,
    isLoading: isLoadingPeriods,
    dateRange,
    periodLabel,
  } = usePeriodSelector();

  // Get date range from period selector
  const startDateStr = dateRange.startDate;
  const endDateStr = dateRange.endDate;
  const currentMonth = selectedPeriod.mes;
  const currentYear = selectedPeriod.anio;

  // Get advisor identifiers from profile (3 keys: cedula, codigo, nombre)
  const codigoAsesor = (profile as any)?.codigo_asesor;
  const cedulaAsesor = (profile as any)?.cedula;
  const nombreAsesor = (profile as any)?.nombre_completo;

  // Fetch own sales data using multi-key matching
  const { data: salesData } = useQuery({
    queryKey: ['asesor-sales', codigoAsesor, cedulaAsesor, nombreAsesor, startDateStr],
    queryFn: async (): Promise<any[]> => {
      // Need at least one identifier
      if (!codigoAsesor && !cedulaAsesor && !nombreAsesor) return [];
      
      // RLS policy handles the multi-key matching, just fetch all accessible sales
      const { data, error } = await (dataService
        .from('ventas')
        .select('*')
        .gte('fecha', startDateStr)
        .lte('fecha', endDateStr) as any);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!(codigoAsesor || cedulaAsesor || nombreAsesor),
  });

  // Fetch own meta (metas use codigo_asesor as primary key)
  const { data: metaData } = useQuery({
    queryKey: ['asesor-meta', codigoAsesor, currentMonth],
    queryFn: async (): Promise<any[] | null> => {
      if (!codigoAsesor) return null;
      
      const { data, error } = await (dataService
        .from('metas')
        .select('*')
        .eq('codigo_asesor', codigoAsesor)
        .eq('mes', currentMonth)
        .eq('anio', currentYear)
        .eq('tipo_meta_categoria', 'comercial') as any);
      
      if (error) throw error;
      return data;
    },
    enabled: !!codigoAsesor,
  });

  // Fetch daily reports for consultas/solicitudes
  const { data: reportesData } = useQuery({
    queryKey: ['asesor-reportes', user?.id],
    queryFn: async (): Promise<any[]> => {
      if (!user?.id) return [];
      
      const { data, error } = await (dataService
        .from('reportes_diarios')
        .select('*')
        .eq('user_id', user.id)
        .gte('fecha', '2026-01-01')
        .lte('fecha', '2026-01-31') as any);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch meta quantity config for calculating quantity goals
  const { data: metaQuantityConfig } = useMetaQuantityConfig();
  const tipoAsesor = (profile as any)?.tipo_asesor;

  // Get advisor's regional_id and codigo_jefe for ranking queries
  const regionalId = (profile as any)?.regional_id;
  const codigoJefe = (profile as any)?.codigo_jefe;

  // Fetch total advisor count in regional using database function
  const { data: regionalAdvisorCount } = useQuery({
    queryKey: ['regional-advisor-count', regionalId],
    queryFn: async () => {
      if (!regionalId) return 0;
      const { data, error } = await dataService.rpc('count_regional_advisors', {
        p_regional_id: regionalId
      });
      if (error) throw error;
      return (data as number) || 0;
    },
    enabled: !!regionalId,
  });

  // Fetch top sales in regional using database function
  const { data: topRegionalSales } = useQuery({
    queryKey: ['top-regional-sales', regionalId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!regionalId) return 0;
      const { data, error } = await dataService.rpc('get_top_regional_sales', {
        p_regional_id: regionalId,
        p_start_date: startDateStr,
        p_end_date: endDateStr
      });
      if (error) throw error;
      return (data as number) || 0;
    },
    enabled: !!regionalId,
  });

  // Fetch advisor's position in regional ranking
  const { data: regionalPosition } = useQuery({
    queryKey: ['advisor-regional-position', codigoAsesor, regionalId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!regionalId || !codigoAsesor) return 0;
      const { data, error } = await dataService.rpc('get_advisor_regional_position', {
        p_codigo_asesor: codigoAsesor,
        p_regional_id: regionalId,
        p_start_date: startDateStr,
        p_end_date: endDateStr
      });
      if (error) throw error;
      return (data as number) || 0;
    },
    enabled: !!regionalId && !!codigoAsesor,
  });

  // Fetch group advisor count using database function
  const { data: groupAdvisorCount } = useQuery({
    queryKey: ['group-advisor-count', codigoJefe],
    queryFn: async () => {
      if (!codigoJefe) return 0;
      const { data, error } = await dataService.rpc('count_group_advisors', {
        p_codigo_jefe: codigoJefe
      });
      if (error) throw error;
      return (data as number) || 0;
    },
    enabled: !!codigoJefe,
  });

  // Fetch advisor's position in group ranking
  const { data: groupPosition } = useQuery({
    queryKey: ['advisor-group-position', codigoAsesor, codigoJefe, startDateStr, endDateStr],
    queryFn: async () => {
      if (!codigoJefe || !codigoAsesor) return 0;
      const { data, error } = await dataService.rpc('get_advisor_group_position', {
        p_codigo_asesor: codigoAsesor,
        p_codigo_jefe: codigoJefe,
        p_start_date: startDateStr,
        p_end_date: endDateStr
      });
      if (error) throw error;
      return (data as number) || 0;
    },
    enabled: !!codigoJefe && !!codigoAsesor,
  });

  const hasGroup = !!codigoJefe && (groupAdvisorCount || 0) > 0;

  // Transform sales data for counting unique sales
  const salesForCounting = useMemo(() => {
    if (!salesData) return [];
    return transformVentasForCounting(salesData.filter(s => s.tipo_venta !== 'OTROS'));
  }, [salesData]);

  // Calculate unique sales count
  const salesCount = useSalesCount(salesForCounting);

  // Calculate metrics
  const metrics = useMemo((): { total: number; byType: any[]; totalMeta: number } => {
    if (!salesData) return { total: 0, byType: [], totalMeta: 0 };

    // Exclude "OTROS" from sales totals (REBATE, ARRENDAMIENTO, etc.)
    const filteredSales = salesData.filter(sale => sale.tipo_venta !== 'OTROS');

    // Group by tipo_venta - use NET values (sum) to correctly handle returns/refunds
    const byTypeRaw = filteredSales.reduce((acc, sale) => {
      const type = (sale as any).tipo_venta || 'OTRO';
      acc[type] = (acc[type] || 0) + ((sale as any).vtas_ant_i || 0);
      return acc;
    }, {} as Record<string, number>);

    // Calculate total using net values (allows negative to subtract)
    const total: number = Object.values(byTypeRaw).reduce<number>((sum, val) => sum + (val as number), 0);

    // For display, show actual net values (can be negative for returns-heavy categories)
    const byType = Object.entries(byTypeRaw)
      .filter(([_, value]) => value !== 0) // Remove zero categories
      .map(([name, value]) => ({
        name: tiposVentaLabels[name] || name,
        key: name,
        value: value as number, // Keep actual value (can be negative)
        color: tiposVentaColors[name as keyof typeof tiposVentaColors] || 'hsl(var(--muted))',
      }));

    const totalMeta = (metaData as any)?.reduce((sum: number, m: any) => sum + m.valor_meta, 0) || 0;

    return {
      total, // Net total correctly subtracting returns
      byType,
      totalMeta,
    };
  }, [salesData, metaData]);

  // Reports totals
  const reportTotals = useMemo(() => {
    if (!reportesData) return { consultas: 0, solicitudes: 0 };
    return reportesData.reduce((acc, r) => ({
      consultas: acc.consultas + (r.consultas || 0),
      solicitudes: acc.solicitudes + (r.solicitudes || 0),
    }), { consultas: 0, solicitudes: 0 });
  }, [reportesData]);

  const compliance = metrics.totalMeta > 0 
    ? Math.round((metrics.total / metrics.totalMeta) * 100) 
    : 0;

  // Calculate quantity meta goal and compliance
  const quantityMetrics = useMemo(() => {
    if (!metaData || !metaQuantityConfig || !tipoAsesor || !regionalId) {
      return { totalQuantityMeta: 0, quantityCompliance: 0 };
    }

    let totalQuantityMeta = 0;

    // Calculate quantity goal for each tipo_meta
    metaData.forEach(meta => {
      if (!meta.tipo_meta || meta.valor_meta <= 0) return;
      
      const result = calculateMetaQuantity(
        meta.valor_meta,
        tipoAsesor,
        meta.tipo_meta.toUpperCase(),
        regionalId,
        metaQuantityConfig
      );

      if (result) {
        totalQuantityMeta += result.cantidadFinal;
      }
    });

    const quantityCompliance = totalQuantityMeta > 0
      ? Math.round((salesCount.totalSalesCount / totalQuantityMeta) * 100)
      : 0;

    return { totalQuantityMeta, quantityCompliance };
  }, [metaData, metaQuantityConfig, tipoAsesor, regionalId, salesCount.totalSalesCount]);

  // Compliance by type
  const complianceByType = useMemo(() => {
    if (!metaData || !metrics.byType.length) return [];

    return metrics.byType.map(tipo => {
      const meta = metaData.find(m => m.tipo_meta?.toUpperCase() === tipo.key);
      const metaValue = meta?.valor_meta || 0;
      const complianceVal = metaValue > 0 ? Math.round((tipo.value / metaValue) * 100) : 0;

      return {
        name: tipo.name,
        ventas: tipo.value,
        meta: metaValue,
        compliance: complianceVal,
        color: tipo.color,
      };
    }).filter(t => t.meta > 0);
  }, [metaData, metrics.byType]);

  // Calculate budget vs executed for bar chart
  const budgetVsExecuted = useMemo(() => {
    if (!metaData || !salesData) return [];
    
    const tiposVenta = ['CONTADO', 'CREDICONTADO', 'CREDITO', 'ALIADOS'];
    
    return tiposVenta.map(tipo => {
      // Get advisor's meta for this tipo_venta
      const meta = metaData.find(m => m.tipo_meta?.toUpperCase() === tipo);
      const presupuesto = meta?.valor_meta || 0;
      
      // Calculate executed from sales
      const ejecutado = salesData
          .filter(s => s.tipo_venta === tipo)
          .reduce((sum, s) => sum + (s.vtas_ant_i || 0), 0);

      return {
        name: tiposVentaLabels[tipo] || tipo,
        presupuesto: presupuesto / 1000000,
        ejecutado: ejecutado / 1000000,
      };
    }).filter(d => d.presupuesto > 0 || d.ejecutado > 0); // Only show types with data
  }, [metaData, salesData]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            ¡Bienvenido, {profile?.nombre_completo?.split(' ')[0] || 'Usuario'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {role && roleLabels[role]} • {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        {/* Period Selector */}
        <PeriodSelector
          value={periodValue}
          onChange={handlePeriodChange}
          periods={availablePeriods}
          isLoading={isLoadingPeriods}
        />
      </motion.div>

      {/* KPI Cards - 2 rows of 3 for better readability */}
      <motion.div variants={item} className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Mis Ventas del Mes - with hover tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <KpiCard
                title="Mis Ventas del Mes"
                value={formatCurrency(metrics.total)}
                subtitle={`Meta: ${formatCurrency(metrics.totalMeta)} • ${compliance}%`}
                icon={ShoppingCart}
                status={compliance >= 80 ? 'success' : compliance >= 50 ? 'warning' : 'danger'}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="p-3 max-w-sm">
            <p className="font-semibold mb-2">Ventas por Tipo</p>
            <div className="space-y-2 text-sm">
              {complianceByType.map(t => {
                const typeKey = t.name === 'Contado' ? 'CONTADO' : t.name === 'Credi Contado' ? 'CREDICONTADO' : t.name === 'Crédito' ? 'CREDITO' : 'ALIADOS';
                const qtyData = salesCount.byType[typeKey];
                return (
                  <div key={t.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                      <span>{t.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <span className="text-muted-foreground">{formatCurrency(t.ventas)}</span>
                      <span className={cn("font-medium", t.compliance >= 100 ? 'text-success' : t.compliance >= 80 ? 'text-warning' : 'text-destructive')}>
                        {t.compliance}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Q Ventas Mes - with hover tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <KpiCard
                title="Q Ventas Mes"
                value={salesCount.totalSalesCount.toString()}
                subtitle={quantityMetrics.totalQuantityMeta > 0 
                  ? `Meta: ${quantityMetrics.totalQuantityMeta} uds • ${quantityMetrics.quantityCompliance}%`
                  : 'Sin meta de cantidad'}
                icon={Hash}
                status={quantityMetrics.quantityCompliance >= 80 ? 'success' : quantityMetrics.quantityCompliance >= 50 ? 'warning' : 'danger'}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="p-3 max-w-sm">
            <p className="font-semibold mb-2">Cantidad por Tipo</p>
            <div className="space-y-2 text-sm">
              {complianceByType.map(t => {
                const typeKey = t.name === 'Contado' ? 'CONTADO' : t.name === 'Credi Contado' ? 'CREDICONTADO' : t.name === 'Crédito' ? 'CREDITO' : 'ALIADOS';
                const qtyData = salesCount.byType[typeKey];
                return (
                  <div key={t.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                      <span>{t.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <span className="text-muted-foreground">{qtyData?.count || 0} uds</span>
                      <span className={cn("font-medium", t.compliance >= 100 ? 'text-success' : t.compliance >= 80 ? 'text-warning' : 'text-destructive')}>
                        {t.compliance}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Mi Cumplimiento - with hover tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <KpiCard
                title="Mi Cumplimiento"
                value={`${compliance}%`}
                subtitle={compliance < 100 ? `${100 - compliance}% para meta` : '¡Meta alcanzada!'}
                icon={Target}
                status={compliance >= 100 ? 'success' : compliance >= 80 ? 'warning' : 'danger'}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="p-3 max-w-xs">
            <p className="font-semibold mb-2">Cumplimiento por Tipo</p>
            <div className="space-y-1 text-sm">
              {complianceByType.map(t => (
                <div key={t.name} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                    <span>{t.name}</span>
                  </div>
                  <span className={cn("font-medium", t.compliance >= 100 ? 'text-success' : t.compliance >= 80 ? 'text-warning' : 'text-destructive')}>
                    {t.compliance}%
                  </span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Row 2: Simple KPI cards */}
        <KpiCard
          title="Consultas"
          value={reportTotals.consultas.toString()}
          subtitle="Este mes"
          icon={MessageSquare}
        />
        <KpiCard
          title="Solicitudes"
          value={reportTotals.solicitudes.toString()}
          subtitle="Este mes"
          icon={FileText}
        />
        <KpiCard
          title="Mis Actividades"
          value={`${complianceStats.with_evidence}/${complianceStats.total_scheduled}`}
          subtitle={complianceStats.missing_evidence > 0 ? `${complianceStats.missing_evidence} pendiente(s)` : 'Todas completas'}
          icon={Calendar}
          status={complianceStats.missing_evidence === 0 ? 'success' : complianceStats.missing_evidence > 2 ? 'danger' : 'warning'}
          onClick={complianceStats.missing_evidence > 0 ? () => setCompliancePopupOpen(true) : undefined}
        />
      </motion.div>

      {/* Compliance Popup */}
      <CompliancePopup
        open={compliancePopupOpen}
        onOpenChange={setCompliancePopupOpen}
        advisorSummaries={advisorSummaries}
        title="Mis Actividades Pendientes"
      />

      {/* Ranking & Charts */}
      <motion.div variants={item} className="grid gap-6 lg:grid-cols-2">
        {/* My Ranking */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" />
              Mi Posición en el Ranking
            </CardTitle>
            <CardDescription>Tu lugar entre los asesores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-4">
              {/* Ranking Numbers */}
              <div className="flex gap-6 mb-6 flex-wrap justify-center">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">En mi Regional</p>
                  <div className="text-4xl font-bold text-secondary">
                    #{regionalPosition || '-'}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    de {regionalAdvisorCount || 0} asesores
                  </p>
                </div>
                {hasGroup && (
                  <div className="text-center border-l border-border pl-6">
                    <p className="text-sm text-muted-foreground mb-1">En mi Grupo</p>
                    <div className="text-4xl font-bold text-primary">
                      #{groupPosition || '-'}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      de {groupAdvisorCount || 0} asesores
                    </p>
                  </div>
                )}
              </div>

              {/* Sales Summary Box */}
              <div className="w-full mt-2 p-5 rounded-xl bg-primary/20 border border-primary/30">
                <p className="text-sm text-muted-foreground mb-1">Ventas acumuladas</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(metrics.total)}
                </p>
                <div className="mt-3 pt-3 border-t border-primary/20">
                  <p className="text-xs text-muted-foreground">Ventas Asesor No1</p>
                  <p className="text-lg font-medium text-muted-foreground">
                    {formatCurrency(topRegionalSales || 0)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Distribution */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-secondary" />
              Mis Ventas por Tipo
            </CardTitle>
            <CardDescription>Distribución de ventas en el mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.byType.filter(t => t.value > 0)} // Only show positive in pie
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {metrics.byType.filter(t => t.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {metrics.byType.map((type) => (
                  <div key={type.name} className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="text-sm text-foreground flex-1">{type.name}</span>
                    <span className={cn(
                      "text-sm font-semibold",
                      type.value < 0 ? "text-destructive" : "text-foreground"
                    )}>
                      {formatCurrency(type.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Budget vs Executed Chart */}
      <motion.div variants={item}>
        <Card className="card-elevated">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
              Presupuesto vs Ejecutado
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Mi cumplimiento por tipo de venta (en millones)</CardDescription>
          </CardHeader>
          <CardContent>
            {budgetVsExecuted.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No hay metas asignadas para este período
              </p>
            ) : (
              <div className="h-[220px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetVsExecuted} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-[10px] sm:text-xs" tickFormatter={(v) => `$${v}M`} />
                    <YAxis dataKey="name" type="category" width={70} className="text-[10px] sm:text-xs" />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string, props: { payload?: { presupuesto?: number; ejecutado?: number } }) => {
                        if (name === 'Ejecutado' && props.payload?.presupuesto) {
                          const complianceVal = props.payload.presupuesto > 0 
                            ? Math.round((value / props.payload.presupuesto) * 100) 
                            : 0;
                          return [`$${value.toFixed(1)}M (${complianceVal}%)`, name];
                        }
                        return [`$${value.toFixed(1)}M`, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="presupuesto" name="Presupuesto" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="ejecutado" name="Ejecutado" radius={[0, 4, 4, 0]}>
                      {budgetVsExecuted.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.ejecutado < 0 ? 'hsl(var(--danger))' : 'hsl(var(--primary))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
