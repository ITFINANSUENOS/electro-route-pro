import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Filter,
  Calendar,
  TrendingUp,
  Users,
  ShoppingCart,
  AlertTriangle,
  Camera,
  MapPin,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KpiCard } from '@/components/ui/kpi-card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const tiposVentaLabels: Record<string, string> = {
  CONTADO: 'Contado',
  CREDICONTADO: 'Credi Contado',
  CREDITO: 'Crédito',
  CONVENIO: 'Convenio',
};

const tiposVentaColors: Record<string, string> = {
  CONTADO: '#10b981',
  CREDICONTADO: '#f59e0b',
  CREDITO: '#3b82f6',
  CONVENIO: '#8b5cf6',
};

const tiposAsesorLabels: Record<string, string> = {
  INTERNO: 'Interno',
  EXTERNO: 'Externo',
  CORRETAJE: 'Corretaje',
};

const tiposAsesorColors: Record<string, string> = {
  INTERNO: '#22c55e',
  EXTERNO: '#3b82f6',
  CORRETAJE: '#f59e0b',
};

// Regional codes mapping: 106 PUERTO TEJADA joins 103 SANTANDER
// This is outside the component to avoid recreation on each render
const REGIONAL_CODE_MAPPING: Record<number, number[]> = {
  103: [103, 106], // SANTANDER includes PUERTO TEJADA
};

