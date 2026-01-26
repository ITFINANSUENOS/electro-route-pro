import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Target,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabels } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
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

const tiposVentaLabels: Record<string, string> = {
  CONTADO: 'Contado',
  CREDICONTADO: 'Credi Contado',
  CREDITO: 'Crédito',
  CONVENIO: 'Convenio',
};

type TipoVentaKey = 'CONTADO' | 'CREDICONTADO' | 'CREDITO' | 'CONVENIO';

export default function DashboardJefe() {
  const { profile, role } = useAuth();
  const [selectedFilters, setSelectedFilters] = useState<TipoVentaKey[]>(['CONTADO', 'CREDICONTADO', 'CREDITO', 'CONVENIO']);

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
        .select('codigo_asesor, nombre_completo, tipo_asesor')
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

    // Group by advisor
    const byAdvisorMap = filteredSales.reduce((acc, sale) => {
      const advisor = sale.codigo_asesor;
      if (!acc[advisor]) {
        acc[advisor] = { codigo: advisor, nombre: sale.asesor_nombre || advisor, total: 0 };
      }
      acc[advisor].total += sale.vtas_ant_i || 0;
      return acc;
    }, {} as Record<string, { codigo: string; nombre: string; total: number }>);

    const byAdvisor = Object.values(byAdvisorMap)
      .map(a => ({
        ...a,
        total: Math.abs(a.total),
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
  }, [salesData, metasData]);

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

  // Filtered ranking based on selected types
  const filteredRanking = useMemo(() => {
    if (selectedFilters.length === 0) return metrics.byAdvisor;
    
    return metrics.byAdvisor.map(advisor => {
      // Calculate total based on selected filters (using byType from sales)
      const salesForAdvisor = salesData?.filter(s => s.codigo_asesor === advisor.codigo) || [];
      const filteredTotal = salesForAdvisor
        .filter(s => selectedFilters.includes(s.tipo_venta as TipoVentaKey))
        .reduce((sum, s) => sum + Math.abs(s.vtas_ant_i || 0), 0);
      
      return {
        ...advisor,
        filteredTotal,
      };
    }).sort((a, b) => b.filteredTotal - a.filteredTotal);
  }, [metrics.byAdvisor, salesData, selectedFilters]);

  // Calculate incompliance
  const incompliance = useMemo(() => {
    // Get unique advisors from sales
    const advisors = new Set(salesData?.map(s => s.codigo_asesor) || []);
    
    // Check which advisors haven't reported
    const advisorsWithReports = new Set(reportesData?.map(r => r.user_id) || []);
    
    // For demo, we'll show mock incompliance data
    return {
      sinFoto: 2,
      sinGPS: 3,
      sinConsultas: 1,
    };
  }, [salesData, reportesData]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            ¡Bienvenido, {profile?.nombre_completo?.split(' ')[0] || 'Usuario'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {role && roleLabels[role]} • Equipo de {metrics.byAdvisor.length} asesores
          </p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ventas del Equipo"
          value={formatCurrency(metrics.total)}
          subtitle={`Meta: ${formatCurrency(metrics.totalMeta)}`}
          icon={ShoppingCart}
          status={compliance >= 80 ? 'success' : compliance >= 50 ? 'warning' : 'danger'}
        />
        <KpiCard
          title="Cumplimiento"
          value={`${compliance}%`}
          subtitle={`${100 - compliance}% para meta`}
          icon={Target}
          status={compliance >= 80 ? 'success' : compliance >= 50 ? 'warning' : 'danger'}
        />
        <KpiCard
          title="Asesores en Equipo"
          value={metrics.byAdvisor.length.toString()}
          subtitle="Con ventas este mes"
          icon={Users}
        />
        <KpiCard
          title="Consultas del Equipo"
          value={reportesData?.reduce((sum, r) => sum + (r.consultas || 0), 0).toString() || '0'}
          subtitle="Este mes"
          icon={TrendingUp}
        />
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={item} className="grid gap-6 lg:grid-cols-2">
        {/* Sales by Type Pie Chart */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-secondary" />
              Ventas del Equipo por Tipo
            </CardTitle>
            <CardDescription>Distribución acumulada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] flex items-center">
              <ResponsiveContainer width="55%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.byType}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {metrics.byType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
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
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(type.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

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

      {/* Ranking Table with Filters */}
      <motion.div variants={item}>
        <Card className="card-elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-secondary" />
                  Ranking de Asesores
                </CardTitle>
                <CardDescription>Ordenados por ventas según filtro</CardDescription>
              </div>
            </div>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mt-4">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Filter className="h-4 w-4" />
                Filtrar:
              </span>
              {(Object.keys(tiposVentaLabels) as TipoVentaKey[]).map((tipo) => (
                <label
                  key={tipo}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedFilters.includes(tipo)}
                    onCheckedChange={() => toggleFilter(tipo)}
                  />
                  <span className="text-sm">{tiposVentaLabels[tipo]}</span>
                </label>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Pos.</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Asesor</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Ventas</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Meta</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRanking.map((advisor, index) => {
                    const displayTotal = selectedFilters.length > 0 
                      ? (advisor as any).filteredTotal 
                      : advisor.total;
                    const compliancePercent = advisor.meta > 0 
                      ? Math.round((displayTotal / advisor.meta) * 100) 
                      : 0;

                    return (
                      <tr key={advisor.codigo} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-100 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-medium truncate max-w-[150px]">
                          {advisor.nombre}
                        </td>
                        <td className="py-3 px-2 text-right">{formatCurrency(displayTotal)}</td>
                        <td className="py-3 px-2 text-right text-muted-foreground">
                          {advisor.meta > 0 ? formatCurrency(advisor.meta) : '-'}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {advisor.meta > 0 ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              compliancePercent >= 100 ? 'bg-success/10 text-success' :
                              compliancePercent >= 80 ? 'bg-warning/10 text-warning' :
                              'bg-danger/10 text-danger'
                            }`}>
                              {compliancePercent}%
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Incompliance Section */}
      <motion.div variants={item}>
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Indicadores de Incumplimiento
            </CardTitle>
            <CardDescription>Asesores con registros pendientes hoy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-danger/10 border border-danger/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sin evidencia fotográfica</span>
                  <StatusBadge status="danger" label={`${incompliance.sinFoto}`} size="sm" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  No subieron foto de actividad
                </p>
              </div>
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sin registro GPS</span>
                  <StatusBadge status="warning" label={`${incompliance.sinGPS}`} size="sm" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  No validaron ubicación
                </p>
              </div>
              <div className="p-4 rounded-lg bg-accent border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sin consultas/solicitudes</span>
                  <StatusBadge status="neutral" label={`${incompliance.sinConsultas}`} size="sm" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cerraron sin registrar gestión
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
