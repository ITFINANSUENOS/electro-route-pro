import { motion } from 'framer-motion';
import { useMemo } from 'react';
import {
  ShoppingCart,
  Target,
  MessageSquare,
  FileText,
  Trophy,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabels } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
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

export default function DashboardAsesor() {
  const { profile, role, user } = useAuth();

  // Get date range - using January 2026 as the data period
  const startDateStr = '2026-01-01';
  const endDateStr = '2026-01-31';
  const currentMonth = 1;
  const currentYear = 2026;

  // Get advisor identifiers from profile (3 keys: cedula, codigo, nombre)
  const codigoAsesor = (profile as any)?.codigo_asesor;
  const cedulaAsesor = (profile as any)?.cedula;
  const nombreAsesor = (profile as any)?.nombre_completo;

  // Fetch own sales data using multi-key matching
  const { data: salesData } = useQuery({
    queryKey: ['asesor-sales', codigoAsesor, cedulaAsesor, nombreAsesor, startDateStr],
    queryFn: async () => {
      // Need at least one identifier
      if (!codigoAsesor && !cedulaAsesor && !nombreAsesor) return [];
      
      // RLS policy handles the multi-key matching, just fetch all accessible sales
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .gte('fecha', startDateStr)
        .lte('fecha', endDateStr);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!(codigoAsesor || cedulaAsesor || nombreAsesor),
  });

  // Fetch own meta (metas use codigo_asesor as primary key)
  const { data: metaData } = useQuery({
    queryKey: ['asesor-meta', codigoAsesor, currentMonth],
    queryFn: async () => {
      if (!codigoAsesor) return null;
      
      const { data, error } = await supabase
        .from('metas')
        .select('*')
        .eq('codigo_asesor', codigoAsesor)
        .eq('mes', currentMonth)
        .eq('anio', currentYear);
      
      if (error) throw error;
      return data;
    },
    enabled: !!codigoAsesor,
  });

  // Fetch daily reports for consultas/solicitudes
  const { data: reportesData } = useQuery({
    queryKey: ['asesor-reportes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('reportes_diarios')
        .select('*')
        .eq('user_id', user.id)
        .gte('fecha', '2026-01-01')
        .lte('fecha', '2026-01-31');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate advisor's ranking using multi-key matching
  const { data: rankingData } = useQuery({
    queryKey: ['asesor-ranking', codigoAsesor, cedulaAsesor, nombreAsesor, startDateStr],
    queryFn: async () => {
      // Fetch all sales for ranking calculation (uses service role on backend for full view)
      // For the advisor, we use their own sales data which is already filtered by RLS
      if (!salesData || salesData.length === 0) {
        return { position: 0, total: 0 };
      }
      
      // Get total sales for this advisor (excluding OTROS)
      const mySales = salesData
        .filter(sale => sale.tipo_venta !== 'OTROS')
        .reduce((sum, sale) => sum + Math.abs(sale.vtas_ant_i || 0), 0);
      
      // For now, show position based on own data
      // Full ranking requires leader/admin view
      return { 
        position: mySales > 0 ? 1 : 0, 
        total: 1,
        mySales 
      };
    },
    enabled: !!(codigoAsesor || cedulaAsesor || nombreAsesor) && !!salesData,
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!salesData) return { total: 0, byType: [], totalMeta: 0 };

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
      key: name,
      value: Math.abs(value as number),
      color: tiposVentaColors[name as keyof typeof tiposVentaColors] || 'hsl(var(--muted))',
    }));

    const totalMeta = metaData?.reduce((sum, m) => sum + m.valor_meta, 0) || 0;

    return {
      total: byType.reduce((sum, t) => sum + t.value, 0),
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

  // Compliance by type
  const complianceByType = useMemo(() => {
    if (!metaData || !metrics.byType.length) return [];

    return metrics.byType.map(tipo => {
      const meta = metaData.find(m => m.tipo_meta?.toUpperCase() === tipo.key);
      const metaValue = meta?.valor_meta || 0;
      const compliance = metaValue > 0 ? Math.round((tipo.value / metaValue) * 100) : 0;

      return {
        name: tipo.name,
        ventas: tipo.value,
        meta: metaValue,
        compliance,
        color: tipo.color,
      };
    }).filter(t => t.meta > 0);
  }, [metaData, metrics.byType]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold text-foreground">
          ¡Bienvenido, {profile?.nombre_completo?.split(' ')[0] || 'Usuario'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          {role && roleLabels[role]} • {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Mis Ventas del Mes"
          value={formatCurrency(metrics.total)}
          subtitle={`Meta: ${formatCurrency(metrics.totalMeta)}`}
          icon={ShoppingCart}
          status={compliance >= 80 ? 'success' : compliance >= 50 ? 'warning' : 'danger'}
        />
        <KpiCard
          title="Mi Cumplimiento"
          value={`${compliance}%`}
          subtitle={compliance < 100 ? `${100 - compliance}% para meta` : '¡Meta alcanzada!'}
          icon={Target}
          status={compliance >= 100 ? 'success' : compliance >= 80 ? 'warning' : 'danger'}
        />
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
      </motion.div>

      {/* Ranking & Charts */}
      <motion.div variants={item} className="grid gap-6 lg:grid-cols-2">
        {/* My Ranking */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" />
              Mi Posición en el Ranking
            </CardTitle>
            <CardDescription>Tu lugar entre los asesores de tu regional</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="text-6xl font-bold text-primary">
                  #{rankingData?.position || '-'}
                </div>
                <p className="text-lg text-muted-foreground mt-2">
                  de {rankingData?.total || '-'} asesores
                </p>
                <div className="mt-4 p-4 rounded-lg bg-accent">
                  <p className="text-sm text-muted-foreground">Ventas acumuladas</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {formatCurrency(metrics.total)}
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
                    data={metrics.byType}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
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
      </motion.div>

      {/* Compliance by Type */}
      <motion.div variants={item}>
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-secondary" />
              Cumplimiento por Tipo de Venta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {complianceByType.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">
                No hay metas asignadas para este período
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {complianceByType.map((tipo) => (
                  <div
                    key={tipo.name}
                    className="p-4 rounded-lg border"
                    style={{ borderLeftColor: tipo.color, borderLeftWidth: 4 }}
                  >
                    <p className="text-sm font-medium text-foreground">{tipo.name}</p>
                    <div className="flex items-end justify-between mt-2">
                      <div>
                        <p className="text-2xl font-bold">{tipo.compliance}%</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(tipo.ventas)} / {formatCurrency(tipo.meta)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{ 
                          width: `${Math.min(tipo.compliance, 100)}%`,
                          backgroundColor: tipo.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
