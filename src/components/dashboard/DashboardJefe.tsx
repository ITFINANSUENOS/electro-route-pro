import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Target,
  AlertCircle,
  AlertTriangle,
  Hash,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { exportRankingToExcel, RankingAdvisor } from '@/utils/exportRankingExcel';
import { exportAdvisorsToExcel, AdvisorExportData } from '@/utils/exportAdvisorsExcel';
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
import { useMetaQuantityConfig } from '@/hooks/useMetaQuantityConfig';
import { calculateMetaQuantity } from '@/utils/calculateMetaQuantity';
import { ComplianceDetailPopup } from './ComplianceDetailPopup';
import { ConsultasDetailPopup } from './ConsultasDetailPopup';
import { AdvisorsAtRiskPopup } from './AdvisorsAtRiskPopup';
import { PeriodSelector } from './PeriodSelector';
import { usePeriodSelector } from '@/hooks/usePeriodSelector';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
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
  ALIADOS: 'hsl(var(--secondary))',
};

export default function DashboardJefe() {
  const { profile, role } = useAuth();
  const [selectedFilters, setSelectedFilters] = useState<TipoVentaKey[]>(['CONTADO', 'CREDICONTADO', 'CREDITO', 'ALIADOS']);
  const [compliancePopupOpen, setCompliancePopupOpen] = useState(false);
  const [consultasPopupOpen, setConsultasPopupOpen] = useState(false);
  const [consultasPopupMode, setConsultasPopupMode] = useState<'consultas' | 'solicitudes'>('consultas');
  const [atRiskPopupOpen, setAtRiskPopupOpen] = useState(false);
  
  // Activity compliance tracking
  const { advisorSummaries, overallStats: complianceStats, isLoading: loadingCompliance } = useActivityCompliance();

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
        .eq('anio', currentYear)
        .eq('tipo_meta_categoria', 'comercial'); // Jefes siempre ven meta comercial
      
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

  // Filter reportes_diarios by team - only include reports from team members
  const filteredReportesDiarios = useMemo(() => {
    if (!reportesData || !teamProfiles) return [];
    
    // Get user_ids that belong to the current team (same codigo_jefe)
    const teamUserIds = new Set<string>(
      teamProfiles.map(p => (p as any).user_id).filter(Boolean)
    );
    
    // Filter reports by users in the team scope
    return reportesData.filter(r => teamUserIds.has(r.user_id));
  }, [reportesData, teamProfiles]);

  // Consultas y solicitudes totales - using filtered data
  const totalConsultas = filteredReportesDiarios.reduce((sum, r) => sum + (r.consultas || 0), 0);
  const totalSolicitudes = filteredReportesDiarios.reduce((sum, r) => sum + (r.solicitudes || 0), 0);

  // Calculate consultas/solicitudes by advisor for popup detail
  const consultasByAdvisor = useMemo(() => {
    if (!teamProfiles) return [];
    
    const advisorMap = new Map<string, {
      userId: string;
      nombre: string;
      codigo: string;
      consultas: number;
      solicitudes: number;
    }>();

    filteredReportesDiarios.forEach((r) => {
      const profileMatch = teamProfiles.find((p) => (p as any).user_id === r.user_id);
      if (profileMatch) {
        const existing = advisorMap.get(r.user_id);
        if (existing) {
          existing.consultas += r.consultas || 0;
          existing.solicitudes += r.solicitudes || 0;
        } else {
          advisorMap.set(r.user_id, {
            userId: r.user_id,
            nombre: profileMatch.nombre_completo,
            codigo: profileMatch.codigo_asesor || '',
            consultas: r.consultas || 0,
            solicitudes: r.solicitudes || 0,
          });
        }
      }
    });

    return Array.from(advisorMap.values());
  }, [teamProfiles, filteredReportesDiarios]);

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

  // Fetch meta quantity config for calculating quantity goals
  const { data: metaQuantityConfig } = useMetaQuantityConfig();

  // Calculate total quantity meta for the team
  const { totalQuantityMeta, quantityCompliance } = useMemo(() => {
    if (!metasData || !metaQuantityConfig || !teamProfiles || !regionalId) {
      return { totalQuantityMeta: 0, quantityCompliance: 0 };
    }

    let total = 0;
    const teamCodes = new Set(teamAdvisorCodes);

    metasData
      .filter(m => teamCodes.has(m.codigo_asesor))
      .forEach(meta => {
        if (!meta.tipo_meta || meta.valor_meta <= 0) return;
        
        // Find the tipo_asesor for this advisor
        const profile = teamProfiles.find(p => p.codigo_asesor === meta.codigo_asesor);
        const tipoAsesor = profile?.tipo_asesor || 'EXTERNO';
        
        const result = calculateMetaQuantity(
          meta.valor_meta,
          tipoAsesor,
          meta.tipo_meta.toUpperCase(),
          regionalId,
          metaQuantityConfig
        );

        if (result) {
          total += result.cantidadFinal;
        }
      });

    const quantityComp = total > 0
      ? Math.round((salesCountData.totalSalesCount / total) * 100)
      : 0;

    return { totalQuantityMeta: total, quantityCompliance: quantityComp };
  }, [metasData, metaQuantityConfig, teamProfiles, teamAdvisorCodes, regionalId, salesCountData.totalSalesCount]);

  // Calculate budget vs executed for bar chart
  const budgetVsExecuted = useMemo(() => {
    if (!metasData || !salesData) return [];
    
    const tiposVenta = ['CONTADO', 'CREDICONTADO', 'CREDITO', 'ALIADOS'];
    const teamCodes = new Set(teamAdvisorCodes);
    
    return tiposVenta.map(tipo => {
      // Calculate budget from team's metas
      const presupuesto = metasData
        .filter(m => m.tipo_meta === tipo.toLowerCase())
        .filter(m => teamCodes.has(m.codigo_asesor))
        .reduce((sum, m) => sum + m.valor_meta, 0);
      
      // Calculate executed from sales
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
  }, [metasData, salesData, teamAdvisorCodes]);

  // Toggle filter for ranking
  const toggleFilter = (tipo: TipoVentaKey) => {
    setSelectedFilters(prev =>
      prev.includes(tipo)
        ? prev.filter(t => t !== tipo)
        : [...prev, tipo]
    );
  };

  // Filtered ranking based on selected types - use net values for accurate totals
  // CRITICAL: When filters are applied, calculate filteredTotal from selected types
  // but keep original byType intact - table will only show columns for selected filters
  const filteredRanking = useMemo(() => {
    // When no filters, return original data with filteredTotal = total
    if (selectedFilters.length === 0) {
      return metrics.byAdvisor.map(advisor => ({
        ...advisor,
        filteredTotal: advisor.total
      }));
    }
    
    // When filters are active, calculate filteredTotal from only selected types
    return metrics.byAdvisor
      .map(advisor => {
        const filteredTotal = selectedFilters.reduce((sum, tipo) => {
          return sum + (advisor.byType[tipo] || 0);
        }, 0);
        
        // Keep original byType - table component handles column display
        return { 
          ...advisor, 
          filteredTotal
        };
      })
      .sort((a, b) => b.filteredTotal - a.filteredTotal);
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

  // Calculate advisors at risk (not projecting to meet their goal)
  const advisorsAtRisk = useMemo(() => {
    const dayOfMonth = new Date().getDate();
    const daysInMonth = 31;
    const projectionFactor = daysInMonth / Math.max(dayOfMonth, 1);

    return metrics.byAdvisor
      .filter(a => {
        // Exclude GERENCIA entries
        const isGerencia = a.codigo === '01' || a.codigo === '00001' || 
          a.nombre?.toUpperCase().includes('GENERAL') || a.nombre?.toUpperCase().includes('GERENCIA');
        return !isGerencia && a.meta > 0;
      })
      .map(a => ({
        ...a,
        projected: a.total * projectionFactor,
        compliance: (a.total / a.meta) * 100,
        projectedCompliance: ((a.total * projectionFactor) / a.meta) * 100,
      }))
      .filter(a => a.projectedCompliance < 100)
      .sort((a, b) => a.compliance - b.compliance);
  }, [metrics.byAdvisor]);

  // Handle export for at-risk advisors
  const handleExportAtRisk = async () => {
    // Build metaByType from the metasData for each advisor
    const metasByAdvisor = new Map<string, Record<string, number>>();
    metasData?.forEach(m => {
      if (!metasByAdvisor.has(m.codigo_asesor)) {
        metasByAdvisor.set(m.codigo_asesor, {});
      }
      const tipoKey = (m.tipo_meta || '').toUpperCase();
      metasByAdvisor.get(m.codigo_asesor)![tipoKey] = m.valor_meta;
    });

    const dataForExport: AdvisorExportData[] = advisorsAtRisk.map(a => ({
      cedula: a.cedula || '',
      codigoAsesor: a.codigo,
      nombre: a.nombre,
      tipoAsesor: a.tipoAsesor || 'EXTERNO',
      byType: a.byType,
      metaByType: metasByAdvisor.get(a.codigo) || {},
    }));

    await exportAdvisorsToExcel({
      data: dataForExport,
      fileName: 'asesores_en_riesgo_equipo',
      title: 'Asesores en Riesgo - Mi Equipo',
      includeRegional: false,
    });
  };

  // Filter compliance summaries to only show team members
  const teamAdvisorSummaries = useMemo(() => {
    if (!teamProfiles || !advisorSummaries) return [];
    
    const teamUserIds = new Set<string>(
      teamProfiles.map(p => (p as any).user_id).filter(Boolean)
    );
    
    return advisorSummaries.filter(summary => teamUserIds.has(summary.user_id));
  }, [advisorSummaries, teamProfiles]);

  // Calculate team-specific compliance stats
  const teamComplianceStats = useMemo(() => {
    let totalActivities = 0;
    let missingEvidence = 0;
    
    teamAdvisorSummaries.forEach(summary => {
      totalActivities += summary.total_activities;
      missingEvidence += summary.issues.filter(i => 
        i.issue_type === 'missing_photo' || 
        i.issue_type === 'missing_evidence' ||
        i.issue_type === 'missing_gps'
      ).length;
    });
    
    const complianceRate = totalActivities > 0 
      ? Math.round(((totalActivities - missingEvidence) / totalActivities) * 100)
      : 100;
    
    return {
      missing_evidence: missingEvidence,
      compliance_rate: complianceRate,
      totalActivities,
    };
  }, [teamAdvisorSummaries]);

  // Calculate incompliance from useActivityCompliance (filtered by team)
  const incompliance = useMemo(() => {
    const counts = {
      sinFoto: 0,
      sinGPS: 0,
      sinConsultas: 0,
    };
    
    teamAdvisorSummaries.forEach(summary => {
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
  }, [teamAdvisorSummaries]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4 sm:space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            ¡Bienvenido, {profile?.nombre_completo?.split(' ')[0] || 'Usuario'}!
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {role && roleLabels[role]} • Equipo de {metrics.byAdvisor.length} asesores
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

      {/* KPI Cards - Row 1: Ventas */}
      <motion.div variants={item} className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ventas del Equipo"
          value={formatCurrency(metrics.total)}
          subtitle={`Meta: ${formatCurrency(metrics.totalMeta)}`}
          icon={ShoppingCart}
          status={compliance >= 80 ? 'success' : compliance >= 50 ? 'warning' : 'danger'}
          tooltipTitle="Desglose por tipo de venta"
          tooltipItems={metrics.byType.map(t => {
            const tipoMeta = metasData
              ?.filter(m => m.tipo_meta === t.key.toLowerCase())
              .filter(m => teamAdvisorCodes.includes(m.codigo_asesor))
              .reduce((sum, m) => sum + m.valor_meta, 0) || 0;
            const tipoCompliance = tipoMeta > 0 ? Math.round((t.value / tipoMeta) * 100) : 0;
            return {
              label: t.name,
              value: `${formatCurrency(t.value)} (${tipoCompliance}%)`,
              color: t.color,
            };
          })}
        />
        <KpiCard
          title="Q Ventas Mes"
          value={salesCountData.totalSalesCount.toString()}
          subtitle={`Meta: ${totalQuantityMeta} uds`}
          icon={Hash}
          status={quantityCompliance >= 80 ? 'success' : quantityCompliance >= 50 ? 'warning' : 'danger'}
          tooltipTitle="Cantidad por tipo de venta"
          tooltipItems={Object.entries(salesCountData.byType).map(([key, data]) => {
            const tipoMeta = metasData
              ?.filter(m => m.tipo_meta === key.toLowerCase())
              .filter(m => teamAdvisorCodes.includes(m.codigo_asesor))
              .reduce((sum, m) => sum + m.valor_meta, 0) || 0;
            const tipoCompliance = tipoMeta > 0 ? Math.round((data.value / tipoMeta) * 100) : 0;
            return {
              label: tiposVentaLabels[key] || key,
              value: `${data.count} ventas (${tipoCompliance}%)`,
              color: tiposVentaColors[key as TipoVentaKey] || 'hsl(var(--muted))',
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
          title="En Riesgo"
          value={advisorsAtRisk.length.toString()}
          subtitle="No proyectan cumplir"
          icon={AlertTriangle}
          status={advisorsAtRisk.length > 3 ? 'danger' : advisorsAtRisk.length > 0 ? 'warning' : 'success'}
          onClick={() => setAtRiskPopupOpen(true)}
          onDownload={handleExportAtRisk}
        />
      </motion.div>

      {/* KPI Cards - Row 2: Cumplimiento y actividad */}
      <motion.div variants={item} className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
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
              .filter(m => teamAdvisorCodes.includes(m.codigo_asesor))
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
          title="Consultas"
          value={totalConsultas.toString()}
          subtitle={`${consultasByAdvisor.filter(a => a.consultas > 0).length} asesores`}
          icon={MessageSquare}
          onClick={() => {
            setConsultasPopupMode('consultas');
            setConsultasPopupOpen(true);
          }}
        />
        <KpiCard
          title="Solicitudes"
          value={totalSolicitudes.toString()}
          subtitle={`${consultasByAdvisor.filter(a => a.solicitudes > 0).length} asesores`}
          icon={FileText}
          onClick={() => {
            setConsultasPopupMode('solicitudes');
            setConsultasPopupOpen(true);
          }}
        />
        <KpiCard
          title="Incumplimientos"
          value={teamComplianceStats.missing_evidence.toString()}
          subtitle={`${teamComplianceStats.compliance_rate}% cumplimiento evidencias`}
          icon={AlertCircle}
          status={teamComplianceStats.missing_evidence > 5 ? 'danger' : teamComplianceStats.missing_evidence > 0 ? 'warning' : 'success'}
          onClick={() => setCompliancePopupOpen(true)}
        />
      </motion.div>

      {/* Advisors at Risk Popup */}
      <AdvisorsAtRiskPopup
        open={atRiskPopupOpen}
        onOpenChange={setAtRiskPopupOpen}
        advisorsAtRisk={advisorsAtRisk}
        title="Asesores en Riesgo - Mi Equipo"
        showRegional={false}
        onDownload={handleExportAtRisk}
      />

      {/* Charts Row */}
      <motion.div variants={item} className="grid gap-6 lg:grid-cols-2">
        {/* Interactive Sales by Type Chart */}
        <InteractiveSalesChart
          salesByType={metrics.byType}
          salesData={salesData || []}
          formasPago={formasPago}
          salesCountByType={salesCountData.byType}
        />

        {/* Budget vs Executed */}
        <Card className="card-elevated">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
              Presupuesto vs Ejecutado
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Comparativo (en millones)</CardDescription>
          </CardHeader>
          <CardContent>
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
                  <Bar dataKey="ejecutado" name="Ejecutado" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
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

      {/* Compliance Detail Popup */}
      <ComplianceDetailPopup
        open={compliancePopupOpen}
        onOpenChange={setCompliancePopupOpen}
        advisorSummaries={teamAdvisorSummaries}
        month={new Date(2026, 0, 1)}
      />

      {/* Consultas/Solicitudes Detail Popup */}
      <ConsultasDetailPopup
        open={consultasPopupOpen}
        onOpenChange={setConsultasPopupOpen}
        advisorData={consultasByAdvisor}
        type={consultasPopupMode}
        title={consultasPopupMode === 'consultas' ? 'Detalle de Consultas' : 'Detalle de Solicitudes'}
        total={consultasPopupMode === 'consultas' ? totalConsultas : totalSolicitudes}
      />
    </motion.div>
  );
}
