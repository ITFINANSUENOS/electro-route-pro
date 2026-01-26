import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Target,
  AlertCircle,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Legend,
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

// Regional codes mapping: 106 PUERTO TEJADA joins 103 SANTANDER
// CALI (201) is equivalent to VALLE - handle both names/codes
const REGIONAL_CODE_MAPPING: Record<number, number[]> = {
  103: [103, 106], // SANTANDER includes PUERTO TEJADA
  201: [201],     // CALI/VALLE - same regional
};

const tipoAsesorLabels: Record<string, string> = {
  'INTERNO': 'Internos',
  'EXTERNO': 'Externos', 
  'CORRETAJE': 'Corretaje',
  'GERENCIA': 'Gerencia',
};

const tipoAsesorColors: Record<string, string> = {
  'INTERNO': 'hsl(var(--primary))',
  'EXTERNO': 'hsl(var(--success))',
  'CORRETAJE': 'hsl(var(--warning))',
  'GERENCIA': 'hsl(var(--secondary))',
};

export default function DashboardLider() {
  const { profile, role } = useAuth();
  const [selectedFilters, setSelectedFilters] = useState<TipoVentaKey[]>(['CONTADO', 'CREDICONTADO', 'CREDITO', 'CONVENIO']);

  // Get date range - using January 2026 as the data period
  const startDateStr = '2026-01-01';
  const endDateStr = '2026-01-31';
  const currentMonth = 1;
  const currentYear = 2026;

  // Determine if user is admin/coordinador (sees all data) or lider (sees regional data)
  const isGlobalRole = role === 'administrador' || role === 'coordinador_comercial' || role === 'administrativo';

  // First fetch the regional code for the leader
  const { data: leaderRegional, isLoading: isLoadingRegional } = useQuery({
    queryKey: ['leader-regional', profile?.regional_id],
    queryFn: async () => {
      if (!profile?.regional_id) return null;
      const { data, error } = await supabase
        .from('regionales')
        .select('codigo, nombre')
        .eq('id', profile.regional_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.regional_id && role === 'lider_zona',
  });

  // Get the list of regional codes to filter (includes mapped codes like 106->103)
  const regionalCodesToFilter = useMemo(() => {
    if (!leaderRegional?.codigo) return [];
    return REGIONAL_CODE_MAPPING[leaderRegional.codigo] || [leaderRegional.codigo];
  }, [leaderRegional?.codigo]);

  // Determine if the sales query should be enabled
  const salesQueryEnabled = useMemo(() => {
    if (isGlobalRole) return true; // Admin/Coordinador always sees everything
    if (role === 'lider_zona') return regionalCodesToFilter.length > 0;
    return !!profile;
  }, [isGlobalRole, role, regionalCodesToFilter, profile]);

  // Fetch real sales data - filter by regional for lider_zona (including mapped codes)
  // Use pagination to fetch ALL records (Supabase default limit is 1000)
  const { data: salesData, isLoading: isLoadingSales } = useQuery({
    queryKey: ['dashboard-sales', isGlobalRole ? 'all' : regionalCodesToFilter, role, startDateStr],
    queryFn: async () => {
      type SaleRow = {
        id: string;
        fecha: string;
        tipo_venta: string | null;
        vtas_ant_i: number;
        codigo_asesor: string;
        asesor_nombre: string | null;
        cod_region: number | null;
        [key: string]: unknown;
      };
      
      const allData: SaleRow[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        let query = supabase
          .from('ventas')
          .select('*')
          .gte('fecha', startDateStr)
          .lte('fecha', endDateStr)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        // If lider_zona, filter by their regional codes (can include multiple)
        // Admin/Coordinador sees ALL data without regional filter
        if (role === 'lider_zona' && regionalCodesToFilter.length > 0) {
          query = query.in('cod_region', regionalCodesToFilter);
        }
        
        const { data, error } = await query;
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
    enabled: salesQueryEnabled,
  });

  // Fetch metas - for lider, could filter by their asesores
  const { data: metasData } = useQuery({
    queryKey: ['dashboard-metas', role, currentMonth, currentYear],
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

  // Fetch profiles for advisor names
  const { data: profiles } = useQuery({
    queryKey: ['dashboard-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics including sales by advisor type
  const metrics = useMemo(() => {
    if (!salesData) return { total: 0, byType: [], byAdvisor: [], byAdvisorType: [], totalMeta: 0, advisorCount: 0, totalActiveAdvisors: 0, advisorsWithSales: 0 };

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
      color: tiposVentaColors[name as TipoVentaKey] || 'hsl(var(--muted))',
    }));

    // Group by advisor with their tipo_asesor from profiles
    // Normalize codes: LPAD with zeros to match profiles format (5 digits)
    const normalizeCode = (code: string): string => {
      const clean = (code || '').replace(/^0+/, '').trim();
      return clean.padStart(5, '0');
    };

    const byAdvisorMap = filteredSales.reduce((acc, sale) => {
      const advisorCode = sale.codigo_asesor;
      const normalizedCode = normalizeCode(advisorCode);
      
      if (!acc[advisorCode]) {
        // Match profile by normalized code (5-digit padded)
        const profile = profiles?.find(p => {
          const profileCode = normalizeCode(p.codigo_asesor || '');
          return profileCode === normalizedCode;
        });
        
        let tipoAsesor = profile?.tipo_asesor?.toUpperCase() || 'EXTERNO';
        
        // Special case: GERENCIA entries have code '01' or name contains 'GERENCIA'
        const nombre = sale.asesor_nombre?.toUpperCase() || '';
        if (advisorCode === '01' || advisorCode === '00001' || normalizedCode === '00001' || nombre.includes('GERENCIA')) {
          tipoAsesor = 'INTERNO'; // Count GERENCIA as INTERNO
        }
        
        acc[advisorCode] = { 
          codigo: advisorCode, 
          nombre: sale.asesor_nombre || advisorCode,
          tipoAsesor: tipoAsesor,
          total: 0, 
          byType: {} as Record<string, number>
        };
      }
      acc[advisorCode].total += sale.vtas_ant_i || 0;
      const tipo = sale.tipo_venta || 'OTRO';
      acc[advisorCode].byType[tipo] = (acc[advisorCode].byType[tipo] || 0) + (sale.vtas_ant_i || 0);
      return acc;
    }, {} as Record<string, { codigo: string; nombre: string; tipoAsesor: string; total: number; byType: Record<string, number> }>);

    const byAdvisor = Object.values(byAdvisorMap)
      .map(a => ({
        ...a,
        total: Math.abs(a.total),
        meta: metasData?.find(m => m.codigo_asesor === a.codigo)?.valor_meta || 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Group by tipo_asesor - get COUNTS from profiles (source of truth), SALES from ventas
    // First, get actual advisor counts from profiles table
    const profileCountsByType = (profiles || [])
      .filter(p => p.activo && p.codigo_asesor)
      .reduce((acc, p) => {
        const tipo = (p.tipo_asesor?.toUpperCase()) || 'EXTERNO';
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Get sales totals by advisor type from actual sales data
    // GERENCIA entries are counted as INTERNO
    const salesTotalsByType = byAdvisor.reduce((acc, advisor) => {
      // Map GERENCIA to INTERNO for totals
      const tipo = advisor.tipoAsesor === 'GERENCIA' ? 'INTERNO' : (advisor.tipoAsesor || 'EXTERNO');
      acc[tipo] = (acc[tipo] || 0) + advisor.total;
      return acc;
    }, {} as Record<string, number>);

    // Combine: counts from profiles, totals from sales
    // Only show INTERNO, EXTERNO, CORRETAJE (GERENCIA is merged into INTERNO)
    const displayTypes = ['INTERNO', 'EXTERNO', 'CORRETAJE'];
    const byAdvisorType = displayTypes
      .filter(tipo => (profileCountsByType[tipo] || 0) > 0 || (salesTotalsByType[tipo] || 0) > 0)
      .map(tipo => ({
        tipo,
        label: tipoAsesorLabels[tipo] || tipo,
        count: profileCountsByType[tipo] || 0,
        total: salesTotalsByType[tipo] || 0,
        color: tipoAsesorColors[tipo] || 'hsl(var(--muted))',
      }))
      .sort((a, b) => b.total - a.total);

    const totalMeta = metasData?.reduce((sum, m) => sum + m.valor_meta, 0) || 0;

    // Count unique advisors with sales (excluding code '01' which is GERENCIA)
    const advisorsWithSales = new Set(byAdvisor.filter(a => a.codigo !== '01' && a.codigo !== '00001').map(a => a.codigo));
    
    // Total active advisors from profiles (for display when sales data is low)
    const totalActiveAdvisors = profiles?.filter(p => p.activo && p.codigo_asesor).length || 0;

    return {
      total: byType.reduce((sum, t) => sum + t.value, 0),
      byType,
      byAdvisor,
      byAdvisorType,
      totalMeta,
      advisorCount: Math.max(advisorsWithSales.size, totalActiveAdvisors),
      advisorsWithSales: advisorsWithSales.size,
      totalActiveAdvisors,
    };
  }, [salesData, metasData, profiles]);

  // Calculate budget vs executed by type
  const budgetVsExecuted = useMemo(() => {
    if (!metasData || !salesData) return [];

    const tiposVenta: TipoVentaKey[] = ['CONTADO', 'CREDICONTADO', 'CREDITO', 'CONVENIO'];
    
    return tiposVenta.map(tipo => {
      const presupuesto = metasData
        .filter(m => m.tipo_meta === tipo.toLowerCase())
        .reduce((sum, m) => sum + m.valor_meta, 0);
      
      const ejecutado = Math.abs(
        salesData
          .filter(s => s.tipo_venta === tipo)
          .reduce((sum, s) => sum + (s.vtas_ant_i || 0), 0)
      );

      return {
        name: tiposVentaLabels[tipo],
        presupuesto: presupuesto / 1000000,
        ejecutado: ejecutado / 1000000,
      };
    });
  }, [metasData, salesData]);

  // Advisors at risk of not meeting goals
  const advisorsAtRisk = useMemo(() => {
    const dayOfMonth = 19; // Current day
    const daysInMonth = 31;
    const projectionFactor = daysInMonth / dayOfMonth;

    return metrics.byAdvisor
      .filter(a => a.meta > 0)
      .map(a => ({
        ...a,
        projected: a.total * projectionFactor,
        compliance: (a.total / a.meta) * 100,
        projectedCompliance: ((a.total * projectionFactor) / a.meta) * 100,
      }))
      .filter(a => a.projectedCompliance < 100)
      .sort((a, b) => a.projectedCompliance - b.projectedCompliance)
      .slice(0, 5);
  }, [metrics.byAdvisor]);

  // Filter ranking by selected types
  const filteredRanking = useMemo(() => {
    if (selectedFilters.length === 0) return metrics.byAdvisor;
    
    return metrics.byAdvisor
      .map(advisor => {
        const filteredTotal = selectedFilters.reduce((sum, tipo) => {
          return sum + Math.abs(advisor.byType[tipo] || 0);
        }, 0);
        return { ...advisor, filteredTotal };
      })
      .sort((a, b) => b.filteredTotal - a.filteredTotal);
  }, [metrics.byAdvisor, selectedFilters]);

  const toggleFilter = (tipo: TipoVentaKey) => {
    setSelectedFilters(prev => 
      prev.includes(tipo) 
        ? prev.filter(t => t !== tipo)
        : [...prev, tipo]
    );
  };

  const compliance = metrics.totalMeta > 0 
    ? Math.round((metrics.total / metrics.totalMeta) * 100) 
    : 0;

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
            {role && roleLabels[role]} • Hoy es {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ventas del Mes"
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
          title="Asesores Activos"
          value={metrics.totalActiveAdvisors.toString()}
          subtitle={`${metrics.advisorsWithSales} con ventas este mes`}
          icon={Users}
        />
        <KpiCard
          title="Asesores en Riesgo"
          value={advisorsAtRisk.length.toString()}
          subtitle="No proyectan cumplir"
          icon={AlertTriangle}
          status={advisorsAtRisk.length > 3 ? 'danger' : advisorsAtRisk.length > 0 ? 'warning' : 'success'}
        />
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={item} className="grid gap-6 lg:grid-cols-2">
        {/* Sales by Type Pie Chart */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-secondary" />
              Distribución de Ventas por Tipo
            </CardTitle>
            <CardDescription>Ventas acumuladas al 19 de enero</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center">
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.byType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
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

        {/* Budget vs Executed */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-secondary" />
              Presupuesto vs Ejecutado
            </CardTitle>
            <CardDescription>Comparativo por tipo de venta (en millones)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetVsExecuted} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" tickFormatter={(v) => `$${v}M`} />
                  <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                    formatter={(value: number) => [`$${value.toFixed(1)}M`, '']}
                  />
                  <Legend />
                  <Bar dataKey="presupuesto" name="Presupuesto" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="ejecutado" name="Ejecutado" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sales by Advisor Type */}
      <motion.div variants={item}>
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-secondary" />
              Ventas por Tipo de Asesor
            </CardTitle>
            <CardDescription>Distribución de ventas según clasificación de asesores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {metrics.byAdvisorType.map((tipo) => (
                <div
                  key={tipo.tipo}
                  className="p-4 rounded-lg border"
                  style={{ borderLeftColor: tipo.color, borderLeftWidth: 4 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{tipo.label}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {tipo.count} asesores
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(tipo.total)}</p>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{ 
                        width: `${Math.min((tipo.total / metrics.total) * 100, 100)}%`,
                        backgroundColor: tipo.color,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((tipo.total / metrics.total) * 100).toFixed(1)}% del total
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid gap-6 lg:grid-cols-3">
        {/* Advisors at Risk */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Asesores en Riesgo
            </CardTitle>
            <CardDescription>No proyectan cumplir la meta</CardDescription>
          </CardHeader>
          <CardContent>
            {advisorsAtRisk.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>¡Todos los asesores proyectan cumplir!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {advisorsAtRisk.map((advisor) => (
                  <div
                    key={advisor.codigo}
                    className="p-3 rounded-lg border bg-danger/5 border-danger/20"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">{advisor.nombre}</span>
                      <StatusBadge 
                        status={advisor.projectedCompliance < 50 ? 'danger' : 'warning'} 
                        label={`${Math.round(advisor.projectedCompliance)}% proy.`} 
                        size="sm" 
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Actual: {formatCurrency(advisor.total)}</span>
                      <span>Meta: {formatCurrency(advisor.meta)}</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-danger transition-all"
                        style={{ width: `${Math.min(advisor.compliance, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ranking Table */}
        <Card className="card-elevated lg:col-span-2">
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
                  {filteredRanking.slice(0, 15).map((advisor, index) => {
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
    </motion.div>
  );
}
