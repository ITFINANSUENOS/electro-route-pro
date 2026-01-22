import { motion } from 'framer-motion';
import { useMemo } from 'react';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Target,
  AlertCircle,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function DashboardJefe() {
  const { profile, role } = useAuth();

  // Get date range - using November 2025 as the data period
  // TODO: Make this dynamic based on user selection or latest data available
  const startDateStr = '2025-11-01';
  const endDateStr = '2025-11-30';
  const currentMonth = 11;
  const currentYear = 2025;

  // Get regional_id from profile for filtering - ignore codigo_jefe due to data inconsistencies
  const regionalId = profile?.regional_id;

  // Fetch regional code for filtering
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

  // Fetch team advisors based on the same regional
  const { data: teamProfiles } = useQuery({
    queryKey: ['jefe-team-profiles', regionalId],
    queryFn: async () => {
      if (!regionalId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('codigo_asesor')
        .eq('regional_id', regionalId)
        .eq('activo', true)
        .not('codigo_asesor', 'is', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!regionalId,
  });

  const teamAdvisorCodes = useMemo(() => {
    return new Set(teamProfiles?.map(p => p.codigo_asesor).filter(Boolean) || []);
  }, [teamProfiles]);

  // Fetch sales for team - filter by codigo_asesor from team profiles
  const { data: salesData } = useQuery({
    queryKey: ['jefe-team-sales', regionalId, startDateStr],
    queryFn: async () => {
      if (!jefeRegional?.codigo) return [];
      
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .eq('cod_region', jefeRegional.codigo)
        .gte('fecha', startDateStr)
        .lte('fecha', endDateStr);
      
      if (error) throw error;
      return data;
    },
    enabled: !!jefeRegional?.codigo,
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

    // Group by tipo_venta
    const byType = Object.entries(
      salesData.reduce((acc, sale) => {
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
    const byAdvisorMap = salesData.reduce((acc, sale) => {
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
    const teamAdvisorCodes = new Set(byAdvisor.map(a => a.codigo));
    const totalMeta = metasData
      ?.filter(m => teamAdvisorCodes.has(m.codigo_asesor))
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