export default function Reportes() {
  const { role, profile } = useAuth();
  const [selectedAsesor, setSelectedAsesor] = useState<string>('all');
  const [selectedTipoVenta, setSelectedTipoVenta] = useState<string>('all');
  const [selectedRegional, setSelectedRegional] = useState<string>('all');
  const [selectedTipoAsesor, setSelectedTipoAsesor] = useState<string>('all');

  // Get date range - using January 2026 as the data period
  const startDateStr = '2026-01-01';
  const endDateStr = '2026-01-31';
  const currentMonth = 1;
  const currentYear = 2026;

  // Fetch ventas data
  const { data: ventas = [] } = useQuery({
    queryKey: ['ventas-reportes', startDateStr],
    queryFn: async () => {
      type SaleRow = {
        id: string;
        fecha: string;
        tipo_venta: string | null;
        vtas_ant_i: number;
        total: number | null;
        codigo_asesor: string;
        asesor_nombre: string | null;
        cod_region: number | null;
        codigo_jefe: string | null;
        cedula_asesor: string | null;
        sede: string | null;
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
  });

  // Fetch metas
  const { data: metas = [] } = useQuery({
    queryKey: ['metas-reportes', currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas')
        .select('*')
        .eq('mes', currentMonth)
        .eq('anio', currentYear);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-reportes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('activo', true);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch reportes diarios
  const { data: reportesDiarios = [] } = useQuery({
    queryKey: ['reportes-diarios', startDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reportes_diarios')
        .select('*')
        .gte('fecha', startDateStr)
        .lte('fecha', endDateStr);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch regionales for coordinador filter and lider_zona regional mapping
  const { data: regionales = [], isLoading: regionalesLoading } = useQuery({
    queryKey: ['regionales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regionales')
        .select('*')
        .eq('activo', true);
      if (error) throw error;
      return data || [];
    },
    enabled: role === 'coordinador_comercial' || role === 'administrador' || role === 'lider_zona',
  });

  // Create a map of codigo_asesor to tipo_asesor from profiles
  // Normalize codes to 5 digits with leading zeros for consistent matching
  const normalizeCode = (code: string): string => {
    const clean = (code || '').replace(/^0+/, '').trim();
    return clean.padStart(5, '0');
  };

  const asesorTipoMap = useMemo(() => {
    const map = new Map<string, string>();
    profiles.forEach((p) => {
      if (p.codigo_asesor) {
        const normalizedCode = normalizeCode(p.codigo_asesor);
        // GERENCIA (code 01 or 00001) counts as INTERNO
        let tipoAsesor = p.tipo_asesor?.toUpperCase() || 'EXTERNO';
        if (normalizedCode === '00001') {
          tipoAsesor = 'INTERNO';
        }
        map.set(p.codigo_asesor, tipoAsesor);
        map.set(normalizedCode, tipoAsesor);
      }
    });
    return map;
  }, [profiles]);

  // Get unique asesores from ventas
  const asesores = useMemo(() => {
    const uniqueAsesores = new Map();
    ventas.forEach((v) => {
      if (v.codigo_asesor && v.asesor_nombre) {
        uniqueAsesores.set(v.codigo_asesor, v.asesor_nombre);
      }
    });
    return Array.from(uniqueAsesores.entries()).map(([codigo, nombre]) => ({
      codigo,
      nombre,
    }));
  }, [ventas]);

  // Get team advisor codes for jefe_ventas filtering (by codigo_jefe)
  const teamAdvisorCodes = useMemo(() => {
    if (role !== 'jefe_ventas' || !(profile as any)?.codigo_jefe) return null;
    const codigoJefe = (profile as any).codigo_jefe;
    return new Set(
      profiles
        .filter(p => p.codigo_jefe === codigoJefe && p.codigo_asesor)
        .map(p => p.codigo_asesor)
    );
  }, [role, (profile as any)?.codigo_jefe, profiles]);

  // Get leader's regional codes (including mapped ones like 106->103)
  const leaderRegionalCodes = useMemo(() => {
    if (role !== 'lider_zona' || !profile?.regional_id) return null;
    
    // Wait for regionales to load
    if (regionalesLoading) return undefined;
    
    const leaderRegional = regionales.find(r => r.id === profile.regional_id);
    if (!leaderRegional) {
      // Regional not found after loading, return null (no filter)
      return null;
    }
    
    // Return mapped codes (e.g., 103 includes 106) or just the single code
    return REGIONAL_CODE_MAPPING[leaderRegional.codigo] || [leaderRegional.codigo];
  }, [role, profile?.regional_id, regionales, regionalesLoading]);

  // Filter ventas based on selections
  const filteredVentas = useMemo(() => {
    let filtered = ventas;

    // For lider_zona, filter by their regional codes first (including mapped codes)
    // Only apply filter once leaderRegionalCodes is loaded (not undefined)
    if (role === 'lider_zona') {
      if (leaderRegionalCodes === undefined) {
        // Still loading regionales, don't filter yet
        return [];
      }
      if (leaderRegionalCodes) {
        filtered = filtered.filter((v) => leaderRegionalCodes.includes(v.cod_region || 0));
      }
    }

    if (selectedAsesor !== 'all') {
      filtered = filtered.filter((v) => v.codigo_asesor === selectedAsesor);
    }

    if (selectedTipoVenta !== 'all') {
      filtered = filtered.filter((v) => v.tipo_venta === selectedTipoVenta);
    }

    if (selectedRegional !== 'all') {
      filtered = filtered.filter((v) => v.cod_region?.toString() === selectedRegional);
    }

    // Filter by tipo_asesor (considering GERENCIA/GENERAL as INTERNO)
    if (selectedTipoAsesor !== 'all') {
      filtered = filtered.filter((v) => {
        const codigo = v.codigo_asesor || '';
        const normalizedCode = normalizeCode(codigo);
        const nombre = (v.asesor_nombre || '').toUpperCase();
        
        // Check for GERENCIA/GENERAL entries
        const isGerencia = codigo === '01' || normalizedCode === '00001' || 
          nombre.includes('GENERAL') || nombre.includes('GERENCIA');
        
        const tipoAsesor = isGerencia ? 'INTERNO' : (asesorTipoMap.get(codigo) || asesorTipoMap.get(normalizedCode) || 'EXTERNO');
        return tipoAsesor === selectedTipoAsesor;
      });
    }

    // For jefe_ventas, filter by team advisor codes (based on regional)
    if (role === 'jefe_ventas' && teamAdvisorCodes) {
      filtered = filtered.filter((v) => teamAdvisorCodes.has(v.codigo_asesor || ''));
    }

    return filtered;
  }, [ventas, selectedAsesor, selectedTipoVenta, selectedRegional, selectedTipoAsesor, asesorTipoMap, role, teamAdvisorCodes, leaderRegionalCodes]);

  // Calculate metrics - use vtas_ant_i for consistency with dashboard
  // Exclude "OTROS" from sales totals (REBATE, ARRENDAMIENTO, etc.)
  const metrics = useMemo(() => {
    // Wait for profiles to be loaded for accurate tipo_asesor mapping
    if (profiles.length === 0) return { totalVentas: 0, totalMetas: 0, cumplimiento: 0, asesoresActivos: 0, ventasPorTipo: {}, ventasPorTipoAsesor: {} };
    
    const salesForMetrics = filteredVentas.filter(v => v.tipo_venta !== 'OTROS');
    const totalVentas = salesForMetrics.reduce((sum, v) => sum + Math.abs(v.vtas_ant_i || 0), 0);
    const totalMetas = metas.reduce((sum, m) => sum + m.valor_meta, 0);
    const cumplimiento = totalMetas > 0 ? (totalVentas / totalMetas) * 100 : 0;
    const asesoresActivos = new Set(salesForMetrics.map((v) => v.codigo_asesor)).size;

    // Ventas por tipo de venta (exclude OTROS)
    const ventasPorTipo: Record<string, number> = {};
    salesForMetrics.forEach((v) => {
      const tipo = v.tipo_venta || 'OTRO';
      ventasPorTipo[tipo] = (ventasPorTipo[tipo] || 0) + Math.abs(v.vtas_ant_i || 0);
    });

    // Ventas por tipo de asesor - check both raw and normalized codes
    // Also handle GERENCIA/GENERAL (code 01/00001) as INTERNO
    const ventasPorTipoAsesor: Record<string, number> = {};
    salesForMetrics.forEach((v) => {
      const codigo = v.codigo_asesor || '';
      const normalizedCode = normalizeCode(codigo);
      const nombre = (v.asesor_nombre || '').toUpperCase();
      
      // Check for GERENCIA/GENERAL entries - should be counted as INTERNO
      const isGerencia = codigo === '01' || normalizedCode === '00001' || nombre.includes('GENERAL') || nombre.includes('GERENCIA');
      let tipoAsesor: string;
      if (isGerencia) {
        tipoAsesor = 'INTERNO';
      } else {
        tipoAsesor = asesorTipoMap.get(codigo) || asesorTipoMap.get(normalizedCode) || 'EXTERNO';
      }
      
      ventasPorTipoAsesor[tipoAsesor] = (ventasPorTipoAsesor[tipoAsesor] || 0) + Math.abs(v.vtas_ant_i || 0);
    });

    return {
      totalVentas,
      totalMetas,
      cumplimiento,
      asesoresActivos,
      ventasPorTipo,
      ventasPorTipoAsesor,
    };
  }, [filteredVentas, metas, asesorTipoMap, profiles]);

  // Calculate incompliance data
  const incumplimientos = useMemo(() => {
    const asesoresMap = new Map<string, {
      nombre: string;
      sinFoto: number;
      sinGPS: number;
      sinConsultas: number;
      diasReportados: number;
    }>();

    // Initialize with all profiles
    profiles.forEach((p) => {
      if (p.codigo_asesor) {
        asesoresMap.set(p.codigo_asesor, {
          nombre: p.nombre_completo,
          sinFoto: 0,
          sinGPS: 0,
          sinConsultas: 0,
          diasReportados: 0,
        });
      }
    });

    // Count incompliances from reportes_diarios
    reportesDiarios.forEach((r) => {
      const profile = profiles.find((p) => p.user_id === r.user_id);
      if (profile?.codigo_asesor) {
        const data = asesoresMap.get(profile.codigo_asesor);
        if (data) {
          data.diasReportados++;
          if (!r.foto_url) data.sinFoto++;
          if (!r.gps_latitud || !r.gps_longitud) data.sinGPS++;
          if ((r.consultas || 0) === 0 && (r.solicitudes || 0) === 0) data.sinConsultas++;
        }
      }
    });

    return Array.from(asesoresMap.values()).filter(
      (a) => a.sinFoto > 0 || a.sinGPS > 0 || a.sinConsultas > 0
    );
  }, [profiles, reportesDiarios]);

  // Budget vs Executed chart data - use vtas_ant_i for consistency with dashboard
  const budgetVsExecuted = useMemo(() => {
    const tipos = ['CONTADO', 'CREDICONTADO', 'CREDITO', 'CONVENIO'];
    return tipos.map((tipo) => {
      const ventasTipo = filteredVentas
        .filter((v) => v.tipo_venta === tipo)
        .reduce((sum, v) => sum + Math.abs(v.vtas_ant_i || 0), 0);
      const metasTipo = metas
        .filter((m) => m.tipo_meta === tipo)
        .reduce((sum, m) => sum + m.valor_meta, 0);

      return {
        tipo: tiposVentaLabels[tipo] || tipo,
        ejecutado: ventasTipo,
        presupuesto: metasTipo,
      };
    });
  }, [filteredVentas, metas]);

  // Consultas y solicitudes totales
  const totalConsultas = reportesDiarios.reduce((sum, r) => sum + (r.consultas || 0), 0);
  const totalSolicitudes = reportesDiarios.reduce((sum, r) => sum + (r.solicitudes || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reportes y Análisis</h1>
          <p className="text-muted-foreground mt-1">
            Visualiza el rendimiento comercial con métricas detalladas
          </p>
        </div>
        <Button className="btn-brand">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Filters */}
      <Card className="card-elevated">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
            </div>

            {/* Asesor filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Asesor:</span>
              <Select value={selectedAsesor} onValueChange={setSelectedAsesor}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {asesores.map((a) => (
                    <SelectItem key={a.codigo} value={a.codigo}>
                      {a.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo venta filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tipo:</span>
              <Select value={selectedTipoVenta} onValueChange={setSelectedTipoVenta}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="CONTADO">Contado</SelectItem>
                  <SelectItem value="CREDICONTADO">Credi Contado</SelectItem>
                  <SelectItem value="CREDITO">Crédito</SelectItem>
                  <SelectItem value="CONVENIO">Convenio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo asesor filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tipo Asesor:</span>
              <Select value={selectedTipoAsesor} onValueChange={setSelectedTipoAsesor}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="INTERNO">Interno</SelectItem>
                  <SelectItem value="EXTERNO">Externo</SelectItem>
                  <SelectItem value="CORRETAJE">Corretaje</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Regional filter for coordinador */}
            {(role === 'coordinador_comercial' || role === 'administrador') && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Regional:</span>
                <Select value={selectedRegional} onValueChange={setSelectedRegional}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {regionales.map((r) => (
                      <SelectItem key={r.id} value={r.codigo.toString()}>
                        {r.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ventas Totales"
          value={formatCurrency(metrics.totalVentas)}
          subtitle="Enero 2026"
          icon={ShoppingCart}
          status="success"
        />
        <KpiCard
          title="Cumplimiento Global"
          value={`${metrics.cumplimiento.toFixed(1)}%`}
          subtitle="vs Meta"
          icon={TrendingUp}
          status={metrics.cumplimiento >= 80 ? 'success' : metrics.cumplimiento >= 60 ? 'warning' : 'danger'}
        />
        <KpiCard
          title="Consultas"
          value={totalConsultas.toString()}
          subtitle="Total del mes"
          icon={MessageSquare}
        />
        <KpiCard
          title="Solicitudes"
          value={totalSolicitudes.toString()}
          subtitle="Total del mes"
          icon={Users}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Budget vs Executed */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Presupuesto vs Ejecutado</CardTitle>
            <CardDescription>Comparativo por tipo de venta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetVsExecuted} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                    className="text-xs"
                  />
                  <YAxis type="category" dataKey="tipo" className="text-xs" width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Legend />
                  <Bar dataKey="presupuesto" name="Presupuesto" fill="hsl(var(--muted-foreground))" />
                  <Bar dataKey="ejecutado" name="Ejecutado" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Ventas por tipo */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Distribución de Ventas</CardTitle>
            <CardDescription>Por tipo de venta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.ventasPorTipo).map(([tipo, valor]) => {
                const porcentaje =
                  metrics.totalVentas > 0 ? (valor / metrics.totalVentas) * 100 : 0;
                return (
                  <div key={tipo} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {tiposVentaLabels[tipo] || tipo}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(valor)} ({porcentaje.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${porcentaje}%`,
                          backgroundColor: tiposVentaColors[tipo] || 'hsl(var(--primary))',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ventas por tipo de asesor */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Ventas por Tipo de Asesor</CardTitle>
          <CardDescription>Comparativo entre asesores internos, externos y corretaje</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {['INTERNO', 'EXTERNO', 'CORRETAJE'].map((tipoAsesor) => {
              const valor = metrics.ventasPorTipoAsesor[tipoAsesor] || 0;
              const porcentaje = metrics.totalVentas > 0 ? (valor / metrics.totalVentas) * 100 : 0;
              return (
                <div key={tipoAsesor} className="space-y-3 p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: tiposAsesorColors[tipoAsesor] }}
                    />
                    <span className="text-lg font-semibold">
                      {tiposAsesorLabels[tipoAsesor]}
                    </span>
                  </div>
                  <div className="text-2xl font-bold">{formatCurrency(valor)}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${porcentaje}%`,
                          backgroundColor: tiposAsesorColors[tipoAsesor],
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">{porcentaje.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Incompliance Table - visible for leaders */}
      {(role === 'lider_zona' || role === 'jefe_ventas' || role === 'coordinador_comercial' || role === 'administrador') && (
        <Card className="card-elevated">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <CardTitle>Indicadores de Incumplimiento</CardTitle>
            </div>
            <CardDescription>
              Asesores con falta de evidencia, GPS o reportes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {incumplimientos.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Asesor
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                        <div className="flex items-center justify-center gap-1">
                          <Camera className="h-4 w-4" />
                          Sin Foto
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                        <div className="flex items-center justify-center gap-1">
                          <MapPin className="h-4 w-4" />
                          Sin GPS
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                        <div className="flex items-center justify-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          Sin Actividad
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                        Días Reportados
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {incumplimientos.map((asesor, index) => (
                      <tr
                        key={index}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-4 px-4 font-medium">{asesor.nombre}</td>
                        <td className="py-4 px-4 text-center">
                          {asesor.sinFoto > 0 ? (
                            <Badge variant="destructive">{asesor.sinFoto}</Badge>
                          ) : (
                            <Badge variant="secondary">0</Badge>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {asesor.sinGPS > 0 ? (
                            <Badge variant="destructive">{asesor.sinGPS}</Badge>
                          ) : (
                            <Badge variant="secondary">0</Badge>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {asesor.sinConsultas > 0 ? (
                            <Badge variant="destructive">{asesor.sinConsultas}</Badge>
                          ) : (
                            <Badge variant="secondary">0</Badge>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center text-muted-foreground">
                          {asesor.diasReportados}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay incumplimientos registrados</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
